import { NextRequest, NextResponse } from "next/server";

// In-memory rate limiting stores (IP -> { count, resetAt })
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function getClientIp(req: NextRequest): string {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();

  // Periodic cleanup of expired entries
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    lastCleanup = now;
    for (const [k, entry] of rateLimitMap.entries()) {
      if (now > entry.resetAt) {
        rateLimitMap.delete(k);
      }
    }
  }

  const existing = rateLimitMap.get(key);
  if (!existing || now > existing.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetInSec: Math.ceil(windowMs / 1000) };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetInSec: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetInSec: Math.ceil((existing.resetAt - now) / 1000),
  };
}

// Blocklist for malicious scanner user-agents
const MALICIOUS_USER_AGENTS = [
  "sqlmap",
  "nikto",
  "masscan",
  "nmap",
  "wpscan",
  "acunetix",
  "havij",
  "dirbuster",
  "gobuster",
  "zgrab",
  "censys",
  "project-discovery",
];

// Blocklist for path traversal / probe attacks
const BLOCKED_PATH_PATTERNS = [
  /\/\.env/i,
  /\/\.git/i,
  /\/\.svn/i,
  /\/\.DS_Store/i,
  /\/\.aws/i,
  /\/\.ssh/i,
  /\.\./,
  /%2e%2e/i,
  /\/wp-admin/i,
  /\/wp-login/i,
  /\/xmlrpc\.php/i,
  /\.php$/i,
  /\/cgi-bin/i,
  /\/etc\/passwd/i,
  /\/proc\/self/i,
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);
  const userAgent = (req.headers.get("user-agent") || "").toLowerCase();

  // 1. Block known vulnerability scanner user-agents
  if (MALICIOUS_USER_AGENTS.some((bot) => userAgent.includes(bot))) {
    return new NextResponse(JSON.stringify({ error: "Access denied" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Block path traversal and probe attempts
  if (BLOCKED_PATH_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return new NextResponse(JSON.stringify({ error: "Access denied" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Granular IP Rate Limiting on API endpoints
  if (pathname.startsWith("/api/")) {
    let limit = 120; // Default: 120 req / minute
    let windowMs = 60_000;
    let rateKey = `general:${ip}`;

    // Anti-Brute-Force: Privacy Access Key verification (5 attempts per 15 min)
    if (pathname === "/api/privacy/verify" && req.method === "POST") {
      limit = 5;
      windowMs = 15 * 60_000;
      rateKey = `privacy:${ip}`;
    }
    // Anti-Spam: OTP Send / Verify (5 requests per 10 min)
    else if (pathname === "/api/auth/otp") {
      limit = 5;
      windowMs = 10 * 60_000;
      rateKey = `otp:${ip}`;
    }
    // Anti-Spam: Password Reset (5 requests per 10 min)
    else if (pathname === "/api/auth/reset-password") {
      limit = 5;
      windowMs = 10 * 60_000;
      rateKey = `reset_pwd:${ip}`;
    }
    // Anti-Overload: User Sync (10 requests per minute)
    else if (pathname.includes("/sync")) {
      limit = 10;
      windowMs = 60_000;
      rateKey = `sync:${ip}`;
    }
    // Anti-Scraping / Token creation: (20 requests per minute)
    else if (pathname === "/api/accounts/token" || pathname === "/api/accounts/verify") {
      limit = 20;
      windowMs = 60_000;
      rateKey = `accounts:${ip}`;
    }

    const { allowed, remaining, resetInSec } = checkRateLimit(rateKey, limit, windowMs);

    if (!allowed) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "Too many requests. Please slow down.",
          retryAfter: resetInSec,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(resetInSec),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(resetInSec),
          },
        }
      );
    }
  }

  // 4. Set Comprehensive Security Headers on all responses
  const response = NextResponse.next();

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self)");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("X-DNS-Prefetch-Control", "on");

  // Force HTTPS via HSTS in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static assets and images:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Anti-brute-force tracker for privacy key: IP -> { attempts, lockedUntil }
const failureTracker = new Map<string, { attempts: number; lockedUntil: number }>();

function getClientIp(req: NextRequest): string {
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) return xForwardedFor.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const now = Date.now();

    // Check lockout
    const failureRecord = failureTracker.get(ip);
    if (failureRecord && now < failureRecord.lockedUntil) {
      const waitSec = Math.ceil((failureRecord.lockedUntil - now) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed attempts. Access locked for ${waitSec}s.`,
        },
        { status: 429 }
      );
    }

    const { password } = await req.json();

    const expectedSecret =
      process.env.ANALYTICS_PASSWORD ||
      process.env.PRIVACY_KEY ||
      process.env.ANALYTICS_SECRET ||
      "admin123"; // default fallback for local dev if not set

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Password / access key is required." },
        { status: 400 }
      );
    }

    // Constant-time comparison using SHA-256 hashes to prevent timing attacks
    const inputHash = crypto.createHash("sha256").update(password.trim()).digest();
    const expectedHash = crypto.createHash("sha256").update(expectedSecret.trim()).digest();
    const isMatch = crypto.timingSafeEqual(inputHash, expectedHash);

    if (!isMatch) {
      const attempts = (failureRecord ? failureRecord.attempts : 0) + 1;
      const lockedUntil = attempts >= 5 ? now + 15 * 60 * 1000 : 0;
      failureTracker.set(ip, { attempts, lockedUntil });

      const attemptsRemaining = Math.max(0, 5 - attempts);
      const errorMsg =
        attemptsRemaining > 0
          ? `Invalid access key. (${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining)`
          : "Invalid access key. Locked for 15 minutes due to repeated failures.";

      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: attempts >= 5 ? 429 : 401 }
      );
    }

    // Success: Clear failure record for this IP
    failureTracker.delete(ip);

    // Set secure HTTP-only cookie valid for 30 days
    const cookieStore = cookies();
    cookieStore.set("analytics_unlocked", "true", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({
      success: true,
      authenticated: true,
      message: "Analytics dashboard unlocked successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal server error verifying access key." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = cookies();
    const isUnlocked = cookieStore.get("analytics_unlocked")?.value === "true";

    return NextResponse.json({
      success: true,
      authenticated: Boolean(isUnlocked),
    });
  } catch {
    return NextResponse.json({ success: true, authenticated: false });
  }
}

export async function DELETE() {
  try {
    const cookieStore = cookies();
    cookieStore.delete("analytics_unlocked");

    return NextResponse.json({
      success: true,
      authenticated: false,
      message: "Analytics dashboard locked.",
    });
  } catch {
    return NextResponse.json({ success: true, authenticated: false });
  }
}

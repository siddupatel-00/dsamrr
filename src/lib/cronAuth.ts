import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export function requireCronAuthorization(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not configured");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization") || "";
  const expectedAuth = `Bearer ${secret}`;

  // Constant-time comparison using SHA-256 hashes to prevent timing attacks
  const authHash = crypto.createHash("sha256").update(authHeader).digest();
  const expectedHash = crypto.createHash("sha256").update(expectedAuth).digest();

  if (!crypto.timingSafeEqual(authHash, expectedHash)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

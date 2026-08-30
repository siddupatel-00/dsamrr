import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sendSignupOtpEmail } from "@/lib/mailer";
import { db } from "@/db";
import { initDb } from "@/db/init";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/crypto";

// In-memory OTP storage with 10-minute expiry
interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}
const otpStore = new Map<string, OtpEntry>();

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();
    const { action, email, otp, password } = body;

    const normalizedEmail = (email || "").toLowerCase().trim();
    if (!normalizedEmail) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    if (action === "send") {
      // Check if user already exists
      const [existing] = await db.select().from(users).where(eq(users.email, normalizedEmail));
      if (existing) {
        return NextResponse.json(
          { success: false, error: "Unable to send a signup code for this email." },
          { status: 409 }
        );
      }

      // Generate secure 6-digit random numeric code
      const previous = otpStore.get(normalizedEmail);
      if (previous && Date.now() - previous.lastSentAt < 60_000) {
        return NextResponse.json({ success: false, error: "Please wait before requesting another code." }, { status: 429 });
      }
      const otpCode = crypto.randomInt(100000, 1_000_000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(normalizedEmail, { code: otpCode, expiresAt, attempts: 0, lastSentAt: Date.now() });

      await sendSignupOtpEmail({
        toEmail: normalizedEmail,
        otpCode,
      });

      return NextResponse.json({
        success: true,
        message: "Verification code sent to your email.",
      });
    }

    if (action === "verify") {
      const entry = otpStore.get(normalizedEmail);
      if (!entry) {
        return NextResponse.json(
          { success: false, error: "No verification code found. Please request a new code." },
          { status: 400 }
        );
      }

      if (Date.now() > entry.expiresAt) {
        otpStore.delete(normalizedEmail);
        return NextResponse.json(
          { success: false, error: "Verification code has expired. Please request a new one." },
          { status: 400 }
        );
      }

      entry.attempts += 1;
      if (entry.attempts > 5) {
        otpStore.delete(normalizedEmail);
        return NextResponse.json({ success: false, error: "Too many incorrect attempts. Request a new code." }, { status: 429 });
      }
      if (entry.code !== String(otp || "").trim()) {
        return NextResponse.json(
          { success: false, error: "Incorrect verification code. Please check and try again." },
          { status: 400 }
        );
      }

      // Valid OTP: clear it
      otpStore.delete(normalizedEmail);

      // Create new user with scrypt hashed password in Turso
      let [existingUser] = await db.select().from(users).where(eq(users.email, normalizedEmail));
      if (!existingUser) {
        const baseUsername = normalizedEmail.split("@")[0].replace(/[^a-z0-9]/g, "");
        const uniqueSuffix = crypto.randomBytes(2).toString("hex");
        const username = baseUsername || `user_${uniqueSuffix}`;
        const newUserId = `user_${crypto.randomUUID()}`;

        if (typeof password !== "string" || password.length < 12) {
          return NextResponse.json({ success: false, error: "Password must be at least 12 characters long." }, { status: 400 });
        }
        const passwordHash = hashPassword(password);

        await db.insert(users).values({
          id: newUserId,
          username,
          email: normalizedEmail,
          passwordHash,
          name: baseUsername || "Programmer",
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
        });

        [existingUser] = await db.select().from(users).where(eq(users.id, newUserId));
      }

      return NextResponse.json({
        success: true,
        message: "Email verified successfully.",
        user: existingUser && { id: existingUser.id, username: existingUser.username, email: existingUser.email },
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("OTP API error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

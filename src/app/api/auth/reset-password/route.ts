import { NextRequest, NextResponse } from "next/server";
import { sendSignupOtpEmail } from "@/lib/mailer";
import { db } from "@/db";
import { initDb } from "@/db/init";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/crypto";
import crypto from "crypto";

// Temporary reset tokens / OTP store
interface ResetEntry {
  otp: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}
const resetStore = new Map<string, ResetEntry>();

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();
    const { action, email, otp, newPassword } = body;

    const normalizedEmail = (email || "").toLowerCase().trim();
    if (!normalizedEmail) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    if (action === "send_reset_otp") {
      const [existing] = await db.select().from(users).where(eq(users.email, normalizedEmail));
      if (!existing) {
        return NextResponse.json(
          { success: true, message: "If an account exists, a reset code will be sent." }
        );
      }

      const previous = resetStore.get(normalizedEmail);
      if (previous && Date.now() - previous.lastSentAt < 60_000) {
        return NextResponse.json({ success: false, error: "Please wait before requesting another code." }, { status: 429 });
      }
      const resetOtp = crypto.randomInt(100000, 1_000_000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      resetStore.set(normalizedEmail, { otp: resetOtp, expiresAt, attempts: 0, lastSentAt: Date.now() });

      await sendSignupOtpEmail({
        toEmail: normalizedEmail,
        otpCode: resetOtp,
      });

      return NextResponse.json({
        success: true,
        message: "Password reset verification code sent to your email.",
      });
    }

    if (action === "confirm_reset") {
      const entry = resetStore.get(normalizedEmail);
      if (!entry) {
        return NextResponse.json(
          { success: false, error: "No reset code requested or expired." },
          { status: 400 }
        );
      }

      if (Date.now() > entry.expiresAt) {
        resetStore.delete(normalizedEmail);
        return NextResponse.json(
          { success: false, error: "Reset code has expired. Please request a new one." },
          { status: 400 }
        );
      }

      entry.attempts += 1;
      if (entry.attempts > 5) {
        resetStore.delete(normalizedEmail);
        return NextResponse.json({ success: false, error: "Too many incorrect attempts. Request a new code." }, { status: 429 });
      }
      if (entry.otp !== String(otp || "").trim()) {
        return NextResponse.json(
          { success: false, error: "Incorrect verification code." },
          { status: 400 }
        );
      }

      if (!newPassword || newPassword.length < 12) {
        return NextResponse.json(
          { success: false, error: "New password must be at least 12 characters long." },
          { status: 400 }
        );
      }

      resetStore.delete(normalizedEmail);

      // Update password hash with scrypt in Turso DB
      const passwordHash = hashPassword(newPassword);
      await db
        .update(users)
        .set({
          passwordHash,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.email, normalizedEmail));

      return NextResponse.json({
        success: true,
        message: "Password updated successfully. You can now sign in.",
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Reset password error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { sendSignupOtpEmail } from "@/lib/mailer";
import { db, client } from "@/db";
import { initDb } from "@/db/init";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/crypto";
import crypto from "crypto";

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

      const existingOtpRes = await client.execute({
        sql: `SELECT * FROM verification_otps WHERE email = ?`,
        args: [normalizedEmail],
      });
      const previous = existingOtpRes.rows[0];
      if (previous && Date.now() - Number(previous.last_sent_at) < 30_000) {
        return NextResponse.json(
          { success: false, error: "Please wait 30 seconds before requesting another code." },
          { status: 429 }
        );
      }

      const resetOtp = crypto.randomInt(100000, 1_000_000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      await client.execute({
        sql: `
          INSERT INTO verification_otps (email, otp_code, expires_at, attempts, last_sent_at)
          VALUES (?, ?, ?, 0, ?)
          ON CONFLICT(email) DO UPDATE SET
            otp_code = excluded.otp_code,
            expires_at = excluded.expires_at,
            attempts = 0,
            last_sent_at = excluded.last_sent_at
        `,
        args: [normalizedEmail, resetOtp, expiresAt, Date.now()],
      });

      const sendResult = await sendSignupOtpEmail({
        toEmail: normalizedEmail,
        otpCode: resetOtp,
      });

      if (!sendResult.success) {
        return NextResponse.json(
          { success: false, error: "Failed to send reset code. Please check SMTP configuration." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Password reset verification code sent to your email.",
      });
    }

    if (action === "confirm_reset") {
      const res = await client.execute({
        sql: `SELECT * FROM verification_otps WHERE email = ?`,
        args: [normalizedEmail],
      });
      const entry = res.rows[0];

      if (!entry) {
        return NextResponse.json(
          { success: false, error: "No reset code requested or expired." },
          { status: 400 }
        );
      }

      if (Date.now() > Number(entry.expires_at)) {
        await client.execute({
          sql: `DELETE FROM verification_otps WHERE email = ?`,
          args: [normalizedEmail],
        });
        return NextResponse.json(
          { success: false, error: "Reset code has expired. Please request a new one." },
          { status: 400 }
        );
      }

      const currentAttempts = Number(entry.attempts || 0) + 1;
      if (currentAttempts > 5) {
        await client.execute({
          sql: `DELETE FROM verification_otps WHERE email = ?`,
          args: [normalizedEmail],
        });
        return NextResponse.json(
          { success: false, error: "Too many incorrect attempts. Request a new code." },
          { status: 429 }
        );
      }

      await client.execute({
        sql: `UPDATE verification_otps SET attempts = ? WHERE email = ?`,
        args: [currentAttempts, normalizedEmail],
      });

      if (String(entry.otp_code).trim() !== String(otp || "").trim()) {
        return NextResponse.json(
          { success: false, error: "Incorrect verification code." },
          { status: 400 }
        );
      }

      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      await client.execute({
        sql: `DELETE FROM verification_otps WHERE email = ?`,
        args: [normalizedEmail],
      });

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

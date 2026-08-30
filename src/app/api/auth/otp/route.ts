import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sendSignupOtpEmail } from "@/lib/mailer";
import { db, client } from "@/db";
import { initDb } from "@/db/init";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/crypto";

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
          { success: false, error: "An account with this email already exists. Please sign in." },
          { status: 409 }
        );
      }

      // Check rate limit in DB
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

      const otpCode = crypto.randomInt(100000, 1_000_000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store in Turso DB (guaranteed to persist across all serverless instances)
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
        args: [normalizedEmail, otpCode, expiresAt, Date.now()],
      });

      const sendResult = await sendSignupOtpEmail({
        toEmail: normalizedEmail,
        otpCode,
      });

      if (!sendResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: sendResult.error || "Failed to deliver verification code. Please check SMTP settings.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Verification code sent to your email.",
      });
    }

    if (action === "verify") {
      // Query from DB
      const res = await client.execute({
        sql: `SELECT * FROM verification_otps WHERE email = ?`,
        args: [normalizedEmail],
      });
      const entry = res.rows[0];

      if (!entry) {
        return NextResponse.json(
          { success: false, error: "No verification code found. Please request a new code." },
          { status: 400 }
        );
      }

      if (Date.now() > Number(entry.expires_at)) {
        await client.execute({
          sql: `DELETE FROM verification_otps WHERE email = ?`,
          args: [normalizedEmail],
        });
        return NextResponse.json(
          { success: false, error: "Verification code has expired. Please request a new one." },
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
          { success: false, error: "Too many incorrect attempts. Please request a new code." },
          { status: 429 }
        );
      }

      // Update attempt count
      await client.execute({
        sql: `UPDATE verification_otps SET attempts = ? WHERE email = ?`,
        args: [currentAttempts, normalizedEmail],
      });

      if (String(entry.otp_code).trim() !== String(otp || "").trim()) {
        return NextResponse.json(
          { success: false, error: "Incorrect verification code. Please check and try again." },
          { status: 400 }
        );
      }

      // Valid OTP: delete it from DB
      await client.execute({
        sql: `DELETE FROM verification_otps WHERE email = ?`,
        args: [normalizedEmail],
      });

      // Create new user with scrypt hashed password in Turso
      let [existingUser] = await db.select().from(users).where(eq(users.email, normalizedEmail));
      if (!existingUser) {
        const baseUsername = normalizedEmail.split("@")[0].replace(/[^a-z0-9]/g, "");
        const uniqueSuffix = crypto.randomBytes(2).toString("hex");
        const username = baseUsername || `user_${uniqueSuffix}`;
        const newUserId = `user_${crypto.randomUUID()}`;

        if (!password || typeof password !== "string" || password.length < 6) {
          return NextResponse.json({ success: false, error: "Password must be at least 6 characters long." }, { status: 400 });
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

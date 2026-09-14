import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import { initDb } from "@/db/init";
import { db, client } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchGitHubStats } from "@/lib/platforms/github";
import { invalidateLeaderboardCache } from "@/lib/engine/scoring";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;

    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      duration = 15,
      githubHandle,
      couponCode,
    } = body;

    const cleanCoupon = (couponCode || "").trim().toUpperCase();

    if (cleanCoupon === "FIRST3") {
      const redemptions = await client.execute(`SELECT COUNT(*) as count FROM coupon_redemptions WHERE code = 'FIRST3'`);
      const used = Number(redemptions.rows[0]?.count || 0);
      if (used >= 3) {
        return NextResponse.json(
          { success: false, error: "Coupon FIRST3 has reached its maximum limit (3/3 used)." },
          { status: 400 }
        );
      }

      await client.execute({
        sql: `INSERT INTO coupon_redemptions (id, code, slot_id, advertiser_email) VALUES (?, ?, ?, ?)`,
        args: [
          crypto.randomUUID(),
          "FIRST3",
          `pro-user-${sessionUser.id}`,
          sessionUser.email || sessionUser.username || null,
        ],
      });
    } else {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      const isMock =
        !keySecret ||
        keySecret === "mock_secret" ||
        String(razorpay_order_id).startsWith("order_mock") ||
        String(razorpay_order_id).startsWith("order_");

      if (!isMock && keySecret) {
        const generatedSignature = crypto
          .createHmac("sha256", keySecret)
          .update(`${razorpay_order_id}|${razorpay_payment_id}`)
          .digest("hex");

        if (generatedSignature !== razorpay_signature) {
          return NextResponse.json({ success: false, error: "Invalid payment signature" }, { status: 400 });
        }
      }

      if (cleanCoupon === "CLAUDE10") {
        await client.execute({
          sql: `INSERT INTO coupon_redemptions (id, code, slot_id, advertiser_email) VALUES (?, ?, ?, ?)`,
          args: [
            crypto.randomUUID(),
            "CLAUDE10",
            `pro-user-${sessionUser.id}`,
            sessionUser.email || sessionUser.username || null,
          ],
        });
      }
    }

    // Calculate pro expiration date
    const durationDays = duration === 30 ? 30 : 15;
    const today = new Date();
    const expires = new Date(today);
    expires.setDate(expires.getDate() + durationDays);
    const proExpiresAt = expires.toISOString().split("T")[0];

    // Fetch GitHub stats if handle provided
    let githubStatsJson: string | null = null;
    const cleanGithub = (githubHandle || sessionUser.githubHandle || "").trim().replace(/^@/, "");
    if (cleanGithub) {
      const stats = await fetchGitHubStats(cleanGithub);
      if (stats) {
        githubStatsJson = JSON.stringify(stats);
      }
    }

    // Update user in database
    await client.execute({
      sql: `UPDATE users SET 
        is_pro = 1, 
        pro_expires_at = ?, 
        github_handle = COALESCE(?, github_handle),
        github_stats = COALESCE(?, github_stats),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      args: [proExpiresAt, cleanGithub || null, githubStatsJson, sessionUser.id],
    });

    invalidateLeaderboardCache();

    return NextResponse.json({
      success: true,
      message: `Upgraded to DSAMRR Pro for ${durationDays} days!`,
      proExpiresAt,
    });
  } catch (err: any) {
    console.error("Pro payment verification error:", err);
    return NextResponse.json({ success: false, error: err.message || "Payment verification failed" }, { status: 500 });
  }
}

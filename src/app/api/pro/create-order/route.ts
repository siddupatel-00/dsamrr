import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Razorpay from "razorpay";
import crypto from "crypto";
import { initDb } from "@/db/init";
import { client } from "@/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;

    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Please log in to upgrade to DSAMRR Pro" }, { status: 401 });
    }

    const body = await req.json();
    const { durationDays = 15, couponCode } = body;

    // Pricing: ₹1 for 15 days, ₹2 for 30 days
    const duration = durationDays === 30 ? 30 : 15;
    let amountPaise = duration === 30 ? 200 : 100;

    const cleanCoupon = (couponCode || "").trim().toUpperCase();
    if (cleanCoupon === "CLAUDE10") {
      const redemptions = await client.execute(`SELECT COUNT(*) as count FROM coupon_redemptions WHERE code = 'CLAUDE10' AND slot_id LIKE 'pro-%'`);
      const used = Number(redemptions.rows[0]?.count || 0);
      if (used < 10) {
        amountPaise = 100; // 15d or 30d for ₹1
      }
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || keyId === "rzp_test_placeholder_key") {
      const mockOrderId = `order_${crypto.randomBytes(8).toString("hex")}`;
      return NextResponse.json({
        success: true,
        order: {
          id: mockOrderId,
          amount: amountPaise,
          currency: "INR",
          receipt: `pro_${duration}d`,
          status: "created",
        },
        durationDays: duration,
        amountInRupees: amountPaise / 100,
        isDevFallback: true,
      });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const options = {
      amount: amountPaise,
      currency: "INR",
      receipt: `pro_${sessionUser.id?.slice(0, 15)}_${duration}d`,
      notes: {
        userId: sessionUser.id,
        username: sessionUser.username || sessionUser.name,
        plan: `DSAMRR Pro Developer (${duration} Days)`,
      },
    };

    const order = await razorpay.orders.create(options);
    await client.execute({
      sql: `INSERT INTO payment_orders (order_id, slot_id, duration_days, amount_paise, is_prebook) VALUES (?, ?, ?, ?, ?)`,
      args: [order.id, `pro-user-${sessionUser.id}`, duration, amountPaise, 0],
    });

    return NextResponse.json({
      success: true,
      order,
      keyId,
      durationDays: duration,
      amountInRupees: amountPaise / 100,
    });
  } catch (err: any) {
    console.error("Pro order creation error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to create order" }, { status: 500 });
  }
}

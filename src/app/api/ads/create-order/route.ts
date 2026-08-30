import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db, client } from "@/db";
import { initDb } from "@/db/init";
import { ads } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { STANDARD_AD_SLOTS } from "@/lib/adsData";
import { getCurrentUser } from "@/lib/requestAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Please sign in to your account to book an advertisement." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { slotId, duration, targetUrl, imageUrl, name, tagline, isPrebook, couponCode } = body;

    // 1. Strict Server-Side Pricing Enforcement
    const durationDays = Number(duration) === 15 ? 15 : 30;
    const cleanCoupon = (couponCode || "").trim().toUpperCase();
    let amountPaise = durationDays === 15 ? 2000 : 3500; // Default ₹20 or ₹35

    if (cleanCoupon === "CLAUDE10") {
      const redemptions = await client.execute(`SELECT COUNT(*) as count FROM coupon_redemptions WHERE code = 'CLAUDE10'`);
      const used = Number(redemptions.rows[0]?.count || 0);
      if (used >= 7) {
        return NextResponse.json(
          { success: false, error: "Coupon CLAUDE10 has reached its maximum limit (7/7 used)." },
          { status: 400 }
        );
      }
      amountPaise = durationDays === 15 ? 700 : 1700; // ₹7 (15d) or ₹17 (30d)
    }

    if (!slotId || !name || !targetUrl) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: slotId, name, targetUrl" },
        { status: 400 }
      );
    }
    const normalizedSlotId = String(slotId).trim();
    if (!STANDARD_AD_SLOTS.some((slot) => slot.id === normalizedSlotId)) {
      return NextResponse.json({ success: false, error: "Invalid advertising slot" }, { status: 400 });
    }
    try {
      const url = new URL(String(targetUrl).trim().startsWith("http") ? String(targetUrl).trim() : `https://${String(targetUrl).trim()}`);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    } catch {
      return NextResponse.json({ success: false, error: "A valid HTTP(S) target URL is required" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    const existingSlotAds = await db
      .select()
      .from(ads)
      .where(and(eq(ads.slotId, normalizedSlotId), gte(ads.expiresAt, today)));

    const activeAd = existingSlotAds.find((a) => a.startedAt <= today);
    const prebookedAd = existingSlotAds.find((a) => a.startedAt > today);

    if (isPrebook) {
      if (prebookedAd) {
        return NextResponse.json(
          {
            success: false,
            error: `Slot "${slotId}" is already pre-booked until ${prebookedAd.expiresAt}. No further pre-bookings allowed.`,
          },
          { status: 409 }
        );
      }
      if (!activeAd) {
        return NextResponse.json({ success: false, error: "Pre-booking is only available while a slot is active." }, { status: 409 });
      }
    } else {
      if (activeAd || prebookedAd) {
        return NextResponse.json(
          {
            success: false,
            error: `Slot "${normalizedSlotId}" is unavailable.`,
          },
          { status: 409 }
        );
      }
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // In local dev/fallback mode without real API keys
    if (!keyId || !keySecret || keyId === "rzp_test_placeholder_key") {
      const mockOrderId = `order_${crypto.randomBytes(8).toString("hex")}`;
      return NextResponse.json({
        success: true,
        order: {
          id: mockOrderId,
          amount: amountPaise,
          currency: "INR",
          receipt: normalizedSlotId.slice(0, 40),
          status: "created",
        },
        durationDays,
        amountInRupees: durationDays === 15 ? 20 : 35,
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
      receipt: normalizedSlotId.slice(0, 40),
      notes: {
        slotId: normalizedSlotId,
        duration: String(durationDays),
        name: String(name).slice(0, 50),
        targetUrl: String(targetUrl).slice(0, 100),
      },
    };

    const order = await razorpay.orders.create(options);
    await client.execute({
      sql: `INSERT INTO payment_orders (order_id, slot_id, duration_days, amount_paise, is_prebook) VALUES (?, ?, ?, ?, ?)`,
      args: [order.id, normalizedSlotId, durationDays, amountPaise, isPrebook ? 1 : 0],
    });

    return NextResponse.json({
      success: true,
      order,
      keyId,
      durationDays,
      amountInRupees: durationDays === 15 ? 20 : 35,
    });
  } catch (err: any) {
    console.error("Razorpay order creation error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create Razorpay order" },
      { status: 500 }
    );
  }
}

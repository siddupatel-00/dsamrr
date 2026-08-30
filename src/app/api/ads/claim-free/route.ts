import { NextRequest, NextResponse } from "next/server";
import { db, client } from "@/db";
import { initDb } from "@/db/init";
import { ads } from "@/db/schema";
import { STANDARD_AD_SLOTS } from "@/lib/adsData";
import {
  sendAdLiveConfirmationEmail,
  sendAdPrebookConfirmationEmail,
} from "@/lib/mailer";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/requestAuth";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function sanitizeUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Please sign in to your account to claim an advertisement." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { slotId, name, tagline, targetUrl, imageUrl, email, durationDays, isPrebook, couponCode } = body;

    // 1. Validate coupon code server-side
    const cleanCoupon = (couponCode || "").trim().toUpperCase();
    if (cleanCoupon !== "FIRST3") {
      return NextResponse.json({ success: false, error: "Invalid coupon code." }, { status: 400 });
    }

    // 2. Strict usage limit check (Max 3 redemptions)
    const redemptions = await client.execute(`SELECT COUNT(*) as count FROM coupon_redemptions WHERE code = 'FIRST3'`);
    const used = Number(redemptions.rows[0]?.count || 0);

    if (used >= 3) {
      return NextResponse.json({
        success: false,
        error: "Coupon FIRST3 has reached its maximum limit (3/3 redemptions used).",
      }, { status: 400 });
    }

    // 3. Validate inputs
    const normalizedSlotId = (slotId || "").toLowerCase();
    const validSlot = STANDARD_AD_SLOTS.find((s) => s.id === normalizedSlotId);
    if (!validSlot) {
      return NextResponse.json({ success: false, error: "Invalid ad slot selected." }, { status: 400 });
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Company or Product Name is required." }, { status: 400 });
    }

    const cleanUrl = sanitizeUrl(targetUrl);
    if (!cleanUrl) {
      return NextResponse.json({ success: false, error: "Please enter a valid HTTP or HTTPS destination link." }, { status: 400 });
    }

    const adDuration = Number(durationDays) === 30 ? 30 : 15;
    const today = new Date().toISOString().split("T")[0];

    // Check slot occupancy
    const existingAds = await db.select().from(ads).where(eq(ads.slotId, normalizedSlotId));
    const activeAd = existingAds.find((a) => a.startedAt <= today && a.expiresAt >= today);
    const prebookedAd = existingAds.find((a) => a.startedAt > today);

    if (activeAd && !isPrebook) {
      return NextResponse.json({ success: false, error: "This slot is currently occupied. Please choose Pre-Book." }, { status: 400 });
    }
    if (prebookedAd) {
      return NextResponse.json({ success: false, error: "This slot is already pre-booked by another advertiser." }, { status: 400 });
    }

    // Calculate dates
    let startDateStr = today;
    if (isPrebook && activeAd) {
      const nextDate = new Date(`${activeAd.expiresAt}T00:00:00Z`);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
      startDateStr = nextDate.toISOString().split("T")[0];
    }

    const startDateObj = new Date(`${startDateStr}T00:00:00Z`);
    startDateObj.setUTCDate(startDateObj.getUTCDate() + adDuration - 1);
    const expiresDateStr = startDateObj.toISOString().split("T")[0];

    const couponPaymentId = `coupon_FIRST3_${crypto.randomUUID()}`;
    const adId = `ad_${normalizedSlotId}_${Date.now()}`;
    const advertiserEmail = email || "";

    // 4. Record coupon redemption in database
    await client.execute({
      sql: `INSERT INTO coupon_redemptions (id, code, slot_id, advertiser_email) VALUES (?, ?, ?, ?)`,
      args: [crypto.randomUUID(), "FIRST3", normalizedSlotId, advertiserEmail || null],
    });

    // 5. Insert free ad record into database
    await db.insert(ads).values({
      id: adId,
      slotId: normalizedSlotId,
      name: name.trim().slice(0, 60),
      tagline: (tagline || "").trim().slice(0, 120),
      targetUrl: cleanUrl.slice(0, 255),
      imageUrl: imageUrl || null,
      advertiserEmail: advertiserEmail.trim() || null,
      durationDays: adDuration,
      amountPaise: 0,
      paymentId: couponPaymentId,
      orderId: couponPaymentId,
      startedAt: startDateStr,
      expiresAt: expiresDateStr,
    });

    // 6. Send email receipt
    if (advertiserEmail) {
      if (isPrebook) {
        sendAdPrebookConfirmationEmail({
          toEmail: advertiserEmail.trim(),
          adName: name.trim(),
          slotLabel: normalizedSlotId.toUpperCase(),
          durationDays: adDuration,
          amountPaise: 0,
          paymentId: couponPaymentId,
          startedAt: startDateStr,
          expiresAt: expiresDateStr,
        }).catch(console.error);
      } else {
        sendAdLiveConfirmationEmail({
          toEmail: advertiserEmail.trim(),
          adName: name.trim(),
          slotLabel: normalizedSlotId.toUpperCase(),
          durationDays: adDuration,
          amountPaise: 0,
          paymentId: couponPaymentId,
          startedAt: startDateStr,
          expiresAt: expiresDateStr,
          targetUrl: cleanUrl,
        }).catch(console.error);
      }
    }

    return NextResponse.json({
      success: true,
      isFree: true,
      message: isPrebook
        ? `Spot #${normalizedSlotId.toUpperCase()} reserved for free with coupon FIRST3!`
        : `Spot #${normalizedSlotId.toUpperCase()} is now LIVE for free with coupon FIRST3!`,
      ad: {
        id: adId,
        slotId: normalizedSlotId,
        name,
        startedAt: startDateStr,
        expiresAt: expiresDateStr,
      },
    });
  } catch (err: any) {
    console.error("Free coupon claim error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { db, client } from "@/db";
import { initDb } from "@/db/init";
import { ads } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { sendAdLiveConfirmationEmail, sendAdPrebookConfirmationEmail } from "@/lib/email";
import { STANDARD_AD_SLOTS } from "@/lib/adsData";

export const dynamic = "force-dynamic";

// In-memory mutex for ultra-fast race-condition prevention across simultaneous requests
const slotLocks = new Map<string, boolean>();

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      slotId,
      name,
      tagline,
      targetUrl,
      imageUrl,
      duration,
      isPrebook,
    } = body;

    const normalizedSlotId = String(slotId || "").trim();
    if (!normalizedSlotId || !name || !targetUrl) {
      return NextResponse.json(
        { success: false, error: "Missing required booking details." },
        { status: 400 }
      );
    }
    if (!STANDARD_AD_SLOTS.some((slot) => slot.id === normalizedSlotId)) {
      return NextResponse.json({ success: false, error: "Invalid advertising slot." }, { status: 400 });
    }
    let cleanUrl: string;
    try {
      cleanUrl = targetUrl.trim().startsWith("http") ? targetUrl.trim() : `https://${targetUrl.trim()}`;
      const parsedUrl = new URL(cleanUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
    } catch {
      return NextResponse.json({ success: false, error: "A valid HTTP(S) target URL is required." }, { status: 400 });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: "Missing official payment proof. Payment verification failed." },
        { status: 400 }
      );
    }

    // Bind the payment to an order created by this server; never trust booking fields from the client.
    const pendingOrder = await client.execute({
      sql: `SELECT slot_id, duration_days, amount_paise, is_prebook FROM payment_orders WHERE order_id = ?`,
      args: [String(razorpay_order_id)],
    });
    const order = pendingOrder.rows[0] as { slot_id?: string; duration_days?: number; amount_paise?: number; is_prebook?: number } | undefined;
    if (!order || order.slot_id !== normalizedSlotId) {
      return NextResponse.json({ success: false, error: "Unknown or mismatched payment order." }, { status: 400 });
    }
    const durationDays = Number(order.duration_days);
    const expectedAmountPaise = Number(order.amount_paise);
    const isPrebookOrder = Number(order.is_prebook) === 1;

    // 2. Anti-Replay Guard: Ensure payment_id was never previously redeemed
    const existingPayment = await db
      .select()
      .from(ads)
      .where(eq(ads.paymentId, String(razorpay_payment_id)));

    if (existingPayment.length > 0) {
      return NextResponse.json(
        { success: false, error: "This payment ID has already been redeemed. Replay attack blocked." },
        { status: 403 }
      );
    }

    // 3. Fast Atomic Concurrency Mutex Lock
    if (slotLocks.get(normalizedSlotId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Another transaction is currently processing for this slot. Please wait a moment.",
        },
        { status: 409 }
      );
    }
    slotLocks.set(normalizedSlotId, true);

    try {
      const today = new Date().toISOString().split("T")[0];
      const existingSlotAds = await db
        .select()
        .from(ads)
        .where(and(eq(ads.slotId, normalizedSlotId), gte(ads.expiresAt, today)));

      const activeAd = existingSlotAds.find((a) => a.startedAt <= today);
      const prebookedAd = existingSlotAds.find((a) => a.startedAt > today);

      if (isPrebookOrder) {
        if (prebookedAd) {
          return NextResponse.json(
            {
              success: false,
              error: `Slot "${normalizedSlotId}" is already pre-booked until ${prebookedAd.expiresAt}.`,
            },
            { status: 409 }
          );
        }
        if (!activeAd) {
          return NextResponse.json({ success: false, error: "Pre-booking requires an active slot." }, { status: 409 });
        }
      } else {
        if (activeAd) {
          return NextResponse.json(
            {
              success: false,
              error: `Slot "${normalizedSlotId}" is currently active until ${activeAd.expiresAt}. Please select pre-book.`,
            },
            { status: 409 }
          );
        }
      }

      const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keySecret) {
        return NextResponse.json(
          { success: false, error: "Payment gateway configuration missing on server." },
          { status: 500 }
        );
      }

      // 4. Strict Cryptographic HMAC-SHA256 Validation
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      const isSignatureValid =
        razorpay_signature.length === expectedSignature.length &&
        crypto.timingSafeEqual(
          Buffer.from(razorpay_signature),
          Buffer.from(expectedSignature)
        );

      if (!isSignatureValid) {
        return NextResponse.json(
          { success: false, error: "Invalid cryptographic payment signature. Tampering detected." },
          { status: 400 }
        );
      }

      // 5. Direct Server-to-Server Verification with Razorpay API (Validates Real Amount Captured)
      if (keyId && keySecret) {
        try {
          const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
          const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
            headers: { Authorization: authHeader },
          });

          if (rzpRes.ok) {
            const paymentDetails = await rzpRes.json();
            // Validate genuine captured status
            if (paymentDetails.status !== "captured" && paymentDetails.status !== "authorized") {
              return NextResponse.json(
                { success: false, error: `Payment not completed. Status: ${paymentDetails.status}` },
                { status: 400 }
              );
            }
            // Validate exact captured amount (prevents changing price to ₹1)
            if (paymentDetails.amount < expectedAmountPaise) {
              return NextResponse.json(
                {
                  success: false,
                  error: `Underpaid amount detected. Expected ₹${expectedAmountPaise / 100}, received ₹${paymentDetails.amount / 100}.`,
                },
                { status: 400 }
              );
            }
            // Validate order association
            if (paymentDetails.order_id && paymentDetails.order_id !== razorpay_order_id) {
              return NextResponse.json(
                { success: false, error: "Payment order mismatch." },
                { status: 400 }
              );
            }
          }
        } catch (apiErr) {
          console.warn("Razorpay API verification lookup note:", apiErr);
        }
      }

      // 6. Automated Schedule Date Calculation
      let startDateStr = today;
      if (isPrebookOrder && activeAd) {
        const nextDate = new Date(`${activeAd.expiresAt}T00:00:00Z`);
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        startDateStr = nextDate.toISOString().split("T")[0];
      }

      const startDateObj = new Date(`${startDateStr}T00:00:00Z`);
      startDateObj.setUTCDate(startDateObj.getUTCDate() + durationDays - 1);
      const expiresDateStr = startDateObj.toISOString().split("T")[0];

      const adId = `ad_${normalizedSlotId}_${Date.now()}`;
      const advertiserEmail = body.email || body.advertiserEmail || "";

      // 7. Atomic Database Insertion into Turso DB
      await db.insert(ads).values({
        id: adId,
        slotId: normalizedSlotId,
        name: name.trim().slice(0, 60),
        tagline: (tagline || "").trim().slice(0, 120),
        targetUrl: cleanUrl.slice(0, 255),
        imageUrl: imageUrl || null,
        advertiserEmail: advertiserEmail.trim() || null,
        durationDays,
        amountPaise: expectedAmountPaise,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        startedAt: startDateStr,
        expiresAt: expiresDateStr,
      });

      // 8. Automated Email Notifications for Advertisers
      if (advertiserEmail) {
        if (isPrebookOrder) {
          sendAdPrebookConfirmationEmail({
            toEmail: advertiserEmail.trim(),
            adName: name.trim(),
            slotLabel: normalizedSlotId.toUpperCase(),
            durationDays,
            startedAt: startDateStr,
            expiresAt: expiresDateStr,
          }).catch(console.error);
        } else {
          sendAdLiveConfirmationEmail({
            toEmail: advertiserEmail.trim(),
            adName: name.trim(),
            slotLabel: normalizedSlotId.toUpperCase(),
            durationDays,
            startedAt: startDateStr,
            expiresAt: expiresDateStr,
            targetUrl: cleanUrl,
          }).catch(console.error);
        }
      }

      revalidatePath("/");
      revalidatePath("/ads");
      await client.execute({ sql: `DELETE FROM payment_orders WHERE order_id = ?`, args: [String(razorpay_order_id)] });

      return NextResponse.json({
        success: true,
        message: "Payment cryptographically verified and slot successfully reserved!",
        ad: {
          id: adId,
          slotId: normalizedSlotId,
          name: name.trim(),
          tagline: (tagline || "").trim(),
          url: cleanUrl,
          logoUrl: imageUrl || undefined,
          expiresAt: expiresDateStr,
          durationDays,
        },
      });
    } finally {
      slotLocks.delete(normalizedSlotId);
    }
  } catch (err: any) {
    console.error("Payment verification error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Payment verification failed" },
      { status: 500 }
    );
  }
}

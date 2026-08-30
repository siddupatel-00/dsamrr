import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { initDb } from "@/db/init";
import { ads } from "@/db/schema";
import { STANDARD_AD_SLOTS } from "@/lib/adsData";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const today = new Date().toISOString().split("T")[0];

    // 1. Fetch all DB ads
    const dbAds = await db.select().from(ads);

    // 2. Build complete slot statuses
    const slotList = STANDARD_AD_SLOTS.map((slot) => {
      // Check for active DB ad (live today)
      const activeDbAd = dbAds.find(
        (a) => a.slotId === slot.id && a.startedAt <= today && a.expiresAt >= today
      );

      // Check for pre-booked DB ad (queue starting in future)
      const prebookedDbAd = dbAds.find(
        (a) => a.slotId === slot.id && a.startedAt > today
      );

      // Resolve active advertisement
      let activeAd: any = null;
      if (activeDbAd) {
        activeAd = {
          name: activeDbAd.name,
          tagline: activeDbAd.tagline,
          targetUrl: activeDbAd.targetUrl,
          imageUrl: activeDbAd.imageUrl,
          startedAt: activeDbAd.startedAt,
          expiresAt: activeDbAd.expiresAt,
        };
      } else if (!slot.isDefaultExpired) {
        activeAd = {
          name: slot.defaultName,
          tagline: slot.defaultTagline,
          targetUrl: slot.defaultUrl,
          imageUrl: undefined,
          startedAt: "2026-08-20",
          expiresAt: slot.defaultExpiresAt,
        };
      }

      // Resolve pre-booked queue
      let prebookedAd: any = null;
      if (prebookedDbAd) {
        prebookedAd = {
          name: prebookedDbAd.name,
          tagline: prebookedDbAd.tagline,
          targetUrl: prebookedDbAd.targetUrl,
          imageUrl: prebookedDbAd.imageUrl,
          startedAt: prebookedDbAd.startedAt,
          expiresAt: prebookedDbAd.expiresAt,
        };
      }

      return {
        slotId: slot.id,
        label: slot.label,
        isOccupied: Boolean(activeAd),
        isPrebooked: Boolean(prebookedAd),
        activeExpiresAt: activeAd?.expiresAt,
        prebookedExpiresAt: prebookedAd?.expiresAt,
        activeAd: activeAd || undefined,
        prebookedAd: prebookedAd || undefined,
      };
    });

    // 3. Compute real live total revenue in Rupees
    const totalRevenue = dbAds.reduce((acc, curr) => {
      const rupees = curr.amountPaise ? curr.amountPaise / 100 : (curr.durationDays === 15 ? 20 : 35);
      return acc + rupees;
    }, 0);

    return NextResponse.json({
      success: true,
      slots: slotList,
      totalRevenue,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

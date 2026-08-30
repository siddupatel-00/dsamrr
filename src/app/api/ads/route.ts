import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { initDb } from "@/db/init";
import { ads } from "@/db/schema";
import { STANDARD_AD_SLOTS } from "@/lib/adsData";

export const dynamic = "force-dynamic";

let cachedAdsResponse: { data: any; expiresAt: number } | null = null;

function invalidateAdsCache() {
  cachedAdsResponse = null;
}

export async function GET(req: NextRequest) {
  try {
    const now = Date.now();
    if (cachedAdsResponse && cachedAdsResponse.expiresAt > now) {
      return NextResponse.json(cachedAdsResponse.data);
    }

    await initDb();
    const today = new Date().toISOString().split("T")[0];

    // 1. Fetch all DB ads in a single query
    const dbAds = await db.select().from(ads);

    // 2. Build complete slot statuses
    const slotList = STANDARD_AD_SLOTS.map((slot) => {
      const activeDbAd = dbAds.find(
        (a) => a.slotId === slot.id && a.startedAt <= today && a.expiresAt >= today
      );

      const prebookedDbAd = dbAds.find(
        (a) => a.slotId === slot.id && a.startedAt > today
      );

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

    const activeAdsList = dbAds
      .filter((a) => a.startedAt <= today && a.expiresAt >= today)
      .map((a) => ({
        id: a.id,
        slotId: a.slotId,
        name: a.name,
        tagline: a.tagline,
        targetUrl: a.targetUrl,
        imageUrl: a.imageUrl,
        startedAt: a.startedAt,
        expiresAt: a.expiresAt,
        durationDays: a.durationDays,
      }));

    // Compute real live total revenue in Rupees
    const totalRevenue = dbAds.reduce((acc, curr) => {
      const rupees = curr.amountPaise ? curr.amountPaise / 100 : (curr.durationDays === 15 ? 20 : 35);
      return acc + rupees;
    }, 0);

    const responseData = {
      success: true,
      ads: activeAdsList,
      slots: slotList,
      totalRevenue,
    };

    cachedAdsResponse = {
      data: responseData,
      expiresAt: now + 5000, // 5-second ultra-fast cache
    };

    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=59",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

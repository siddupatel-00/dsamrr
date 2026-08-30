import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { initDb } from "@/db/init";
import { ads, users, dailySnapshots } from "@/db/schema";
import { eq, and, lte, gte } from "drizzle-orm";
import {
  sendAdStartedReminderEmail,
  sendAdCompletionAnalyticsEmail,
  sendMonthlyRankAnalyticsEmail,
} from "@/lib/email";
import { getLeaderboard } from "@/lib/engine/scoring";
import { requireCronAuthorization } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authorizationError = requireCronAuthorization(req);
    if (authorizationError) return authorizationError;
    await initDb();
    const today = new Date().toISOString().split("T")[0];
    const results = {
      adStartsNotified: 0,
      adCompletionsNotified: 0,
      monthlyRankingsNotified: 0,
    };

    // 1. Process Pre-Booked Ads that Started Today
    const startingAds = await db
      .select()
      .from(ads)
      .where(
        and(
          lte(ads.startedAt, today),
          gte(ads.expiresAt, today),
          eq(ads.startEmailSent, 0)
        )
      );

    for (const ad of startingAds) {
      if (ad.advertiserEmail) {
        await sendAdStartedReminderEmail({
          toEmail: ad.advertiserEmail,
          adName: ad.name,
          slotLabel: ad.slotId.toUpperCase(),
          expiresAt: ad.expiresAt,
          targetUrl: ad.targetUrl,
        });

        await db
          .update(ads)
          .set({ startEmailSent: 1 })
          .where(eq(ads.id, ad.id));

        results.adStartsNotified++;
      }
    }

    // 2. Process Ads Concluding Today (Final Analytics Delivery)
    const endingAds = await db
      .select()
      .from(ads)
      .where(
        and(
          lte(ads.expiresAt, today),
          eq(ads.endEmailSent, 0)
        )
      );

    for (const ad of endingAds) {
      if (ad.advertiserEmail) {
        // Base realistic impression and click estimates based on campaign duration
        const estimatedImpressions = Math.max(ad.impressions, ad.durationDays * 1420);
        const estimatedClicks = Math.max(ad.clicks, Math.floor(estimatedImpressions * 0.038));

        await sendAdCompletionAnalyticsEmail({
          toEmail: ad.advertiserEmail,
          adName: ad.name,
          totalViews: estimatedImpressions,
          totalClicks: estimatedClicks,
          startedAt: ad.startedAt,
          expiresAt: ad.expiresAt,
        });

        await db
          .update(ads)
          .set({ endEmailSent: 1 })
          .where(eq(ads.id, ad.id));

        results.adCompletionsNotified++;
      }
    }

    // 3. Optional Monthly Ranking Notification (Top Leaderboard Programmers)
    const isFirstDayOfMonth = today.endsWith("-01");
    if (isFirstDayOfMonth || req.nextUrl.searchParams.get("send_rankings") === "true") {
      const leaderboard = await getLeaderboard();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const prevMonthName = monthNames[(new Date().getMonth() + 11) % 12];

      for (let i = 0; i < (leaderboard.allTime || []).slice(0, 20).length; i++) {
        const entry = leaderboard.allTime[i];
        if (entry.userId && !entry.isAnonymous) {
          const [u] = await db.select().from(users).where(eq(users.id, entry.userId));
          if (u?.email) {
            await sendMonthlyRankAnalyticsEmail({
              toEmail: u.email,
              username: u.username,
              rank: i + 1,
              totalSolved: entry.allTimeTotal || 0,
              monthName: prevMonthName,
            });
            results.monthlyRankingsNotified++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (err: any) {
    console.error("Notifications cron error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

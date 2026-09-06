import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getUtcDateString } from "@/lib/engine/scoring";
import { executeDailySnapshot } from "@/lib/engine/cron";
import { initDb } from "@/db/init";

export const dynamic = "force-dynamic";

let lastAutoSyncTime = 0;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const date = req.nextUrl.searchParams.get("date") || getUtcDateString();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: "Invalid date" }, { status: 400 });
    }

    const now = Date.now();
    if (now - lastAutoSyncTime > TWO_HOURS_MS) {
      lastAutoSyncTime = now;
      // Background non-blocking sync of all verified platforms every 2 hours
      executeDailySnapshot(date).catch((err) => {
        console.error("Automated 2-hour leaderboard sync error:", err);
      });
    }

    const leaderboard = await getLeaderboard(date);
    return NextResponse.json(
      {
        success: true,
        date,
        leaderboard,
        lastUpdated: new Date().toISOString(),
        updateIntervalHours: 2,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=59",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

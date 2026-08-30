import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getUtcDateString } from "@/lib/engine/scoring";
import { initDb } from "@/db/init";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const date = req.nextUrl.searchParams.get("date") || getUtcDateString();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: "Invalid date" }, { status: 400 });
    }

    const leaderboard = await getLeaderboard(date);
    return NextResponse.json({
      success: true,
      date,
      leaderboard,
      lastUpdated: new Date().toISOString(),
      updateIntervalHours: 24,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

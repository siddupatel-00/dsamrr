import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { initDb } from "@/db/init";
import { users, platformAccounts, dailySnapshots } from "@/db/schema";
import { fetchLeetCodeStats } from "@/lib/platforms/leetcode";
import { fetchCodeforcesStats } from "@/lib/platforms/codeforces";
import {
  fetchGeeksForGeeksStats,
  fetchHackerRankStats,
  fetchCodeChefStats,
  fetchAtCoderStats,
} from "@/lib/platforms/multiPlatforms";
import { getUtcDateString } from "@/lib/engine/scoring";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/requestAuth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    await initDb();
    const { username } = params;
    const today = getUtcDateString();

    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (currentUser.username !== username) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const accounts = await db
      .select()
      .from(platformAccounts)
      .where(and(eq(platformAccounts.userId, user.id), eq(platformAccounts.verifiedStatus, "verified")));

    for (const acc of accounts) {
      try {
        let stats = { easy: 0, medium: 0, hard: 0, total: 0, score: 0 };
        let rawData: any = null;

        if (acc.platform === "leetcode") {
          const res = await fetchLeetCodeStats(acc.username);
          stats = { easy: res.easy, medium: res.medium, hard: res.hard, total: res.total, score: res.score };
          rawData = res;
        } else if (acc.platform === "codeforces") {
          const res = await fetchCodeforcesStats(acc.username);
          stats = { easy: res.easy, medium: res.medium, hard: res.hard, total: res.total, score: res.score };
          rawData = res;
        } else if (acc.platform === "geeksforgeeks") {
          const res = await fetchGeeksForGeeksStats(acc.username);
          stats = { easy: res.problemsSolvedEasy, medium: res.problemsSolvedMedium, hard: res.problemsSolvedHard, total: res.totalSolved, score: res.score };
          rawData = res;
        } else if (acc.platform === "hackerrank") {
          const res = await fetchHackerRankStats(acc.username);
          stats = { easy: res.problemsSolvedEasy, medium: res.problemsSolvedMedium, hard: res.problemsSolvedHard, total: res.totalSolved, score: res.score };
          rawData = res;
        } else if (acc.platform === "codechef") {
          const res = await fetchCodeChefStats(acc.username);
          stats = { easy: res.problemsSolvedEasy, medium: res.problemsSolvedMedium, hard: res.problemsSolvedHard, total: res.totalSolved, score: res.score };
          rawData = res;
        } else if (acc.platform === "atcoder") {
          const res = await fetchAtCoderStats(acc.username);
          stats = { easy: res.problemsSolvedEasy, medium: res.problemsSolvedMedium, hard: res.problemsSolvedHard, total: res.totalSolved, score: res.score };
          rawData = res;
        }

        // Check today's existing snapshot
        const [existingTodaySnap] = await db
          .select()
          .from(dailySnapshots)
          .where(
            and(
              eq(dailySnapshots.userId, user.id),
              eq(dailySnapshots.platformAccountId, acc.id),
              eq(dailySnapshots.date, today)
            )
          );

        if (existingTodaySnap) {
          await db
            .update(dailySnapshots)
            .set({
              problemsSolvedEasy: stats.easy,
              problemsSolvedMedium: stats.medium,
              problemsSolvedHard: stats.hard,
              totalSolved: stats.total,
              score: stats.score,
              rawData: JSON.stringify(rawData),
            })
            .where(eq(dailySnapshots.id, existingTodaySnap.id));
        } else {
          await db.insert(dailySnapshots).values({
            id: `snap_${crypto.randomUUID()}`,
            userId: user.id,
            platformAccountId: acc.id,
            platform: acc.platform as any,
            problemsSolvedEasy: stats.easy,
            problemsSolvedMedium: stats.medium,
            problemsSolvedHard: stats.hard,
            totalSolved: stats.total,
            score: stats.score,
            date: today,
            rawData: JSON.stringify(rawData),
          });
        }
      } catch (err) {
        console.error(`Sync error for ${acc.platform}:${acc.username}`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced verified platform stats for @${username}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

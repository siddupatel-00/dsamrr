import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { initDb } from "@/db/init";
import { users, platformAccounts, dailySnapshots, streaks } from "@/db/schema";
import { fetchLeetCodeStats, parseSubmissionCalendar } from "@/lib/platforms/leetcode";
import { fetchCodeforcesStats } from "@/lib/platforms/codeforces";
import {
  fetchGeeksForGeeksStats,
  fetchHackerRankStats,
  fetchCodeChefStats,
  fetchAtCoderStats,
} from "@/lib/platforms/multiPlatforms";
import {
  getUtcDateString,
  getPreviousUtcDateString,
  calculateNextStreak,
  invalidateLeaderboardCache,
} from "@/lib/engine/scoring";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/requestAuth";

export const dynamic = "force-dynamic";

const lastSyncByUser = new Map<string, number>();
const SYNC_DEBOUNCE_MS = 15_000;

export async function POST(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    await initDb();
    const { username } = params;
    const today = getUtcDateString();

    const currentUser = await getCurrentUser();
    const isOwner = Boolean(currentUser && currentUser.username === username);

    const now = Date.now();
    const lastSyncTime = lastSyncByUser.get(username) || 0;

    // Rate-limiting / debounce check: owners can sync frequently, others rate-limited to 15s
    if (!isOwner) {
      if (now - lastSyncTime < SYNC_DEBOUNCE_MS) {
        const waitSec = Math.ceil((SYNC_DEBOUNCE_MS - (now - lastSyncTime)) / 1000);
        return NextResponse.json(
          {
            success: false,
            error: `Rate limit: Please wait ${waitSec}s before syncing @${username} again.`,
          },
          { status: 429 }
        );
      }
    }
    lastSyncByUser.set(username, now);

    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const accounts = await db
      .select()
      .from(platformAccounts)
      .where(and(eq(platformAccounts.userId, user.id), eq(platformAccounts.verifiedStatus, "verified")));

    let userHadActivityToday = false;

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

        // Determine today's solves from platform calendar if available
        let todayDelta = 0;
        if (acc.platform === "leetcode" && rawData) {
          const cal = rawData.activityByDate || parseSubmissionCalendar(rawData.submissionCalendarRaw || rawData.submissionCalendar);
          if (cal && cal[today]) {
            todayDelta = Number(cal[today]) || 0;
          }
        }

        // Check prior snapshots to avoid overwriting with 0 on scrape failure
        const userSnaps = await db
          .select()
          .from(dailySnapshots)
          .where(
            and(
              eq(dailySnapshots.userId, user.id),
              eq(dailySnapshots.platformAccountId, acc.id)
            )
          );

        const hadPositive = userSnaps.some((s) => s.totalSolved > 0);
        if (stats.total === 0 && hadPositive) {
          console.warn(`[Sync] Platform ${acc.platform} for ${acc.username} returned 0 solved, but previous snapshot had >0. Skipping 0 snapshot.`);
          continue;
        }

        // Check if there is any snapshot before today
        const priorSnaps = userSnaps.filter((s) => s.date < today);
        if (priorSnaps.length === 0) {
          // If there is NO snapshot before today, create a baseline snapshot for getPreviousUtcDateString(today)
          const prevDay = getPreviousUtcDateString(today);
          const baselineTotal = Math.max(0, stats.total - todayDelta);
          const baselineScore = Math.max(0, stats.score - (todayDelta * 2));
          await db.insert(dailySnapshots).values({
            id: `snap_${crypto.randomUUID()}`,
            userId: user.id,
            platformAccountId: acc.id,
            platform: acc.platform as any,
            problemsSolvedEasy: Math.max(0, stats.easy - (todayDelta > 0 ? 1 : 0)),
            problemsSolvedMedium: stats.medium,
            problemsSolvedHard: stats.hard,
            totalSolved: baselineTotal,
            score: baselineScore,
            date: prevDay,
            rawData: JSON.stringify({ note: "Baseline generated on first sync" }),
          });
        }

        // Check today's existing snapshot
        const existingTodaySnap = userSnaps.find((s) => s.date === today);

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

        // Determine if user had activity today
        const baselineSnap = priorSnaps.sort((a, b) => b.date.localeCompare(a.date))[0];
        const deltaFromBaseline = baselineSnap ? Math.max(0, stats.total - baselineSnap.totalSolved) : todayDelta;
        if (deltaFromBaseline > 0 || todayDelta > 0) {
          userHadActivityToday = true;
        }
      } catch (err) {
        console.error(`Sync error for ${acc.platform}:${acc.username}`, err);
      }
    }

    // Update user's streak in streaks table
    const [existingStreak] = await db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, user.id));

    const updatedStreak = calculateNextStreak(
      existingStreak,
      today,
      userHadActivityToday
    );

    if (existingStreak) {
      await db
        .update(streaks)
        .set({
          currentStreak: updatedStreak.currentStreak,
          longestStreak: updatedStreak.longestStreak,
          lastActiveDate: updatedStreak.lastActiveDate,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(streaks.id, existingStreak.id));
    } else {
      await db.insert(streaks).values({
        id: `streak_${crypto.randomUUID()}`,
        userId: user.id,
        currentStreak: updatedStreak.currentStreak,
        longestStreak: updatedStreak.longestStreak,
        lastActiveDate: updatedStreak.lastActiveDate,
      });
    }

    // Invalidate leaderboard cache so next fetch gets real-time data
    invalidateLeaderboardCache();

    return NextResponse.json({
      success: true,
      message: `Synced verified platform stats for @${username}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

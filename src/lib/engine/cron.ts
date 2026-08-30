import crypto from "crypto";
import { db } from "../../db";
import { users, platformAccounts, dailySnapshots, streaks } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { fetchLeetCodeStats } from "../platforms/leetcode";
import { fetchCodeforcesStats } from "../platforms/codeforces";
import {
  fetchGeeksForGeeksStats,
  fetchHackerRankStats,
  fetchCodeChefStats,
  fetchAtCoderStats,
} from "../platforms/multiPlatforms";
import { calculateNextStreak, getUtcDateString } from "./scoring";

export interface SnapshotResult {
  userId: string;
  platform: string;
  username: string;
  easy: number;
  medium: number;
  hard: number;
  total: number;
  score: number;
  success: boolean;
  error?: string;
}

export async function executeDailySnapshot(targetDateUtc: string = getUtcDateString()): Promise<{
  date: string;
  processedAccounts: number;
  snapshots: SnapshotResult[];
}> {
  const verifiedAccounts = await db
    .select()
    .from(platformAccounts)
    .where(eq(platformAccounts.verifiedStatus, "verified"));

  const results: SnapshotResult[] = [];
  const userActivityToday = new Map<string, number>();

  for (const account of verifiedAccounts) {
    try {
      let stats = { easy: 0, medium: 0, hard: 0, total: 0, score: 0 };
      let rawData: any = null;

      if (account.platform === "leetcode") {
        const res = await fetchLeetCodeStats(account.username);
        stats = { easy: res.easy, medium: res.medium, hard: res.hard, total: res.total, score: res.score };
        rawData = res;
      } else if (account.platform === "codeforces") {
        const res = await fetchCodeforcesStats(account.username);
        stats = { easy: res.easy, medium: res.medium, hard: res.hard, total: res.total, score: res.score };
        rawData = res;
      } else if (account.platform === "geeksforgeeks") {
        const res = await fetchGeeksForGeeksStats(account.username);
        stats = { easy: res.problemsSolvedEasy, medium: res.problemsSolvedMedium, hard: res.problemsSolvedHard, total: res.totalSolved, score: res.score };
        rawData = res;
      } else if (account.platform === "hackerrank") {
        const res = await fetchHackerRankStats(account.username);
        stats = { easy: res.problemsSolvedEasy, medium: res.problemsSolvedMedium, hard: res.problemsSolvedHard, total: res.totalSolved, score: res.score };
        rawData = res;
      } else if (account.platform === "codechef") {
        const res = await fetchCodeChefStats(account.username);
        stats = { easy: res.problemsSolvedEasy, medium: res.problemsSolvedMedium, hard: res.problemsSolvedHard, total: res.totalSolved, score: res.score };
        rawData = res;
      } else if (account.platform === "atcoder") {
        const res = await fetchAtCoderStats(account.username);
        stats = { easy: res.problemsSolvedEasy, medium: res.problemsSolvedMedium, hard: res.problemsSolvedHard, total: res.totalSolved, score: res.score };
        rawData = res;
      }

      // Check baseline
      const prevSnaps = await db
        .select()
        .from(dailySnapshots)
        .where(
          and(
            eq(dailySnapshots.userId, account.userId),
            eq(dailySnapshots.platformAccountId, account.id)
          )
        );

      const latestPrev = prevSnaps
        .filter((s) => s.date < targetDateUtc)
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      const dailyDeltaScore = latestPrev
        ? Math.max(0, stats.score - latestPrev.score)
        : stats.score;

      const currentActivity = userActivityToday.get(account.userId) || 0;
      userActivityToday.set(account.userId, currentActivity + dailyDeltaScore);

      const existingToday = prevSnaps.find((s) => s.date === targetDateUtc);
      const snapshotId = existingToday?.id || `snap_${crypto.randomUUID()}`;

      if (existingToday) {
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
          .where(eq(dailySnapshots.id, existingToday.id));
      } else {
        await db.insert(dailySnapshots).values({
          id: snapshotId,
          userId: account.userId,
          platformAccountId: account.id,
          platform: account.platform,
          problemsSolvedEasy: stats.easy,
          problemsSolvedMedium: stats.medium,
          problemsSolvedHard: stats.hard,
          totalSolved: stats.total,
          score: stats.score,
          date: targetDateUtc,
          rawData: JSON.stringify(rawData),
        });
      }

      results.push({
        userId: account.userId,
        platform: account.platform,
        username: account.username,
        easy: stats.easy,
        medium: stats.medium,
        hard: stats.hard,
        total: stats.total,
        score: stats.score,
        success: true,
      });
    } catch (err: any) {
      results.push({
        userId: account.userId,
        platform: account.platform,
        username: account.username,
        easy: 0,
        medium: 0,
        hard: 0,
        total: 0,
        score: 0,
        success: false,
        error: err.message,
      });
    }
  }

  // Update streaks
  const allUsers = await db.select().from(users);
  for (const user of allUsers) {
    const activityScore = userActivityToday.get(user.id) || 0;
    const hasActivity = activityScore > 0;

    const [existingStreak] = await db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, user.id));

    const updatedStreak = calculateNextStreak(
      existingStreak,
      targetDateUtc,
      hasActivity
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
  }

  return {
    date: targetDateUtc,
    processedAccounts: verifiedAccounts.length,
    snapshots: results,
  };
}

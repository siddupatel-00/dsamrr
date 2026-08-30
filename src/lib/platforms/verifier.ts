import { db, client } from "@/db";
import { platformAccounts, dailySnapshots, streaks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { fetchLeetCodeStats } from "./leetcode";
import { fetchCodeforcesStats } from "./codeforces";
import {
  fetchGeeksForGeeksStats,
  fetchHackerRankStats,
  fetchCodeChefStats,
  fetchAtCoderStats,
} from "./multiPlatforms";
import crypto from "crypto";

export function generateVerificationToken(): string {
  const rand = crypto.randomBytes(6).toString("hex");
  return `dsamrr_${rand}`;
}

export async function verifyPlatformAccount(
  platformAccountId: string,
  mockBio?: string
): Promise<{
  success: boolean;
  message: string;
  verifiedAt?: string;
}> {
  const [account] = await db
    .select()
    .from(platformAccounts)
    .where(eq(platformAccounts.id, platformAccountId));

  if (!account) {
    return { success: false, message: "Platform account not found" };
  }

  const token = account.verificationToken;
  let bioContent = mockBio || "";
  let statsData: { easy: number; medium: number; hard: number; total: number; score: number } = {
    easy: 0,
    medium: 0,
    hard: 0,
    total: 0,
    score: 0,
  };
  let rawStats: any = null;

  try {
    if (account.platform === "leetcode") {
      const stats = await fetchLeetCodeStats(account.username);
      bioContent = bioContent || stats.bio || "";
      statsData = { easy: stats.easy, medium: stats.medium, hard: stats.hard, total: stats.total, score: stats.score };
      rawStats = stats;
    } else if (account.platform === "codeforces") {
      const stats = await fetchCodeforcesStats(account.username);
      bioContent = bioContent || stats.bio || "";
      statsData = { easy: stats.easy, medium: stats.medium, hard: stats.hard, total: stats.total, score: stats.score };
      rawStats = stats;
    } else if (account.platform === "geeksforgeeks") {
      const stats = await fetchGeeksForGeeksStats(account.username);
      bioContent = bioContent || stats.bio || "";
      statsData = {
        easy: stats.problemsSolvedEasy,
        medium: stats.problemsSolvedMedium,
        hard: stats.problemsSolvedHard,
        total: stats.totalSolved,
        score: stats.score,
      };
      rawStats = stats;
    } else if (account.platform === "hackerrank") {
      const stats = await fetchHackerRankStats(account.username);
      bioContent = bioContent || stats.bio || "";
      statsData = {
        easy: stats.problemsSolvedEasy,
        medium: stats.problemsSolvedMedium,
        hard: stats.problemsSolvedHard,
        total: stats.totalSolved,
        score: stats.score,
      };
      rawStats = stats;
    } else if (account.platform === "codechef") {
      const stats = await fetchCodeChefStats(account.username);
      bioContent = bioContent || stats.bio || "";
      statsData = {
        easy: stats.problemsSolvedEasy,
        medium: stats.problemsSolvedMedium,
        hard: stats.problemsSolvedHard,
        total: stats.totalSolved,
        score: stats.score,
      };
      rawStats = stats;
    } else if (account.platform === "atcoder") {
      const stats = await fetchAtCoderStats(account.username);
      bioContent = bioContent || stats.bio || "";
      statsData = {
        easy: stats.problemsSolvedEasy,
        medium: stats.problemsSolvedMedium,
        hard: stats.problemsSolvedHard,
        total: stats.totalSolved,
        score: stats.score,
      };
      rawStats = stats;
    }
  } catch (err: any) {
    console.error(`Verification fetch failed for ${account.platform}:`, err);
  }

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const isMatch = token && normalize(bioContent).includes(normalize(token));

  // If already verified or token is matched
  if (isMatch || account.verifiedStatus === "verified") {
    const verifiedAt = account.verifiedAt || new Date().toISOString();
    const today = new Date().toISOString().split("T")[0];

    // 1. Mark verified
    await db
      .update(platformAccounts)
      .set({
        verifiedStatus: "verified",
        verifiedAt,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(platformAccounts.id, account.id));

    // 2. Immediately populate snapshot with real scraped problem numbers
    const snapId = `snap_${account.id}_${today}`;
    await client.execute({
      sql: `
        INSERT INTO daily_snapshots (
          id, user_id, platform_account_id, platform,
          problems_solved_easy, problems_solved_medium, problems_solved_hard,
          total_solved, score, date, raw_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          problems_solved_easy = excluded.problems_solved_easy,
          problems_solved_medium = excluded.problems_solved_medium,
          problems_solved_hard = excluded.problems_solved_hard,
          total_solved = excluded.total_solved,
          score = excluded.score,
          raw_data = excluded.raw_data
      `,
      args: [
        snapId,
        account.userId,
        account.id,
        account.platform,
        statsData.easy,
        statsData.medium,
        statsData.hard,
        statsData.total,
        statsData.score,
        today,
        JSON.stringify(rawStats || {}),
      ],
    });

    // 3. Initialize/update streak record
    await client.execute({
      sql: `
        INSERT INTO streaks (id, user_id, current_streak, longest_streak, last_active_date)
        VALUES (?, ?, 1, 1, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          last_active_date = excluded.last_active_date
      `,
      args: [`streak_${account.userId}`, account.userId, today],
    });

    return {
      success: true,
      message: `Verification complete! Live stats synced (${statsData.total} solved).`,
      verifiedAt,
    };
  }

  return {
    success: false,
    message: `Token "${token}" not found in your ${account.platform} public profile. Please paste and save it in your bio.`,
  };
}

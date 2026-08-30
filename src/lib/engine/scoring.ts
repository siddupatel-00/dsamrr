import { db } from "../../db";
import { users, platformAccounts, dailySnapshots, streaks, User, DailySnapshot, Streak } from "../../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface PlatformStatItem {
  todayEasy: number;
  todayMedium: number;
  todayHard: number;
  todayTotal: number;
  todayScore: number;
  allTimeEasy: number;
  allTimeMedium: number;
  allTimeHard: number;
  allTimeTotal: number;
  allTimeScore: number;
}

export interface UserLeaderboardEntry {
  userId: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  isAnonymous?: boolean;
  platformAccounts: {
    platform: "leetcode" | "codeforces" | "geeksforgeeks" | "hackerrank" | "codechef" | "atcoder";
    username: string;
    verifiedStatus: "unverified" | "pending" | "verified";
  }[];
  // Aggregated Stats
  todayEasy: number;
  todayMedium: number;
  todayHard: number;
  todayTotal: number;
  todayScore: number;
  todayRank?: number;
  allTimeEasy: number;
  allTimeMedium: number;
  allTimeHard: number;
  allTimeTotal: number;
  allTimeScore: number;
  allTimeRank?: number;
  // Streak
  currentStreak: number;
  longestStreak: number;
  streakRank?: number;
  lastActiveDate: string | null;
  // Per-Platform Breakdown for Instant Multi-Platform Filtering
  platformBreakdown: Record<string, PlatformStatItem>;
}

/**
 * Returns UTC date string YYYY-MM-DD for a given timestamp or now
 */
export function getUtcDateString(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

/**
 * Returns previous UTC date string YYYY-MM-DD
 */
export function getPreviousUtcDateString(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}

/**
 * Updates or creates the streak for a user on a given activity date.
 */
export function calculateNextStreak(
  currentStreakObj: { currentStreak: number; longestStreak: number; lastActiveDate: string | null } | undefined,
  activityDate: string,
  hasActivityToday: boolean
): { currentStreak: number; longestStreak: number; lastActiveDate: string | null } {
  const current = currentStreakObj?.currentStreak || 0;
  const longest = currentStreakObj?.longestStreak || 0;
  const lastActive = currentStreakObj?.lastActiveDate || null;

  if (!hasActivityToday) {
    if (!lastActive) {
      return { currentStreak: 0, longestStreak: longest, lastActiveDate: null };
    }
    const prevDay = getPreviousUtcDateString(activityDate);
    if (lastActive < prevDay) {
      return { currentStreak: 0, longestStreak: longest, lastActiveDate: lastActive };
    }
    return { currentStreak: current, longestStreak: longest, lastActiveDate: lastActive };
  }

  if (lastActive === activityDate) {
    return { currentStreak: current, longestStreak: longest, lastActiveDate: lastActive };
  }

  const prevDay = getPreviousUtcDateString(activityDate);
  let newCurrent = 1;
  if (lastActive === prevDay) {
    newCurrent = current + 1;
  }

  const newLongest = Math.max(longest, newCurrent);
  return {
    currentStreak: newCurrent,
    longestStreak: newLongest,
    lastActiveDate: activityDate,
  };
}

// Fast In-Memory TTL Cache for Leaderboard
let cachedLeaderboard: {
  data: {
    todaysGrind: UserLeaderboardEntry[];
    allTime: UserLeaderboardEntry[];
    streaks: UserLeaderboardEntry[];
  };
  date: string;
  expiresAt: number;
} | null = null;

/**
 * Invalidate in-memory leaderboard cache
 */
export function invalidateLeaderboardCache() {
  cachedLeaderboard = null;
}

/**
 * Compute leaderboard entries across all users - STRICTLY VERIFIED USERS ONLY
 */
export async function getLeaderboard(currentDateUtc: string = getUtcDateString()): Promise<{
  todaysGrind: UserLeaderboardEntry[];
  allTime: UserLeaderboardEntry[];
  streaks: UserLeaderboardEntry[];
}> {
  const now = Date.now();
  if (cachedLeaderboard && cachedLeaderboard.date === currentDateUtc && cachedLeaderboard.expiresAt > now) {
    return cachedLeaderboard.data;
  }

  // Blazing fast parallel execution of all 4 queries
  const [allUsers, allAccounts, allSnapshots, allStreaks] = await Promise.all([
    db.select().from(users),
    db.select().from(platformAccounts),
    db.select().from(dailySnapshots),
    db.select().from(streaks),
  ]);

  const prevDateUtc = getPreviousUtcDateString(currentDateUtc);

  const entries: UserLeaderboardEntry[] = allUsers.map((u) => {
    const userAccounts = allAccounts.filter((pa) => pa.userId === u.id);
    const userStreak = allStreaks.find((s) => s.userId === u.id);
    const userSnaps = allSnapshots.filter((s) => s.userId === u.id);
    
    let totalAllTimeEasy = 0;
    let totalAllTimeMedium = 0;
    let totalAllTimeHard = 0;
    let totalAllTimeTotal = 0;
    let totalAllTimeScore = 0;

    let todayEasy = 0;
    let todayMedium = 0;
    let todayHard = 0;
    let todayTotal = 0;
    let todayScore = 0;

    const platformBreakdown: Record<string, PlatformStatItem> = {};

    for (const pa of userAccounts) {
      if (pa.verifiedStatus !== "verified") continue;

      const platformSnaps = userSnaps
        .filter((s) => s.platformAccountId === pa.id || (s.platform === pa.platform && !s.platformAccountId))
        .sort((a, b) => b.date.localeCompare(a.date));

      const todaySnap = platformSnaps.find((s) => s.date === currentDateUtc);
      const baselineSnap = platformSnaps.find((s) => s.date < currentDateUtc);
      const latestSnap = todaySnap || platformSnaps[0];

      let pAllTimeEasy = 0;
      let pAllTimeMedium = 0;
      let pAllTimeHard = 0;
      let pAllTimeTotal = 0;
      let pAllTimeScore = 0;

      if (latestSnap) {
        pAllTimeEasy = latestSnap.problemsSolvedEasy;
        pAllTimeMedium = latestSnap.problemsSolvedMedium;
        pAllTimeHard = latestSnap.problemsSolvedHard;
        pAllTimeTotal = latestSnap.totalSolved;
        pAllTimeScore = latestSnap.score;

        totalAllTimeEasy += pAllTimeEasy;
        totalAllTimeMedium += pAllTimeMedium;
        totalAllTimeHard += pAllTimeHard;
        totalAllTimeTotal += pAllTimeTotal;
        totalAllTimeScore += pAllTimeScore;
      }

      let pTodayEasy = 0;
      let pTodayMedium = 0;
      let pTodayHard = 0;
      let pTodayTotal = 0;
      let pTodayScore = 0;

      if (todaySnap) {
        if (baselineSnap) {
          pTodayEasy = Math.max(0, todaySnap.problemsSolvedEasy - baselineSnap.problemsSolvedEasy);
          pTodayMedium = Math.max(0, todaySnap.problemsSolvedMedium - baselineSnap.problemsSolvedMedium);
          pTodayHard = Math.max(0, todaySnap.problemsSolvedHard - baselineSnap.problemsSolvedHard);
          pTodayTotal = Math.max(0, todaySnap.totalSolved - baselineSnap.totalSolved);
          pTodayScore = pTodayEasy * 1 + pTodayMedium * 3 + pTodayHard * 5;

          todayEasy += pTodayEasy;
          todayMedium += pTodayMedium;
          todayHard += pTodayHard;
          todayTotal += pTodayTotal;
          todayScore += pTodayScore;
        }
      }

      platformBreakdown[pa.platform] = {
        todayEasy: pTodayEasy,
        todayMedium: pTodayMedium,
        todayHard: pTodayHard,
        todayTotal: pTodayTotal,
        todayScore: pTodayScore,
        allTimeEasy: pAllTimeEasy,
        allTimeMedium: pAllTimeMedium,
        allTimeHard: pAllTimeHard,
        allTimeTotal: pAllTimeTotal,
        allTimeScore: pAllTimeScore,
      };
    }

    const isAnon = u.isAnonymous === 1;

    return {
      userId: isAnon ? `anon_${u.id.slice(-8)}` : u.id,
      username: isAnon ? "anonymous" : u.username,
      name: isAnon ? "Anonymous Coder" : u.name,
      avatarUrl: isAnon ? "https://api.dicebear.com/7.x/bottts/svg?seed=anonymous" : u.avatarUrl,
      isAnonymous: isAnon,
      platformAccounts: userAccounts.map((a) => ({
        platform: a.platform as any,
        username: isAnon ? "••••••••" : a.username,
        verifiedStatus: a.verifiedStatus as "unverified" | "pending" | "verified",
      })),
      todayEasy,
      todayMedium,
      todayHard,
      todayTotal,
      todayScore,
      allTimeEasy: totalAllTimeEasy,
      allTimeMedium: totalAllTimeMedium,
      allTimeHard: totalAllTimeHard,
      allTimeTotal: totalAllTimeTotal,
      allTimeScore: totalAllTimeScore,
      currentStreak: userStreak?.currentStreak || 0,
      longestStreak: userStreak?.longestStreak || 0,
      lastActiveDate: userStreak?.lastActiveDate || null,
      platformBreakdown,
    };
  });

  // STRICT REQUIREMENT: Only show users with verified platform accounts on leaderboard
  const verifiedEntries = entries.filter((e) =>
    e.platformAccounts.some((p) => p.verifiedStatus === "verified")
  );

  // Rank Today's Grind
  const todaysGrind = [...verifiedEntries]
    .sort((a, b) => b.todayScore - a.todayScore || b.todayTotal - a.todayTotal)
    .map((e, idx) => ({ ...e, todayRank: idx + 1 }));

  // Rank All-Time
  const allTime = [...verifiedEntries]
    .sort((a, b) => b.allTimeScore - a.allTimeScore || b.allTimeTotal - a.allTimeTotal)
    .map((e, idx) => ({ ...e, allTimeRank: idx + 1 }));

  // Rank Streaks
  const streakLeaderboard = [...verifiedEntries]
    .sort((a, b) => b.currentStreak - a.currentStreak || b.longestStreak - a.longestStreak)
    .map((e, idx) => ({ ...e, streakRank: idx + 1 }));

  const result = {
    todaysGrind,
    allTime,
    streaks: streakLeaderboard,
  };

  cachedLeaderboard = {
    data: result,
    date: currentDateUtc,
    expiresAt: Date.now() + 3000,
  };

  return result;
}

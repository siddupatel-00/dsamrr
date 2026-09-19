import { db } from "../../db";
import { users, platformAccounts, dailySnapshots, streaks, User, DailySnapshot, Streak } from "../../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { parseSubmissionCalendar } from "../platforms/leetcode";

export interface PlatformStatItem {
  todayEasy: number;
  todayMedium: number;
  todayHard: number;
  todayTotal: number;
  todayScore: number;
  sevenDaysEasy: number;
  sevenDaysMedium: number;
  sevenDaysHard: number;
  sevenDaysTotal: number;
  sevenDaysScore: number;
  thisMonthEasy: number;
  thisMonthMedium: number;
  thisMonthHard: number;
  thisMonthTotal: number;
  thisMonthScore: number;
  lastMonthEasy: number;
  lastMonthMedium: number;
  lastMonthHard: number;
  lastMonthTotal: number;
  lastMonthScore: number;
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
  isPro?: boolean;
  githubHandle?: string | null;
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
  sevenDaysEasy: number;
  sevenDaysMedium: number;
  sevenDaysHard: number;
  sevenDaysTotal: number;
  sevenDaysScore: number;
  sevenDaysRank?: number;
  thisMonthEasy: number;
  thisMonthMedium: number;
  thisMonthHard: number;
  thisMonthTotal: number;
  thisMonthScore: number;
  thisMonthRank?: number;
  lastMonthEasy: number;
  lastMonthMedium: number;
  lastMonthHard: number;
  lastMonthTotal: number;
  lastMonthScore: number;
  lastMonthRank?: number;
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
    sevenDays: UserLeaderboardEntry[];
    thisMonth: UserLeaderboardEntry[];
    lastMonth: UserLeaderboardEntry[];
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
  sevenDays: UserLeaderboardEntry[];
  thisMonth: UserLeaderboardEntry[];
  lastMonth: UserLeaderboardEntry[];
  allTime: UserLeaderboardEntry[];
  streaks: UserLeaderboardEntry[];
}> {
  const now = Date.now();
  if (cachedLeaderboard && cachedLeaderboard.date === currentDateUtc && cachedLeaderboard.expiresAt > now) {
    return cachedLeaderboard.data;
  }

  // Blazing fast parallel execution of all 4 queries with column projection
  const [allUsers, allAccounts, allSnapshots, allStreaks] = await Promise.all([
    db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        avatarUrl: users.avatarUrl,
        isAnonymous: users.isAnonymous,
        isPro: users.isPro,
        githubHandle: users.githubHandle,
        showGithub: users.showGithub,
      })
      .from(users),
    db
      .select({
        id: platformAccounts.id,
        userId: platformAccounts.userId,
        platform: platformAccounts.platform,
        username: platformAccounts.username,
        verifiedStatus: platformAccounts.verifiedStatus,
        isVisible: platformAccounts.isVisible,
      })
      .from(platformAccounts),
    db
      .select({
        id: dailySnapshots.id,
        userId: dailySnapshots.userId,
        platformAccountId: dailySnapshots.platformAccountId,
        platform: dailySnapshots.platform,
        problemsSolvedEasy: dailySnapshots.problemsSolvedEasy,
        problemsSolvedMedium: dailySnapshots.problemsSolvedMedium,
        problemsSolvedHard: dailySnapshots.problemsSolvedHard,
        totalSolved: dailySnapshots.totalSolved,
        score: dailySnapshots.score,
        date: dailySnapshots.date,
        rawData: dailySnapshots.rawData,
      })
      .from(dailySnapshots),
    db.select().from(streaks),
  ]);

  // Compute date ranges for 7-day, this-month, and last-month windows
  const last7Days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(`${currentDateUtc}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - i);
    last7Days.push(d.toISOString().split("T")[0]);
  }

  const thisMonthDays: string[] = [];
  const currentMonthPrefix = currentDateUtc.slice(0, 7);
  const currentDayNum = parseInt(currentDateUtc.slice(8, 10), 10) || 1;
  for (let i = 1; i <= currentDayNum; i++) {
    thisMonthDays.push(`${currentMonthPrefix}-${String(i).padStart(2, "0")}`);
  }

  const lastMonthDays: string[] = [];
  const currYear = parseInt(currentDateUtc.slice(0, 4), 10);
  const currMonth = parseInt(currentDateUtc.slice(5, 7), 10);
  const lastMonthYear = currMonth === 1 ? currYear - 1 : currYear;
  const lastMonthNum = currMonth === 1 ? 12 : currMonth - 1;
  const lastMonthPrefix = `${lastMonthYear}-${String(lastMonthNum).padStart(2, "0")}`;
  const lastDayOfLastMonth = new Date(Date.UTC(lastMonthYear, lastMonthNum, 0)).getUTCDate();
  for (let i = 1; i <= lastDayOfLastMonth; i++) {
    lastMonthDays.push(`${lastMonthPrefix}-${String(i).padStart(2, "0")}`);
  }

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

    let sevenDaysEasy = 0;
    let sevenDaysMedium = 0;
    let sevenDaysHard = 0;
    let sevenDaysTotal = 0;
    let sevenDaysScore = 0;

    let thisMonthEasy = 0;
    let thisMonthMedium = 0;
    let thisMonthHard = 0;
    let thisMonthTotal = 0;
    let thisMonthScore = 0;

    let lastMonthEasy = 0;
    let lastMonthMedium = 0;
    let lastMonthHard = 0;
    let lastMonthTotal = 0;
    let lastMonthScore = 0;

    const platformBreakdown: Record<string, PlatformStatItem> = {};

    for (const pa of userAccounts) {
      if (pa.verifiedStatus !== "verified") continue;

      const platformSnaps = userSnaps
        .filter((s) => s.platformAccountId === pa.id || (s.platform === pa.platform && !s.platformAccountId))
        .sort((a, b) => a.date.localeCompare(b.date));

      const hasPositiveSnaps = platformSnaps.some((s) => s.totalSolved > 0);
      const validPlatformSnaps = hasPositiveSnaps
        ? platformSnaps.filter((s) => s.totalSolved > 0)
        : platformSnaps;

      const todaySnap = validPlatformSnaps.find((s) => s.date === currentDateUtc);
      const latestSnap = todaySnap || validPlatformSnaps[validPlatformSnaps.length - 1];

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

      // Parse submission calendar from latest available snapshot rawData
      let cal: Record<string, number> | null = null;
      if (latestSnap?.rawData) {
        try {
          const rawObj = typeof latestSnap.rawData === "string" ? JSON.parse(latestSnap.rawData) : latestSnap.rawData;
          cal = rawObj?.activityByDate || parseSubmissionCalendar(rawObj?.submissionCalendarRaw || rawObj?.submissionCalendar);
        } catch (e) {}
      }

      const totalS = latestSnap?.totalSolved || 0;
      const ratioEasy = totalS > 0 ? (latestSnap?.problemsSolvedEasy || 0) / totalS : 0.4;
      const ratioMed = totalS > 0 ? (latestSnap?.problemsSolvedMedium || 0) / totalS : 0.5;

      const getDailyStats = (dateStr: string) => {
        const targetSnap = validPlatformSnaps.find((s) => s.date === dateStr);
        const prevSnap = validPlatformSnaps
          .filter((s) => s.date < dateStr)
          .sort((a, b) => b.date.localeCompare(a.date))[0];

        let easy = 0, med = 0, hard = 0, total = 0;
        if (targetSnap && prevSnap) {
          easy = Math.max(0, targetSnap.problemsSolvedEasy - prevSnap.problemsSolvedEasy);
          med = Math.max(0, targetSnap.problemsSolvedMedium - prevSnap.problemsSolvedMedium);
          hard = Math.max(0, targetSnap.problemsSolvedHard - prevSnap.problemsSolvedHard);
          total = Math.max(0, targetSnap.totalSolved - prevSnap.totalSolved);
        }

        if (total === 0 && cal && cal[dateStr] > 0) {
          total = Number(cal[dateStr]);
          easy = Math.round(total * ratioEasy);
          med = Math.round(total * ratioMed);
          hard = Math.max(0, total - easy - med);
        }

        const score = easy * 1 + med * 3 + hard * 5;
        return { easy, med, hard, total, score };
      };

      // Today
      const todayStat = getDailyStats(currentDateUtc);
      const pTodayEasy = todayStat.easy;
      const pTodayMedium = todayStat.med;
      const pTodayHard = todayStat.hard;
      const pTodayTotal = todayStat.total;
      const pTodayScore = todayStat.score;

      todayEasy += pTodayEasy;
      todayMedium += pTodayMedium;
      todayHard += pTodayHard;
      todayTotal += pTodayTotal;
      todayScore += pTodayScore;

      // 7 Days
      let pSevenDaysEasy = 0, pSevenDaysMed = 0, pSevenDaysHard = 0, pSevenDaysTotal = 0, pSevenDaysScore = 0;
      for (const ds of last7Days) {
        const s = getDailyStats(ds);
        pSevenDaysEasy += s.easy;
        pSevenDaysMed += s.med;
        pSevenDaysHard += s.hard;
        pSevenDaysTotal += s.total;
        pSevenDaysScore += s.score;
      }
      sevenDaysEasy += pSevenDaysEasy;
      sevenDaysMedium += pSevenDaysMed;
      sevenDaysHard += pSevenDaysHard;
      sevenDaysTotal += pSevenDaysTotal;
      sevenDaysScore += pSevenDaysScore;

      // This Month
      let pThisMonthEasy = 0, pThisMonthMed = 0, pThisMonthHard = 0, pThisMonthTotal = 0, pThisMonthScore = 0;
      for (const ds of thisMonthDays) {
        const s = getDailyStats(ds);
        pThisMonthEasy += s.easy;
        pThisMonthMed += s.med;
        pThisMonthHard += s.hard;
        pThisMonthTotal += s.total;
        pThisMonthScore += s.score;
      }
      thisMonthEasy += pThisMonthEasy;
      thisMonthMedium += pThisMonthMed;
      thisMonthHard += pThisMonthHard;
      thisMonthTotal += pThisMonthTotal;
      thisMonthScore += pThisMonthScore;

      // Last Month
      let pLastMonthEasy = 0, pLastMonthMed = 0, pLastMonthHard = 0, pLastMonthTotal = 0, pLastMonthScore = 0;
      for (const ds of lastMonthDays) {
        const s = getDailyStats(ds);
        pLastMonthEasy += s.easy;
        pLastMonthMed += s.med;
        pLastMonthHard += s.hard;
        pLastMonthTotal += s.total;
        pLastMonthScore += s.score;
      }
      lastMonthEasy += pLastMonthEasy;
      lastMonthMedium += pLastMonthMed;
      lastMonthHard += pLastMonthHard;
      lastMonthTotal += pLastMonthTotal;
      lastMonthScore += pLastMonthScore;

      platformBreakdown[pa.platform] = {
        todayEasy: pTodayEasy,
        todayMedium: pTodayMedium,
        todayHard: pTodayHard,
        todayTotal: pTodayTotal,
        todayScore: pTodayScore,

        sevenDaysEasy: pSevenDaysEasy,
        sevenDaysMedium: pSevenDaysMed,
        sevenDaysHard: pSevenDaysHard,
        sevenDaysTotal: pSevenDaysTotal,
        sevenDaysScore: pSevenDaysScore,

        thisMonthEasy: pThisMonthEasy,
        thisMonthMedium: pThisMonthMed,
        thisMonthHard: pThisMonthHard,
        thisMonthTotal: pThisMonthTotal,
        thisMonthScore: pThisMonthScore,

        lastMonthEasy: pLastMonthEasy,
        lastMonthMedium: pLastMonthMed,
        lastMonthHard: pLastMonthHard,
        lastMonthTotal: pLastMonthTotal,
        lastMonthScore: pLastMonthScore,

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
      isPro: false,
      githubHandle: (!isAnon && u.githubHandle && u.showGithub !== 0) ? u.githubHandle : null,
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
      sevenDaysEasy,
      sevenDaysMedium,
      sevenDaysHard,
      sevenDaysTotal,
      sevenDaysScore,
      thisMonthEasy,
      thisMonthMedium,
      thisMonthHard,
      thisMonthTotal,
      thisMonthScore,
      lastMonthEasy,
      lastMonthMedium,
      lastMonthHard,
      lastMonthTotal,
      lastMonthScore,
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

  // Rank 7-Day Solved
  const sevenDays = [...verifiedEntries]
    .sort((a, b) => b.sevenDaysScore - a.sevenDaysScore || b.sevenDaysTotal - a.sevenDaysTotal)
    .map((e, idx) => ({ ...e, sevenDaysRank: idx + 1 }));

  // Rank This Month
  const thisMonth = [...verifiedEntries]
    .sort((a, b) => b.thisMonthScore - a.thisMonthScore || b.thisMonthTotal - a.thisMonthTotal)
    .map((e, idx) => ({ ...e, thisMonthRank: idx + 1 }));

  // Rank Last Month
  const lastMonth = [...verifiedEntries]
    .sort((a, b) => b.lastMonthScore - a.lastMonthScore || b.lastMonthTotal - a.lastMonthTotal)
    .map((e, idx) => ({ ...e, lastMonthRank: idx + 1 }));

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
    sevenDays,
    thisMonth,
    lastMonth,
    allTime,
    streaks: streakLeaderboard,
  };

  cachedLeaderboard = {
    data: result,
    date: currentDateUtc,
    expiresAt: Date.now() + 30_000,
  };

  return result;
}

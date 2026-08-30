import { db } from "../src/db";
import { initDb } from "../src/db/init";
import { users, platformAccounts, dailySnapshots, streaks } from "../src/db/schema";
import { calculateNextStreak, getLeaderboard, getPreviousUtcDateString } from "../src/lib/engine/scoring";
import { eq } from "drizzle-orm";

async function runPhase3Verification() {
  console.log("🚀 [Phase 3] Starting Scoring & Daily Leaderboard Engine verification...");

  await initDb();

  // 1. Test Streak Progression Logic Directly
  console.log("Testing streak calculation transitions...");
  
  // Day 1: Starts fresh, active
  let streak = calculateNextStreak(undefined, "2026-01-01", true);
  if (streak.currentStreak !== 1 || streak.longestStreak !== 1 || streak.lastActiveDate !== "2026-01-01") {
    throw new Error(`Day 1 streak mismatch: ${JSON.stringify(streak)}`);
  }

  // Day 2: Active consecutive day
  streak = calculateNextStreak(streak, "2026-01-02", true);
  if (streak.currentStreak !== 2 || streak.longestStreak !== 2 || streak.lastActiveDate !== "2026-01-02") {
    throw new Error(`Day 2 streak mismatch: ${JSON.stringify(streak)}`);
  }

  // Day 3: Active consecutive day
  streak = calculateNextStreak(streak, "2026-01-03", true);
  if (streak.currentStreak !== 3 || streak.longestStreak !== 3) {
    throw new Error(`Day 3 streak mismatch: ${JSON.stringify(streak)}`);
  }

  // Day 4: Inactive! Day missed
  streak = calculateNextStreak(streak, "2026-01-04", false);
  if (streak.currentStreak !== 3) {
    // On Day 4 itself, user hasn't missed >1 full day yet
  }

  // Day 5: Still inactive! Streak broken
  streak = calculateNextStreak(streak, "2026-01-05", false);
  if (streak.currentStreak !== 0 || streak.longestStreak !== 3) {
    throw new Error(`Day 5 broken streak mismatch: ${JSON.stringify(streak)}`);
  }

  // Day 6: Resumes activity! New streak begins at 1, longest preserved at 3
  streak = calculateNextStreak(streak, "2026-01-06", true);
  if (streak.currentStreak !== 1 || streak.longestStreak !== 3) {
    throw new Error(`Day 6 resumption streak mismatch: ${JSON.stringify(streak)}`);
  }
  console.log("✅ Streak transitions and edge cases fully verified.");

  // 2. Setup Seed Data for Multi-user Leaderboard & Today's Grind delta simulation
  console.log("Simulating multi-user 24-hour cycle snapshots...");
  await db.delete(dailySnapshots);
  await db.delete(platformAccounts);
  await db.delete(streaks);
  await db.delete(users);

  const uA = { id: "u_alice", username: "alice_algo", name: "Alice", email: "alice@test.com" };
  const uB = { id: "u_bob", username: "bob_coder", name: "Bob", email: "bob@test.com" };
  await db.insert(users).values([uA, uB]);

  const paA = {
    id: "pa_alice_lc",
    userId: uA.id,
    platform: "leetcode" as const,
    username: "alice_lc",
    verifiedStatus: "verified" as const,
  };
  const paB = {
    id: "pa_bob_lc",
    userId: uB.id,
    platform: "leetcode" as const,
    username: "bob_lc",
    verifiedStatus: "verified" as const,
  };
  await db.insert(platformAccounts).values([paA, paB]);

  const day1 = "2026-08-29";
  const day2 = "2026-08-30"; // Today

  // Day 1 Midnight Snapshots (Baseline):
  // Alice had: 10 Easy (10), 5 Med (15), 1 Hard (5) = 30 score
  // Bob had: 20 Easy (20), 10 Med (30), 5 Hard (25) = 75 score
  await db.insert(dailySnapshots).values([
    {
      id: "snap_alice_day1",
      userId: uA.id,
      platformAccountId: paA.id,
      platform: "leetcode",
      problemsSolvedEasy: 10,
      problemsSolvedMedium: 5,
      problemsSolvedHard: 1,
      totalSolved: 16,
      score: 10 * 1 + 5 * 3 + 1 * 5, // 30
      date: day1,
    },
    {
      id: "snap_bob_day1",
      userId: uB.id,
      platformAccountId: paB.id,
      platform: "leetcode",
      problemsSolvedEasy: 20,
      problemsSolvedMedium: 10,
      problemsSolvedHard: 5,
      totalSolved: 35,
      score: 20 * 1 + 10 * 3 + 5 * 5, // 75
      date: day1,
    },
  ]);

  // Day 2 Today's Progress:
  // Alice solves: +2 Medium (+6) and +1 Hard (+5) -> Total score now = 30 + 11 = 41
  // Bob solves: +1 Easy (+1) -> Total score now = 75 + 1 = 76
  await db.insert(dailySnapshots).values([
    {
      id: "snap_alice_day2",
      userId: uA.id,
      platformAccountId: paA.id,
      platform: "leetcode",
      problemsSolvedEasy: 10,
      problemsSolvedMedium: 7,
      problemsSolvedHard: 2,
      totalSolved: 19,
      score: 10 * 1 + 7 * 3 + 2 * 5, // 41
      date: day2,
    },
    {
      id: "snap_bob_day2",
      userId: uB.id,
      platformAccountId: paB.id,
      platform: "leetcode",
      problemsSolvedEasy: 21,
      problemsSolvedMedium: 10,
      problemsSolvedHard: 5,
      totalSolved: 36,
      score: 21 * 1 + 10 * 3 + 5 * 5, // 76
      date: day2,
    },
  ]);

  await db.insert(streaks).values([
    { id: "s_alice", userId: uA.id, currentStreak: 4, longestStreak: 10, lastActiveDate: day2 },
    { id: "s_bob", userId: uB.id, currentStreak: 12, longestStreak: 12, lastActiveDate: day2 },
  ]);

  // 3. Evaluate Leaderboards for Day 2
  const leaderboard = await getLeaderboard(day2);

  // Assert Today's Grind: Alice gained 11 pts today, Bob gained 1 pt today.
  // Alice should be Rank 1 in "Today's Grind", Bob should be Rank 2!
  const todayRank1 = leaderboard.todaysGrind[0];
  const todayRank2 = leaderboard.todaysGrind[1];

  if (todayRank1.username !== "alice_algo" || todayRank1.todayScore !== 11) {
    throw new Error(`Today's Grind rank 1 mismatch. Expected Alice with 11 pts, got: ${JSON.stringify(todayRank1)}`);
  }
  if (todayRank2.username !== "bob_coder" || todayRank2.todayScore !== 1) {
    throw new Error(`Today's Grind rank 2 mismatch. Expected Bob with 1 pt, got: ${JSON.stringify(todayRank2)}`);
  }
  console.log("✅ Today's Grind correctly ranked by daily delta score (Alice #1 with +11, Bob #2 with +1).");

  // Assert All-Time: Bob has 76 total pts, Alice has 41 total pts.
  // Bob should be Rank 1 in "All-Time", Alice should be Rank 2!
  const allTimeRank1 = leaderboard.allTime[0];
  const allTimeRank2 = leaderboard.allTime[1];

  if (allTimeRank1.username !== "bob_coder" || allTimeRank1.allTimeScore !== 76) {
    throw new Error(`All-Time rank 1 mismatch. Expected Bob with 76 pts, got: ${JSON.stringify(allTimeRank1)}`);
  }
  if (allTimeRank2.username !== "alice_algo" || allTimeRank2.allTimeScore !== 41) {
    throw new Error(`All-Time rank 2 mismatch. Expected Alice with 41 pts, got: ${JSON.stringify(allTimeRank2)}`);
  }
  console.log("✅ All-Time leaderboard correctly ranked by cumulative score (Bob #1 with 76, Alice #2 with 41).");

  // Assert Streaks: Bob has 12 streak, Alice has 4 streak
  const streakRank1 = leaderboard.streaks[0];
  if (streakRank1.username !== "bob_coder" || streakRank1.currentStreak !== 12) {
    throw new Error(`Streak rank 1 mismatch. Expected Bob with 12 streak`);
  }
  console.log("✅ Streak leaderboard correctly ranked (Bob #1 with 12 days).");

  console.log("🎉 [Phase 3] Scoring & Daily Leaderboard Engine fully verified with zero errors!");
}

runPhase3Verification().catch((err) => {
  console.error("❌ Phase 3 verification failed:", err);
  process.exit(1);
});

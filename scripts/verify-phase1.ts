import { db } from "../src/db";
import { initDb } from "../src/db/init";
import { users, platformAccounts, dailySnapshots, streaks } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function runPhase1Verification() {
  console.log("🚀 [Phase 1] Starting DB Schema & Client verification...");

  // 1. Initialize tables
  await initDb();
  console.log("✅ Tables initialized.");

  // Clear previous test records
  await db.delete(dailySnapshots);
  await db.delete(platformAccounts);
  await db.delete(streaks);
  await db.delete(users);

  // 2. Seed 2 dummy users
  const user1 = {
    id: "user_test_tourist",
    username: "tourist_fan",
    email: "tourist@example.com",
    name: "Gennady Fan",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=tourist",
  };

  const user2 = {
    id: "user_test_neal",
    username: "neal_wu_fan",
    email: "neal@example.com",
    name: "Neal Wu Enthusiast",
    avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=neal",
  };

  await db.insert(users).values([user1, user2]);
  console.log("✅ Seeded 2 users:", user1.username, user2.username);

  // 3. Insert platform accounts
  const pa1 = {
    id: "pa_1",
    userId: user1.id,
    platform: "leetcode" as const,
    username: "tourist_lc",
    verifiedStatus: "verified" as const,
    verificationToken: "dsamrr_1111-2222-3333",
    verifiedAt: new Date().toISOString(),
  };

  const pa2 = {
    id: "pa_2",
    userId: user2.id,
    platform: "codeforces" as const,
    username: "neal_cf",
    verifiedStatus: "pending" as const,
    verificationToken: "dsamrr_4444-5555-6666",
  };

  await db.insert(platformAccounts).values([pa1, pa2]);
  console.log("✅ Seeded 2 platform accounts.");

  // 4. Insert daily snapshots
  const today = new Date().toISOString().split("T")[0];
  const snap1 = {
    id: "snap_1",
    userId: user1.id,
    platformAccountId: pa1.id,
    platform: "leetcode" as const,
    problemsSolvedEasy: 50,
    problemsSolvedMedium: 30,
    problemsSolvedHard: 10,
    totalSolved: 90,
    score: 50 * 1 + 30 * 3 + 10 * 5, // 50 + 90 + 50 = 190
    date: today,
  };

  await db.insert(dailySnapshots).values([snap1]);
  console.log("✅ Seeded daily snapshot for user1 with score:", snap1.score);

  // 5. Insert streaks
  await db.insert(streaks).values({
    id: "streak_1",
    userId: user1.id,
    currentStreak: 5,
    longestStreak: 12,
    lastActiveDate: today,
  });
  console.log("✅ Seeded streaks for user1.");

  // 6. Query and assert
  const queriedUsers = await db.select().from(users);
  if (queriedUsers.length !== 2) {
    throw new Error(`Expected 2 users, got ${queriedUsers.length}`);
  }

  const queriedPa = await db.select().from(platformAccounts).where(eq(platformAccounts.userId, user1.id));
  if (queriedPa.length !== 1 || queriedPa[0].platform !== "leetcode") {
    throw new Error(`Platform account query mismatch`);
  }

  const queriedSnapshots = await db.select().from(dailySnapshots).where(eq(dailySnapshots.userId, user1.id));
  if (queriedSnapshots.length !== 1 || queriedSnapshots[0].score !== 190) {
    throw new Error(`Daily snapshot query mismatch, expected score 190, got ${queriedSnapshots[0]?.score}`);
  }

  const queriedStreak = await db.select().from(streaks).where(eq(streaks.userId, user1.id));
  if (queriedStreak.length !== 1 || queriedStreak[0].currentStreak !== 5) {
    throw new Error(`Streak query mismatch`);
  }

  console.log("🎉 [Phase 1] DB Schema & Client fully verified with zero errors!");
}

runPhase1Verification().catch((err) => {
  console.error("❌ Phase 1 verification failed:", err);
  process.exit(1);
});

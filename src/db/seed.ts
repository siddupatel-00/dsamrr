import { db, client } from "./index";
import { initDb } from "./init";
import { users, platformAccounts, dailySnapshots, streaks } from "./schema";

export async function seedLocalDb() {
  await initDb();
  console.log("Seeding local temporary database (local.db)...");

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const mockUsers = [
    {
      id: "usr_siddu",
      username: "siddu",
      name: "Siddu",
      email: "siddu@gmail.com",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=siddu",
      platforms: [
        { platform: "leetcode" as const, username: "chiddoo", solved: 18, score: 69, easy: 6, med: 21, hard: 0 },
        { platform: "geeksforgeeks" as const, username: "siddusurwpbk", solved: 12, score: 36, easy: 4, med: 8, hard: 0 },
        { platform: "hackerrank" as const, username: "siddusurwpbk", solved: 8, score: 20, easy: 5, med: 3, hard: 0 },
      ],
      streak: 7,
    },
    {
      id: "usr_alex",
      username: "alex_dev",
      name: "Alex Morgan",
      email: "alex@example.com",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=alex_dev",
      platforms: [
        { platform: "leetcode" as const, username: "alex_lc", solved: 15, score: 55, easy: 5, med: 10, hard: 2 },
        { platform: "codeforces" as const, username: "tourist_fan", solved: 6, score: 30, easy: 0, med: 5, hard: 3 },
      ],
      streak: 14,
    },
    {
      id: "usr_priya",
      username: "priya_algo",
      name: "Priya Sharma",
      email: "priya@example.com",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=priya_algo",
      platforms: [
        { platform: "codechef" as const, username: "priya_cc", solved: 10, score: 40, easy: 2, med: 6, hard: 2 },
        { platform: "atcoder" as const, username: "priya_ac", solved: 5, score: 25, easy: 1, med: 3, hard: 3 },
      ],
      streak: 9,
    },
  ];

  for (const u of mockUsers) {
    // 1. Insert user
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, username, email, name, avatar_url) VALUES (?, ?, ?, ?, ?)`,
      args: [u.id, u.username, u.email, u.name, u.avatarUrl],
    });

    // 2. Insert streak
    await client.execute({
      sql: `INSERT OR REPLACE INTO streaks (id, user_id, current_streak, longest_streak, last_active_date) VALUES (?, ?, ?, ?, ?)`,
      args: [`str_${u.id}`, u.id, u.streak, u.streak + 5, today],
    });

    for (const p of u.platforms) {
      const paId = `pa_${u.id}_${p.platform}`;
      await client.execute({
        sql: `INSERT OR REPLACE INTO platform_accounts (id, user_id, platform, username, verified_status) VALUES (?, ?, ?, ?, 'verified')`,
        args: [paId, u.id, p.platform, p.username],
      });

      // Yesterday baseline
      await client.execute({
        sql: `INSERT OR REPLACE INTO daily_snapshots (id, user_id, platform_account_id, platform, problems_solved_easy, problems_solved_medium, problems_solved_hard, total_solved, score, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [`snap_y_${paId}`, u.id, paId, p.platform, 0, 0, 0, 0, 0, yesterday],
      });

      // Today snapshot
      await client.execute({
        sql: `INSERT OR REPLACE INTO daily_snapshots (id, user_id, platform_account_id, platform, problems_solved_easy, problems_solved_medium, problems_solved_hard, total_solved, score, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [`snap_t_${paId}`, u.id, paId, p.platform, p.easy, p.med, p.hard, p.solved, p.score, today],
      });
    }
  }

  console.log("Local database seeded successfully with mock verified developers!");
}

seedLocalDb().catch(console.error);

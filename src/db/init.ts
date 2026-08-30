import { client } from "./index";

let isInitialized = false;
let initPromise: Promise<void> | null = null;

export async function initDb(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Execute fast batch schema migrations in a single round-trip
      await client.batch([
        `PRAGMA foreign_keys = ON;`,
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          email TEXT UNIQUE,
          password_hash TEXT,
          name TEXT,
          avatar_url TEXT,
          is_anonymous INTEGER NOT NULL DEFAULT 0,
          twitter_handle TEXT,
          instagram_handle TEXT,
          linkedin_handle TEXT,
          github_handle TEXT,
          show_twitter INTEGER NOT NULL DEFAULT 1,
          show_instagram INTEGER NOT NULL DEFAULT 1,
          show_linkedin INTEGER NOT NULL DEFAULT 1,
          show_github INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
          updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        );`,
        `CREATE TABLE IF NOT EXISTS platform_accounts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          platform TEXT NOT NULL,
          username TEXT NOT NULL,
          verified_status TEXT NOT NULL DEFAULT 'unverified',
          is_visible INTEGER NOT NULL DEFAULT 1,
          verification_token TEXT,
          verified_at TEXT,
          created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
          updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        );`,
        `CREATE TABLE IF NOT EXISTS daily_snapshots (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          platform_account_id TEXT REFERENCES platform_accounts(id) ON DELETE CASCADE,
          platform TEXT NOT NULL,
          problems_solved_easy INTEGER NOT NULL DEFAULT 0,
          problems_solved_medium INTEGER NOT NULL DEFAULT 0,
          problems_solved_hard INTEGER NOT NULL DEFAULT 0,
          total_solved INTEGER NOT NULL DEFAULT 0,
          score INTEGER NOT NULL DEFAULT 0,
          date TEXT NOT NULL,
          raw_data TEXT,
          created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        );`,
        `CREATE TABLE IF NOT EXISTS streaks (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          current_streak INTEGER NOT NULL DEFAULT 0,
          longest_streak INTEGER NOT NULL DEFAULT 0,
          last_active_date TEXT,
          updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        );`,
        `CREATE TABLE IF NOT EXISTS ads (
          id TEXT PRIMARY KEY,
          slot_id TEXT NOT NULL,
          name TEXT NOT NULL,
          tagline TEXT NOT NULL,
          target_url TEXT NOT NULL,
          image_url TEXT,
          advertiser_email TEXT,
          impressions INTEGER NOT NULL DEFAULT 0,
          clicks INTEGER NOT NULL DEFAULT 0,
          start_email_sent INTEGER NOT NULL DEFAULT 0,
          end_email_sent INTEGER NOT NULL DEFAULT 0,
          duration_days INTEGER NOT NULL,
          amount_paise INTEGER NOT NULL,
          payment_id TEXT,
          order_id TEXT,
          started_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        );`,
        `CREATE TABLE IF NOT EXISTS site_analytics (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          page_views INTEGER NOT NULL DEFAULT 0,
          unique_visitors INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        );`,
        `CREATE TABLE IF NOT EXISTS analytics_visitors (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        );`,
        `CREATE TABLE IF NOT EXISTS payment_orders (
          order_id TEXT PRIMARY KEY,
          slot_id TEXT NOT NULL,
          duration_days INTEGER NOT NULL,
          amount_paise INTEGER NOT NULL,
          is_prebook INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        );`,
        `CREATE TABLE IF NOT EXISTS verification_otps (
          email TEXT PRIMARY KEY,
          otp_code TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_sent_at INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        );`,
        `CREATE TABLE IF NOT EXISTS coupon_redemptions (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL,
          slot_id TEXT NOT NULL,
          advertiser_email TEXT,
          created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
        );`,
        `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`,
        `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
        `CREATE INDEX IF NOT EXISTS idx_platform_accounts_user ON platform_accounts(user_id);`,
        `CREATE INDEX IF NOT EXISTS idx_daily_snapshots_user_date ON daily_snapshots(user_id, date);`,
        `CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date ON daily_snapshots(date);`,
        `CREATE INDEX IF NOT EXISTS idx_streaks_user ON streaks(user_id);`,
        `CREATE INDEX IF NOT EXISTS idx_ads_expires ON ads(expires_at);`,
      ]);

      isInitialized = true;
    } catch (err) {
      console.error("InitDB batch note:", err);
      isInitialized = true; // prevent blocking subsequent requests
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

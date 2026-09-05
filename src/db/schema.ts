import { sqliteTable, text, integer, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql, InferSelectModel, relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  isAnonymous: integer("is_anonymous").default(0).notNull(),
  twitterHandle: text("twitter_handle"),
  instagramHandle: text("instagram_handle"),
  linkedinHandle: text("linkedin_handle"),
  githubHandle: text("github_handle"),
  showTwitter: integer("show_twitter").default(1).notNull(),
  showInstagram: integer("show_instagram").default(1).notNull(),
  showLinkedin: integer("show_linkedin").default(1).notNull(),
  showGithub: integer("show_github").default(1).notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const platformAccounts = sqliteTable("platform_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  platform: text("platform", {
    enum: ["leetcode", "codeforces", "geeksforgeeks", "hackerrank", "codechef", "atcoder"],
  }).notNull(),
  username: text("username").notNull(),
  verifiedStatus: text("verified_status", {
    enum: ["unverified", "pending", "verified"],
  })
    .default("unverified")
    .notNull(),
  isVisible: integer("is_visible").default(1).notNull(),
  verificationToken: text("verification_token"),
  verifiedAt: text("verified_at"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [uniqueIndex("platform_accounts_user_platform_unique").on(table.userId, table.platform)]);

export const dailySnapshots = sqliteTable("daily_snapshots", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  platformAccountId: text("platform_account_id")
    .notNull()
    .references(() => platformAccounts.id, { onDelete: "cascade" }),
  platform: text("platform", {
    enum: ["leetcode", "codeforces", "geeksforgeeks", "hackerrank", "codechef", "atcoder"],
  }).notNull(),
  problemsSolvedEasy: integer("problems_solved_easy").default(0).notNull(),
  problemsSolvedMedium: integer("problems_solved_medium").default(0).notNull(),
  problemsSolvedHard: integer("problems_solved_hard").default(0).notNull(),
  totalSolved: integer("total_solved").default(0).notNull(),
  score: integer("score").default(0).notNull(),
  date: text("date").notNull(), // Format: YYYY-MM-DD (UTC)
  rawData: text("raw_data"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [uniqueIndex("daily_snapshots_account_date_unique").on(table.platformAccountId, table.date)]);

export const streaks = sqliteTable("streaks", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  currentStreak: integer("current_streak").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
  lastActiveDate: text("last_active_date"), // Format: YYYY-MM-DD
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const ads = sqliteTable("ads", {
  id: text("id").primaryKey(),
  slotId: text("slot_id").notNull(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  targetUrl: text("target_url").notNull(),
  imageUrl: text("image_url"),
  advertiserEmail: text("advertiser_email"),
  impressions: integer("impressions").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  startEmailSent: integer("start_email_sent").default(0).notNull(),
  endEmailSent: integer("end_email_sent").default(0).notNull(),
  durationDays: integer("duration_days").notNull(), // 15 or 30
  amountPaise: integer("amount_paise").notNull(),
  paymentId: text("payment_id"),
  orderId: text("order_id"),
  startedAt: text("started_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  expiresAt: text("expires_at").notNull(), // ISO YYYY-MM-DD
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [uniqueIndex("ads_payment_id_unique").on(table.paymentId), index("ads_slot_dates_idx").on(table.slotId, table.startedAt, table.expiresAt)]);

export const siteAnalytics = sqliteTable("site_analytics", {
  id: text("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  pageViews: integer("page_views").default(0).notNull(),
  uniqueVisitors: integer("unique_visitors").default(0).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const analyticsVisitors = sqliteTable("analytics_visitors", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
}, (table) => [uniqueIndex("analytics_visitors_date_id_unique").on(table.date, table.id)]);

export const paymentOrders = sqliteTable("payment_orders", {
  orderId: text("order_id").primaryKey(),
  slotId: text("slot_id").notNull(),
  durationDays: integer("duration_days").notNull(),
  amountPaise: integer("amount_paise").notNull(),
  isPrebook: integer("is_prebook").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const verificationOtps = sqliteTable("verification_otps", {
  email: text("email").primaryKey(),
  otpCode: text("otp_code").notNull(),
  expiresAt: integer("expires_at").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  lastSentAt: integer("last_sent_at").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const couponRedemptions = sqliteTable("coupon_redemptions", {
  id: text("id").primaryKey(),
  code: text("code").notNull(),
  slotId: text("slot_id").notNull(),
  advertiserEmail: text("advertiser_email"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

export const visitorLocations = sqliteTable("visitor_locations", {
  id: text("id").primaryKey(),
  city: text("city"),
  country: text("country"),
  countryCode: text("country_code"),
  lat: integer("lat").notNull(),
  lng: integer("lng").notNull(),
  referrer: text("referrer"),
  visitCount: integer("visit_count").default(1).notNull(),
  lastVisitedAt: text("last_visited_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

// Explicit Drizzle Entity Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  platformAccounts: many(platformAccounts),
  dailySnapshots: many(dailySnapshots),
  streak: one(streaks, {
    fields: [users.id],
    references: [streaks.userId],
  }),
}));

export const platformAccountsRelations = relations(platformAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [platformAccounts.userId],
    references: [users.id],
  }),
  dailySnapshots: many(dailySnapshots),
}));

export const dailySnapshotsRelations = relations(dailySnapshots, ({ one }) => ({
  user: one(users, {
    fields: [dailySnapshots.userId],
    references: [users.id],
  }),
  platformAccount: one(platformAccounts, {
    fields: [dailySnapshots.platformAccountId],
    references: [platformAccounts.id],
  }),
}));

export const streaksRelations = relations(streaks, ({ one }) => ({
  user: one(users, {
    fields: [streaks.userId],
    references: [users.id],
  }),
}));

export type User = InferSelectModel<typeof users>;
export type PlatformAccount = InferSelectModel<typeof platformAccounts>;
export type DailySnapshot = InferSelectModel<typeof dailySnapshots>;
export type Streak = InferSelectModel<typeof streaks>;
export type AdRecord = InferSelectModel<typeof ads>;
export type SiteAnalytics = InferSelectModel<typeof siteAnalytics>;

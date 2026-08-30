import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { initDb } from "@/db/init";
import { users, platformAccounts, dailySnapshots, streaks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    await initDb();
    const { username } = params;

    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const accounts = await db
      .select()
      .from(platformAccounts)
      .where(eq(platformAccounts.userId, user.id));

    const snapshots = await db
      .select()
      .from(dailySnapshots)
      .where(eq(dailySnapshots.userId, user.id))
      .orderBy(desc(dailySnapshots.date));

    const [streak] = await db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, user.id));

    const isAnon = user.isAnonymous === 1;

    // Strict Data Leakage Prevention: NEVER expose email, verification tokens, or private anonymous handles
    const sanitizedUser = {
      id: isAnon ? `anon_${user.id.slice(-8)}` : user.id,
      username: isAnon ? "anonymous" : user.username,
      name: isAnon ? "Anonymous Coder" : (user.name || user.username),
      avatarUrl: isAnon ? "https://api.dicebear.com/7.x/bottts/svg?seed=anonymous" : user.avatarUrl,
      isAnonymous: isAnon,
      twitterHandle: isAnon ? null : user.twitterHandle,
      instagramHandle: isAnon ? null : user.instagramHandle,
      linkedinHandle: isAnon ? null : user.linkedinHandle,
      githubHandle: isAnon ? null : user.githubHandle,
      showTwitter: isAnon ? 0 : user.showTwitter,
      showInstagram: isAnon ? 0 : user.showInstagram,
      showLinkedin: isAnon ? 0 : user.showLinkedin,
      showGithub: isAnon ? 0 : user.showGithub,
      createdAt: user.createdAt,
    };

    const sanitizedAccounts = accounts
      .filter((a) => a.isVisible !== 0 && a.verifiedStatus === "verified")
      .map((a) => ({
        id: a.id,
        platform: a.platform,
        username: isAnon ? "••••••••" : a.username,
        verifiedStatus: a.verifiedStatus,
        verifiedAt: a.verifiedAt,
      }));
    const publicAccountIds = new Set(sanitizedAccounts.map((account) => account.id));

    return NextResponse.json({
      success: true,
      user: sanitizedUser,
      accounts: sanitizedAccounts,
      snapshots: snapshots.filter((s) => publicAccountIds.has(s.platformAccountId)).map((s) => ({
        id: s.id,
        platform: s.platform,
        problemsSolvedEasy: s.problemsSolvedEasy,
        problemsSolvedMedium: s.problemsSolvedMedium,
        problemsSolvedHard: s.problemsSolvedHard,
        totalSolved: s.totalSolved,
        date: s.date,
      })),
      streak: streak
        ? { currentStreak: streak.currentStreak, longestStreak: streak.longestStreak, lastActiveDate: streak.lastActiveDate }
        : { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

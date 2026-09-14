import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { initDb } from "@/db/init";
import { db, client } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchGitHubStats } from "@/lib/platforms/github";
import { invalidateLeaderboardCache } from "@/lib/engine/scoring";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;

    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id));
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const handle = (body.githubHandle || user.githubHandle || "").trim().replace(/^@/, "");

    if (!handle) {
      return NextResponse.json({ success: false, error: "No GitHub handle provided" }, { status: 400 });
    }

    const stats = await fetchGitHubStats(handle);
    if (!stats) {
      return NextResponse.json({ success: false, error: `Could not fetch stats for GitHub user @${handle}` }, { status: 404 });
    }

    await client.execute({
      sql: `UPDATE users SET github_handle = ?, github_stats = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [handle, JSON.stringify(stats), user.id],
    });

    invalidateLeaderboardCache();

    return NextResponse.json({
      success: true,
      stats,
      message: "GitHub profile synced successfully!",
    });
  } catch (err: any) {
    console.error("sync-github error:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to sync GitHub" }, { status: 500 });
  }
}

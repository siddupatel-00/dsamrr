import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { initDb } from "@/db/init";
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

    const body = await req.json();
    const {
      twitterHandle,
      instagramHandle,
      linkedinHandle,
      githubHandle,
      showTwitter,
      showInstagram,
      showLinkedin,
      showGithub,
    } = body;

    const userEmail = sessionUser.email;
    const userId = sessionUser.id;

    const cleanGithub = githubHandle?.trim().replace(/^@/, "") || null;
    let githubStatsJson: string | null = null;
    if (cleanGithub) {
      const stats = await fetchGitHubStats(cleanGithub);
      if (stats) {
        githubStatsJson = JSON.stringify(stats);
      }
    }

    const updatePayload: any = {
      twitterHandle: twitterHandle?.trim() || null,
      instagramHandle: instagramHandle?.trim() || null,
      linkedinHandle: linkedinHandle?.trim() || null,
      githubHandle: cleanGithub,
      showTwitter: showTwitter === false ? 0 : 1,
      showInstagram: showInstagram === false ? 0 : 1,
      showLinkedin: showLinkedin === false ? 0 : 1,
      showGithub: showGithub === false ? 0 : 1,
      updatedAt: new Date().toISOString(),
    };

    if (githubStatsJson) {
      updatePayload.githubStats = githubStatsJson;
    }

    if (userEmail) {
      await db.update(users).set(updatePayload).where(eq(users.email, userEmail));
    } else if (userId) {
      await db.update(users).set(updatePayload).where(eq(users.id, userId));
    }

    invalidateLeaderboardCache();

    return NextResponse.json({
      success: true,
      message: "Social visibility settings updated successfully!",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

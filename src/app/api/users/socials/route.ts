import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { initDb } from "@/db/init";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    const updatePayload = {
      twitterHandle: twitterHandle?.trim() || null,
      instagramHandle: instagramHandle?.trim() || null,
      linkedinHandle: linkedinHandle?.trim() || null,
      githubHandle: githubHandle?.trim() || null,
      showTwitter: showTwitter === false ? 0 : 1,
      showInstagram: showInstagram === false ? 0 : 1,
      showLinkedin: showLinkedin === false ? 0 : 1,
      showGithub: showGithub === false ? 0 : 1,
      updatedAt: new Date().toISOString(),
    };

    if (userEmail) {
      await db.update(users).set(updatePayload).where(eq(users.email, userEmail));
    } else if (userId) {
      await db.update(users).set(updatePayload).where(eq(users.id, userId));
    }

    return NextResponse.json({
      success: true,
      message: "Social visibility settings updated successfully!",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

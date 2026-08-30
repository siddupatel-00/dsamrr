import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { initDb } from "@/db/init";
import { users, platformAccounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    await initDb();
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;

    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { platform, isVisible } = body;

    const currentEmail = sessionUser.email;
    const currentId = sessionUser.id;

    let [currentUser] = currentEmail
      ? await db.select().from(users).where(eq(users.email, currentEmail))
      : currentId
      ? await db.select().from(users).where(eq(users.id, currentId))
      : [];

    if (!currentUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    await db
      .update(platformAccounts)
      .set({
        isVisible: isVisible ? 1 : 0,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(platformAccounts.userId, currentUser.id),
          eq(platformAccounts.platform, platform)
        )
      );

    return NextResponse.json({
      success: true,
      message: `Updated visibility for ${platform}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

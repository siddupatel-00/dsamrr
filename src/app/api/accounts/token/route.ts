import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { initDb } from "@/db/init";
import { users, platformAccounts } from "@/db/schema";
import { generateVerificationToken } from "@/lib/platforms/verifier";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/requestAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();
    const { platform, handle } = body;

    const allowedPlatforms = ["leetcode", "codeforces", "geeksforgeeks", "hackerrank", "codechef", "atcoder"];
    const cleanHandle = typeof handle === "string" ? handle.trim() : "";
    if (!allowedPlatforms.includes(platform) || !cleanHandle || cleanHandle.length > 100) {
      return NextResponse.json(
        { error: "A valid platform and handle are required" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2. Anti-Takeover Security: Prevent User B from claiming User A's verified handle
    const existingHandleOwner = await db
      .select()
      .from(platformAccounts)
      .where(
        and(
          eq(platformAccounts.platform, platform),
          eq(platformAccounts.username, cleanHandle),
          eq(platformAccounts.verifiedStatus, "verified")
        )
      );

    if (existingHandleOwner.length > 0 && existingHandleOwner[0].userId !== user.id) {
      const [ownerUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, existingHandleOwner[0].userId));

      return NextResponse.json(
        {
          error: `The ${platform} handle '@${handle}' is already verified by user '@${ownerUser?.username || "another user"}'. You cannot link someone else's verified account.`,
        },
        { status: 403 }
      );
    }

    // 3. Check existing platform account for this user
    let [account] = await db
      .select()
      .from(platformAccounts)
      .where(
        and(
          eq(platformAccounts.userId, user.id),
          eq(platformAccounts.platform, platform as any)
        )
      );

    // 4. Check 14-day anti-fraud cooldown ONLY IF user is changing to a DIFFERENT handle
    if (account && account.verifiedStatus === "verified" && account.verifiedAt) {
      if (account.username.toLowerCase() !== cleanHandle.toLowerCase()) {
        const verifiedTime = new Date(account.verifiedAt).getTime();
        const diffDays = (Date.now() - verifiedTime) / (1000 * 60 * 60 * 24);
        if (diffDays < 14) {
          const daysLeft = Math.ceil(14 - diffDays);
          return NextResponse.json(
            {
              error: `Handle changes to a new username are locked for ${daysLeft} more days (14-day anti-fraud cooldown).`,
            },
            { status: 403 }
          );
        }
      }
    }

    const token = generateVerificationToken();

    if (account) {
      await db
        .update(platformAccounts)
        .set({
          username: cleanHandle,
          verificationToken: token,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(platformAccounts.id, account.id));
      [account] = await db.select().from(platformAccounts).where(eq(platformAccounts.id, account.id));
    } else {
      const accountId = `pa_${crypto.randomUUID()}`;
      await db.insert(platformAccounts).values({
        id: accountId,
        userId: user.id,
        platform: platform as any,
        username: cleanHandle,
        verifiedStatus: "pending",
        verificationToken: token,
      });
      [account] = await db.select().from(platformAccounts).where(eq(platformAccounts.id, accountId));
    }

    return NextResponse.json({
      success: true,
      account: account && { id: account.id, platform: account.platform, username: account.username, verifiedStatus: account.verifiedStatus },
      token,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

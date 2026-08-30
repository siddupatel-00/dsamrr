import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAccount } from "@/lib/platforms/verifier";
import { db } from "@/db";
import { platformAccounts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/requestAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { platformAccountId } = body;

    if (!platformAccountId) {
      return NextResponse.json(
        { error: "platformAccountId is required" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const [account] = await db.select().from(platformAccounts).where(and(eq(platformAccounts.id, platformAccountId), eq(platformAccounts.userId, user.id)));
    if (!account) return NextResponse.json({ error: "Platform account not found" }, { status: 404 });

    const result = await verifyPlatformAccount(platformAccountId);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

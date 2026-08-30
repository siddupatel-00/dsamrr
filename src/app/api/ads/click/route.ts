import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { initDb } from "@/db/init";
import { ads } from "@/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { STANDARD_AD_SLOTS } from "@/lib/adsData";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json().catch(() => ({}));
    const slotId = body.slotId || req.nextUrl.searchParams.get("slotId");

    if (!slotId) {
      return NextResponse.json({ success: false, error: "Missing slotId" }, { status: 400 });
    }
    const normalizedSlotId = String(slotId).trim();
    if (!STANDARD_AD_SLOTS.some((slot) => slot.id === normalizedSlotId)) {
      return NextResponse.json({ success: false, error: "Invalid slotId" }, { status: 400 });
    }
    const today = new Date().toISOString().split("T")[0];

    // Increment real visitor clicks in Turso DB
    await db
      .update(ads)
      .set({
        clicks: sql`${ads.clicks} + 1`,
      })
      .where(and(eq(ads.slotId, normalizedSlotId), lte(ads.startedAt, today), gte(ads.expiresAt, today)));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

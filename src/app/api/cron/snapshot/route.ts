import { NextRequest, NextResponse } from "next/server";
import { executeDailySnapshot } from "@/lib/engine/cron";
import { getUtcDateString } from "@/lib/engine/scoring";
import { requireCronAuthorization } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  const authorizationError = requireCronAuthorization(req);
  if (authorizationError) return authorizationError;

  const customDate = req.nextUrl.searchParams.get("date") || getUtcDateString();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(customDate)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  try {
    const result = await executeDailySnapshot(customDate);
    return NextResponse.json({
      success: true,
      message: `Daily snapshots executed successfully for ${customDate}`,
      data: result,
    });
  } catch (error: any) {
    console.error("Cron snapshot failed:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

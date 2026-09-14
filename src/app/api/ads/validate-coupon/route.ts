import { NextRequest, NextResponse } from "next/server";
import { client } from "@/db";
import { initDb } from "@/db/init";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();
    const cleanCode = (body.code || "").trim().toUpperCase();

    if (!cleanCode) {
      return NextResponse.json({ success: false, valid: false, error: "Please enter a coupon code" }, { status: 400 });
    }

    if (cleanCode === "FIRST3") {
      const redemptions = await client.execute(`SELECT COUNT(*) as count FROM coupon_redemptions WHERE code = 'FIRST3' AND slot_id LIKE 'pro-%'`);
      const used = Number(redemptions.rows[0]?.count || 0);

      if (used >= 3) {
        return NextResponse.json({
          success: false,
          valid: false,
          error: "Coupon code is not valid.",
        });
      }

      return NextResponse.json({
        success: true,
        valid: true,
        code: "FIRST3",
        discountPercent: 100,
        message: "Coupon FIRST3 applied (100% OFF)",
      });
    }

    if (cleanCode === "CLAUDE10") {
      const redemptions = await client.execute(`SELECT COUNT(*) as count FROM coupon_redemptions WHERE code = 'CLAUDE10' AND slot_id LIKE 'pro-%'`);
      const used = Number(redemptions.rows[0]?.count || 0);

      if (used >= 10) {
        return NextResponse.json({
          success: false,
          valid: false,
          error: "Coupon code is not valid.",
        });
      }

      return NextResponse.json({
        success: true,
        valid: true,
        code: "CLAUDE10",
        discountType: "custom_price",
        discountPercent: 50,
        price15: 1,
        price30: 1,
        message: "Coupon CLAUDE10 applied (₹1 Deal)",
      });
    }

    return NextResponse.json({
      success: false,
      valid: false,
      error: "Coupon code is not valid.",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, valid: false, error: err.message }, { status: 500 });
  }
}

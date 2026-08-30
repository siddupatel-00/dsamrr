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
      const redemptions = await client.execute(`SELECT COUNT(*) as count FROM coupon_redemptions WHERE code = 'FIRST3'`);
      const used = Number(redemptions.rows[0]?.count || 0);

      if (used >= 3) {
        return NextResponse.json({
          success: false,
          valid: false,
          error: "This coupon code has reached its maximum limit (3/3 used).",
        });
      }

      return NextResponse.json({
        success: true,
        valid: true,
        code: "FIRST3",
        discountPercent: 100,
        message: "🎉 Coupon FIRST3 Applied! 100% OFF (Free Slot)",
      });
    }

    if (cleanCode === "CLAUDE10") {
      const redemptions = await client.execute(`SELECT COUNT(*) as count FROM coupon_redemptions WHERE code = 'CLAUDE10'`);
      const used = Number(redemptions.rows[0]?.count || 0);

      if (used >= 7) {
        return NextResponse.json({
          success: false,
          valid: false,
          error: "Coupon CLAUDE10 has reached its maximum limit (7/7 used).",
        });
      }

      return NextResponse.json({
        success: true,
        valid: true,
        code: "CLAUDE10",
        discountType: "custom_price",
        discountPercent: 50,
        price15: 7,
        price30: 17,
        message: "🎉 Coupon CLAUDE10 Applied! 15d for ₹7 / 30d for ₹17",
      });
    }

    return NextResponse.json({
      success: false,
      valid: false,
      error: "Invalid coupon code.",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, valid: false, error: err.message }, { status: 500 });
  }
}

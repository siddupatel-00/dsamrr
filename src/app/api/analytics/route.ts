import { NextRequest, NextResponse } from "next/server";
import { db, client } from "@/db";
import { initDb } from "@/db/init";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await initDb();
    
    // Sum real total unique visitors recorded in database
    const result = await client.execute(`
      SELECT COALESCE(SUM(unique_visitors), 0) as total_visitors
      FROM site_analytics
    `);

    const totalVisitors = Number(result.rows[0]?.total_visitors || 0);

    return NextResponse.json({
      success: true,
      totalVisitors,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const today = new Date().toISOString().split("T")[0];
    const cookieName = "dsamrr_visitor";
    let visitorId = req.cookies.get(cookieName)?.value;
    let newVisitor = false;
    if (!visitorId || !/^[a-f0-9]{32}$/.test(visitorId)) {
      visitorId = crypto.randomBytes(16).toString("hex");
      newVisitor = true;
    }

    // Every request is a page view; a random first-party cookie is counted once per day.
    await client.execute({
      sql: `
        INSERT INTO site_analytics (id, date, page_views, unique_visitors)
        VALUES (?, ?, 1, 0)
        ON CONFLICT(id) DO UPDATE SET
          page_views = page_views + 1,
          unique_visitors = unique_visitors + 1,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [`analytics_${today}`, today],
    });

    const insertedVisitor = await client.execute({
      sql: `INSERT OR IGNORE INTO analytics_visitors (id, date) VALUES (?, ?)`,
      args: [`${today}_${visitorId}`, today],
    });
    if (insertedVisitor.rowsAffected > 0) {
      await client.execute({
        sql: `UPDATE site_analytics SET unique_visitors = unique_visitors + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [`analytics_${today}`],
      });
    }

    const result = await client.execute(`
      SELECT COALESCE(SUM(unique_visitors), 0) as total_visitors
      FROM site_analytics
    `);

    const totalVisitors = Number(result.rows[0]?.total_visitors || 0);

    const response = NextResponse.json({
      success: true,
      totalVisitors,
    });
    if (newVisitor) {
      response.cookies.set(cookieName, visitorId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }
    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

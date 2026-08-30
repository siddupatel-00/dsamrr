import { NextRequest, NextResponse } from "next/server";
import { client } from "@/db";
import { initDb } from "@/db/init";
import crypto from "crypto";

export const dynamic = "force-dynamic";

let cachedTotalVisitors: { count: number; expiresAt: number } | null = null;

export async function GET(req: NextRequest) {
  try {
    const now = Date.now();
    if (cachedTotalVisitors && cachedTotalVisitors.expiresAt > now) {
      return NextResponse.json(
        {
          success: true,
          totalVisitors: cachedTotalVisitors.count,
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=10, stale-while-revalidate=59",
          },
        }
      );
    }

    await initDb();
    const result = await client.execute(`
      SELECT COALESCE(SUM(unique_visitors), 0) as total_visitors
      FROM site_analytics
    `);

    const totalVisitors = Number(result.rows[0]?.total_visitors || 0);
    cachedTotalVisitors = {
      count: totalVisitors,
      expiresAt: now + 5000,
    };

    return NextResponse.json(
      {
        success: true,
        totalVisitors,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=59",
        },
      }
    );
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
    let newVisitorCookie = false;

    if (!visitorId || !/^[a-f0-9]{32}$/.test(visitorId)) {
      visitorId = crypto.randomBytes(16).toString("hex");
      newVisitorCookie = true;
    }

    // Execute atomic analytics tracking in one batch
    await client.execute({
      sql: `
        INSERT INTO site_analytics (id, date, page_views, unique_visitors)
        VALUES (?, ?, 1, 0)
        ON CONFLICT(id) DO UPDATE SET
          page_views = page_views + 1,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [`analytics_${today}`, today],
    });

    const visitorInsert = await client.execute({
      sql: `INSERT OR IGNORE INTO analytics_visitors (id, date) VALUES (?, ?)`,
      args: [`${today}_${visitorId}`, today],
    });

    if (visitorInsert.rowsAffected > 0) {
      await client.execute({
        sql: `UPDATE site_analytics SET unique_visitors = unique_visitors + 1 WHERE id = ?`,
        args: [`analytics_${today}`],
      });
    }

    const result = await client.execute(`
      SELECT COALESCE(SUM(unique_visitors), 0) as total_visitors
      FROM site_analytics
    `);

    const totalVisitors = Number(result.rows[0]?.total_visitors || 0);
    cachedTotalVisitors = {
      count: totalVisitors,
      expiresAt: Date.now() + 5000,
    };

    const response = NextResponse.json({
      success: true,
      totalVisitors,
    });

    if (newVisitorCookie) {
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

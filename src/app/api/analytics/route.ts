import { NextRequest, NextResponse } from "next/server";
import { client } from "@/db";
import { initDb } from "@/db/init";
import crypto from "crypto";

export const dynamic = "force-dynamic";

let cachedTotalVisitors: { count: number; expiresAt: number } | null = null;

function parseTrafficSource(rawRef?: string | null): string {
  if (!rawRef || rawRef.trim() === "") return "Direct / Bookmark";
  const ref = rawRef.toLowerCase();
  if (ref.includes("t.co") || ref.includes("x.com") || ref.includes("twitter.com")) return "X (Twitter)";
  if (ref.includes("reddit.com") || ref.includes("redd.it")) return "Reddit";
  if (ref.includes("youtube.com") || ref.includes("youtu.be")) return "YouTube";
  if (ref.includes("linkedin.com") || ref.includes("lnkd.in")) return "LinkedIn";
  if (ref.includes("google.")) return "Google Search";
  if (ref.includes("github.com")) return "GitHub";
  if (ref.includes("instagram.com")) return "Instagram";
  if (ref.includes("facebook.com")) return "Facebook";
  if (ref.includes("discord.com") || ref.includes("discord.gg")) return "Discord";
  try {
    const u = new URL(rawRef);
    return u.hostname.replace("www.", "");
  } catch {
    return "Other";
  }
}

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

    let clientReferrer = "";
    try {
      const body = await req.json();
      clientReferrer = body?.referrer || "";
    } catch {}

    const source = parseTrafficSource(clientReferrer || req.headers.get("referer"));

    // Geo coordinates from headers (Vercel Edge headers)
    const rawCountry = req.headers.get("x-vercel-ip-country") || "IN";
    const rawCity = req.headers.get("x-vercel-ip-city") || "Hyderabad";
    const rawLat = parseFloat(req.headers.get("x-vercel-ip-latitude") || "17.3850");
    const rawLng = parseFloat(req.headers.get("x-vercel-ip-longitude") || "78.4867");

    const lat = Math.round((isNaN(rawLat) ? 17.38 : rawLat) * 10) / 10;
    const lng = Math.round((isNaN(rawLng) ? 78.48 : rawLng) * 10) / 10;
    const city = decodeURIComponent(rawCity);
    const country = rawCountry;

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

      // Insert / increment visitor location marker in Turso DB
      const locId = `loc_${country}_${city.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      await client.execute({
        sql: `
          INSERT INTO visitor_locations (id, city, country, country_code, lat, lng, referrer, visit_count, last_visited_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            visit_count = visit_count + 1,
            last_visited_at = CURRENT_TIMESTAMP,
            referrer = excluded.referrer
        `,
        args: [locId, city, country, country, lat, lng, source],
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

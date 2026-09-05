import { NextRequest, NextResponse } from "next/server";
import { client } from "@/db";
import { initDb } from "@/db/init";

export const dynamic = "force-dynamic";

let cachedData: any = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5000; // 5 second cache

export async function GET(req: NextRequest) {
  try {
    const now = Date.now();
    if (cachedData && now - lastFetchTime < CACHE_TTL_MS) {
      return NextResponse.json(cachedData, {
        headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10" },
      });
    }

    await initDb();

    // 1. Fetch all visitor geolocation markers
    const locRes = await client.execute(`
      SELECT id, city, country, country_code, lat, lng, referrer, visit_count, last_visited_at
      FROM visitor_locations
      ORDER BY visit_count DESC
    `);

    // 2. Fetch traffic source breakdown
    const sourceRes = await client.execute(`
      SELECT COALESCE(referrer, 'Direct') as source, SUM(visit_count) as total_count
      FROM visitor_locations
      GROUP BY source
      ORDER BY total_count DESC
    `);

    // 3. Fetch total unique visitors count
    const totalRes = await client.execute(`
      SELECT COALESCE(SUM(unique_visitors), 0) as total_visitors
      FROM site_analytics
    `);

    const totalVisitors = Number(totalRes.rows[0]?.total_visitors || 0);

function getCountryName(code: string): string {
  if (!code || code === "Global" || code === "Unknown") return "Global";
  const trimmed = code.trim();
  if (trimmed.length === 2) {
    try {
      const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
      return regionNames.of(trimmed.toUpperCase()) || trimmed;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

    const locations = locRes.rows.map((r: any) => ({
      id: String(r.id),
      city: String(r.city || "Unknown"),
      country: getCountryName(String(r.country || r.country_code || "Global")),
      countryCode: String(r.country_code || r.country || "").toUpperCase(),
      lat: Number(r.lat || 0),
      lng: Number(r.lng || 0),
      visitCount: Number(r.visit_count || 1),
      referrer: String(r.referrer || "Direct"),
      lastVisitedAt: String(r.last_visited_at || ""),
    }));

    const totalLocationsSum = locations.reduce((sum, l) => sum + l.visitCount, 0) || 1;

    const sources = sourceRes.rows.map((s: any) => {
      const count = Number(s.total_count || 0);
      return {
        source: String(s.source),
        count,
        percentage: Math.round((count / totalLocationsSum) * 100),
      };
    });

    const uniqueCountries = new Set(locations.map((l) => l.country)).size;
    const uniqueCities = new Set(locations.map((l) => l.city)).size;

    cachedData = {
      success: true,
      totalVisitors: Math.max(totalVisitors, locations.length),
      uniqueCountries,
      uniqueCities,
      locations,
      sources,
    };
    lastFetchTime = now;

    return NextResponse.json(cachedData, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10" },
    });
  } catch (err: any) {
    if (cachedData) {
      return NextResponse.json(cachedData);
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

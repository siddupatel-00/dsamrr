import { NextRequest, NextResponse } from "next/server";
import { client } from "@/db";
import { initDb } from "@/db/init";

export const dynamic = "force-dynamic";

export interface TimeseriesPoint {
  label: string;
  timeKey: string;
  views: number;
  visitors: number;
}

export interface TimeseriesResponse {
  success: boolean;
  range: string;
  metricLabel: string;
  summary: {
    totalViews: number;
    totalVisitors: number;
    peakValue: number;
    peakLabel: string;
    avgValue: number;
  };
  points: TimeseriesPoint[];
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function GET(req: NextRequest) {
  try {
    await initDb();
    const url = req.nextUrl;
    const range = url.searchParams.get("range") || "today";
    const customStart = url.searchParams.get("startDate");
    const customEnd = url.searchParams.get("endDate");

    const now = new Date();
    const todayStr = formatDate(now);

    let points: TimeseriesPoint[] = [];
    let metricLabel = "Traffic Overview";

    switch (range) {
      case "1h": {
        metricLabel = "Past 1 Hour (5-Min Intervals)";
        // 12 buckets of 5 minutes
        const bucketCount = 12;
        const bucketMs = 5 * 60 * 1000;
        const endTime = now.getTime();
        const startTime = endTime - 60 * 60 * 1000;

        // Query pageviews in last 60 mins
        const isoStart = new Date(startTime).toISOString();
        let logs: any[] = [];
        try {
          const res = await client.execute({
            sql: `
              SELECT created_at, visitor_id
              FROM analytics_pageview_logs
              WHERE created_at >= ?
              ORDER BY created_at ASC
            `,
            args: [isoStart],
          });
          logs = res.rows;
        } catch {}

        for (let i = 0; i < bucketCount; i++) {
          const bStart = startTime + i * bucketMs;
          const bEnd = bStart + bucketMs;
          const bDate = new Date(bStart);
          const label = `${pad(bDate.getUTCHours())}:${pad(bDate.getUTCMinutes())}`;

          const bucketLogs = logs.filter((l) => {
            const t = new Date(String(l.created_at)).getTime();
            return t >= bStart && t < bEnd;
          });

          const uniqueV = new Set(bucketLogs.map((l) => l.visitor_id)).size;
          points.push({
            label,
            timeKey: new Date(bStart).toISOString(),
            views: bucketLogs.length,
            visitors: uniqueV,
          });
        }
        break;
      }

      case "24h": {
        metricLabel = "Past 24 Hours (Hourly)";
        const bucketCount = 24;
        const bucketMs = 60 * 60 * 1000;
        const currentHourStart = new Date(now).setUTCMinutes(0, 0, 0);
        const startTime = currentHourStart - 23 * bucketMs;

        const isoStart = new Date(startTime).toISOString();

        // 1. Fetch from pageview logs
        let logs: any[] = [];
        try {
          const res = await client.execute({
            sql: `SELECT created_at, visitor_id FROM analytics_pageview_logs WHERE created_at >= ?`,
            args: [isoStart],
          });
          logs = res.rows;
        } catch {}

        // 2. Fallback to analytics_visitors for historical data
        let visitorsFallback: any[] = [];
        try {
          const res = await client.execute({
            sql: `SELECT created_at, id FROM analytics_visitors WHERE created_at >= ?`,
            args: [isoStart],
          });
          visitorsFallback = res.rows;
        } catch {}

        for (let i = 0; i < bucketCount; i++) {
          const bStart = startTime + i * bucketMs;
          const bEnd = bStart + bucketMs;
          const bDate = new Date(bStart);
          const label = `${pad(bDate.getUTCHours())}:00`;

          const bucketLogs = logs.filter((l) => {
            const t = new Date(String(l.created_at)).getTime();
            return t >= bStart && t < bEnd;
          });

          const bucketVisitorsFallback = visitorsFallback.filter((v) => {
            const t = new Date(String(v.created_at)).getTime();
            return t >= bStart && t < bEnd;
          });

          const views = Math.max(bucketLogs.length, bucketVisitorsFallback.length);
          const uniqueV = bucketLogs.length > 0
            ? new Set(bucketLogs.map((l) => l.visitor_id)).size
            : bucketVisitorsFallback.length;

          points.push({
            label,
            timeKey: new Date(bStart).toISOString(),
            views,
            visitors: uniqueV,
          });
        }
        break;
      }

      case "today": {
        metricLabel = `Today (${todayStr})`;
        const currentHour = now.getUTCHours();
        const todayStartIso = `${todayStr}T00:00:00.000Z`;

        let logs: any[] = [];
        try {
          const res = await client.execute({
            sql: `SELECT created_at, visitor_id FROM analytics_pageview_logs WHERE date = ?`,
            args: [todayStr],
          });
          logs = res.rows;
        } catch {}

        let visitorsFallback: any[] = [];
        try {
          const res = await client.execute({
            sql: `SELECT created_at FROM analytics_visitors WHERE date = ?`,
            args: [todayStr],
          });
          visitorsFallback = res.rows;
        } catch {}

        // Also get today's total from site_analytics to scale if needed
        const siteStatRes = await client.execute({
          sql: `SELECT page_views, unique_visitors FROM site_analytics WHERE date = ?`,
          args: [todayStr],
        });
        const siteRow = siteStatRes.rows[0] as any;
        const totalViewsToday = Number(siteRow?.page_views || 0);
        const totalVisitorsToday = Number(siteRow?.unique_visitors || 0);

        for (let h = 0; h <= 23; h++) {
          const hourLabel = `${pad(h)}:00`;
          const isFuture = h > currentHour;

          if (isFuture) {
            points.push({
              label: hourLabel,
              timeKey: `${todayStr}T${pad(h)}:00:00.000Z`,
              views: 0,
              visitors: 0,
            });
            continue;
          }

          const bucketLogs = logs.filter((l) => {
            const d = new Date(String(l.created_at));
            return d.getUTCHours() === h;
          });

          const bucketFallback = visitorsFallback.filter((v) => {
            const d = new Date(String(v.created_at));
            return d.getUTCHours() === h;
          });

          let views = bucketLogs.length;
          let visitors = new Set(bucketLogs.map((l) => l.visitor_id)).size;

          if (views === 0 && bucketFallback.length > 0) {
            visitors = bucketFallback.length;
            views = Math.round((totalViewsToday / Math.max(1, totalVisitorsToday)) * visitors);
          }

          points.push({
            label: hourLabel,
            timeKey: `${todayStr}T${pad(h)}:00:00.000Z`,
            views,
            visitors,
          });
        }
        break;
      }

      case "yesterday": {
        const yDate = new Date(now);
        yDate.setUTCDate(yDate.getUTCDate() - 1);
        const yDateStr = formatDate(yDate);
        metricLabel = `Yesterday (${yDateStr})`;

        let logs: any[] = [];
        try {
          const res = await client.execute({
            sql: `SELECT created_at, visitor_id FROM analytics_pageview_logs WHERE date = ?`,
            args: [yDateStr],
          });
          logs = res.rows;
        } catch {}

        let visitorsFallback: any[] = [];
        try {
          const res = await client.execute({
            sql: `SELECT created_at FROM analytics_visitors WHERE date = ?`,
            args: [yDateStr],
          });
          visitorsFallback = res.rows;
        } catch {}

        const siteStatRes = await client.execute({
          sql: `SELECT page_views, unique_visitors FROM site_analytics WHERE date = ?`,
          args: [yDateStr],
        });
        const siteRow = siteStatRes.rows[0] as any;
        const totalViewsYesterday = Number(siteRow?.page_views || 0);
        const totalVisitorsYesterday = Number(siteRow?.unique_visitors || 0);

        for (let h = 0; h <= 23; h++) {
          const hourLabel = `${pad(h)}:00`;
          const bucketLogs = logs.filter((l) => {
            const d = new Date(String(l.created_at));
            return d.getUTCHours() === h;
          });

          const bucketFallback = visitorsFallback.filter((v) => {
            const d = new Date(String(v.created_at));
            return d.getUTCHours() === h;
          });

          let views = bucketLogs.length;
          let visitors = new Set(bucketLogs.map((l) => l.visitor_id)).size;

          if (views === 0 && bucketFallback.length > 0) {
            visitors = bucketFallback.length;
            views = Math.round((totalViewsYesterday / Math.max(1, totalVisitorsYesterday)) * visitors);
          }

          points.push({
            label: hourLabel,
            timeKey: `${yDateStr}T${pad(h)}:00:00.000Z`,
            views,
            visitors,
          });
        }
        break;
      }

      case "7d":
      case "last7Days": {
        metricLabel = "Last 7 Days";
        const dateList: string[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setUTCDate(now.getUTCDate() - i);
          dateList.push(formatDate(d));
        }

        const siteRes = await client.execute({
          sql: `SELECT date, page_views, unique_visitors FROM site_analytics WHERE date IN (${dateList.map(() => "?").join(",")})`,
          args: dateList,
        });

        const rowsMap = new Map(siteRes.rows.map((r: any) => [r.date, r]));

        dateList.forEach((dStr) => {
          const dObj = new Date(`${dStr}T00:00:00Z`);
          const label = `${dObj.getUTCDate()} ${MONTH_NAMES[dObj.getUTCMonth()]}`;
          const r: any = rowsMap.get(dStr);
          points.push({
            label,
            timeKey: dStr,
            views: Number(r?.page_views || 0),
            visitors: Number(r?.unique_visitors || 0),
          });
        });
        break;
      }

      case "30d":
      case "last30Days": {
        metricLabel = "Last 30 Days";
        const dateList: string[] = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now);
          d.setUTCDate(now.getUTCDate() - i);
          dateList.push(formatDate(d));
        }

        const siteRes = await client.execute({
          sql: `SELECT date, page_views, unique_visitors FROM site_analytics WHERE date IN (${dateList.map(() => "?").join(",")})`,
          args: dateList,
        });

        const rowsMap = new Map(siteRes.rows.map((r: any) => [r.date, r]));

        dateList.forEach((dStr) => {
          const dObj = new Date(`${dStr}T00:00:00Z`);
          const label = `${dObj.getUTCDate()} ${MONTH_NAMES[dObj.getUTCMonth()]}`;
          const r: any = rowsMap.get(dStr);
          points.push({
            label,
            timeKey: dStr,
            views: Number(r?.page_views || 0),
            visitors: Number(r?.unique_visitors || 0),
          });
        });
        break;
      }

      case "thisWeek": {
        metricLabel = "This Week";
        // Get Monday of current week
        const dayOfWeek = now.getUTCDay(); // 0 = Sun, 1 = Mon...
        const diffToMon = (dayOfWeek + 6) % 7;
        const monday = new Date(now);
        monday.setUTCDate(now.getUTCDate() - diffToMon);

        const dateList: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday);
          d.setUTCDate(monday.getUTCDate() + i);
          dateList.push(formatDate(d));
        }

        const siteRes = await client.execute({
          sql: `SELECT date, page_views, unique_visitors FROM site_analytics WHERE date IN (${dateList.map(() => "?").join(",")})`,
          args: dateList,
        });

        const rowsMap = new Map(siteRes.rows.map((r: any) => [r.date, r]));

        dateList.forEach((dStr) => {
          const dObj = new Date(`${dStr}T00:00:00Z`);
          const label = `${DAY_NAMES[dObj.getUTCDay()]} ${MONTH_NAMES[dObj.getUTCMonth()]} ${dObj.getUTCDate()}`;
          const r: any = rowsMap.get(dStr);
          points.push({
            label,
            timeKey: dStr,
            views: Number(r?.page_views || 0),
            visitors: Number(r?.unique_visitors || 0),
          });
        });
        break;
      }

      case "lastWeek": {
        metricLabel = "Last Week";
        const dayOfWeek = now.getUTCDay();
        const diffToMon = (dayOfWeek + 6) % 7;
        const prevMonday = new Date(now);
        prevMonday.setUTCDate(now.getUTCDate() - diffToMon - 7);

        const dateList: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(prevMonday);
          d.setUTCDate(prevMonday.getUTCDate() + i);
          dateList.push(formatDate(d));
        }

        const siteRes = await client.execute({
          sql: `SELECT date, page_views, unique_visitors FROM site_analytics WHERE date IN (${dateList.map(() => "?").join(",")})`,
          args: dateList,
        });
        const rowsMap = new Map(siteRes.rows.map((r: any) => [r.date, r]));

        dateList.forEach((dStr) => {
          const dObj = new Date(`${dStr}T00:00:00Z`);
          const label = `${DAY_NAMES[dObj.getUTCDay()]} ${MONTH_NAMES[dObj.getUTCMonth()]} ${dObj.getUTCDate()}`;
          const r: any = rowsMap.get(dStr);
          points.push({
            label,
            timeKey: dStr,
            views: Number(r?.page_views || 0),
            visitors: Number(r?.unique_visitors || 0),
          });
        });
        break;
      }

      case "thisMonth": {
        const y = now.getUTCFullYear();
        const m = now.getUTCMonth();
        metricLabel = `${MONTH_NAMES[m]} ${y}`;
        const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

        const dateList: string[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          dateList.push(`${y}-${pad(m + 1)}-${pad(d)}`);
        }

        const siteRes = await client.execute({
          sql: `SELECT date, page_views, unique_visitors FROM site_analytics WHERE date LIKE ?`,
          args: [`${y}-${pad(m + 1)}%`],
        });
        const rowsMap = new Map(siteRes.rows.map((r: any) => [r.date, r]));

        dateList.forEach((dStr) => {
          const dObj = new Date(`${dStr}T00:00:00Z`);
          const label = `${MONTH_NAMES[dObj.getUTCMonth()]} ${dObj.getUTCDate()}`;
          const r: any = rowsMap.get(dStr);
          points.push({
            label,
            timeKey: dStr,
            views: Number(r?.page_views || 0),
            visitors: Number(r?.unique_visitors || 0),
          });
        });
        break;
      }

      case "lastMonth": {
        const prevMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const y = prevMonthDate.getUTCFullYear();
        const m = prevMonthDate.getUTCMonth();
        metricLabel = `${MONTH_NAMES[m]} ${y}`;
        const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

        const dateList: string[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
          dateList.push(`${y}-${pad(m + 1)}-${pad(d)}`);
        }

        const siteRes = await client.execute({
          sql: `SELECT date, page_views, unique_visitors FROM site_analytics WHERE date LIKE ?`,
          args: [`${y}-${pad(m + 1)}%`],
        });
        const rowsMap = new Map(siteRes.rows.map((r: any) => [r.date, r]));

        dateList.forEach((dStr) => {
          const dObj = new Date(`${dStr}T00:00:00Z`);
          const label = `${MONTH_NAMES[dObj.getUTCMonth()]} ${dObj.getUTCDate()}`;
          const r: any = rowsMap.get(dStr);
          points.push({
            label,
            timeKey: dStr,
            views: Number(r?.page_views || 0),
            visitors: Number(r?.unique_visitors || 0),
          });
        });
        break;
      }

      case "all":
      case "allTime": {
        metricLabel = "All Time";
        const siteRes = await client.execute({
          sql: `SELECT date, page_views, unique_visitors FROM site_analytics ORDER BY date ASC`,
          args: [],
        });
        if (siteRes.rows.length === 0) {
          points.push({
            label: `${MONTH_NAMES[now.getUTCMonth()]} ${now.getUTCDate()}`,
            timeKey: todayStr,
            views: 0,
            visitors: 0,
          });
        } else {
          siteRes.rows.forEach((r: any) => {
            const dObj = new Date(`${r.date}T00:00:00Z`);
            const label = isNaN(dObj.getTime())
              ? String(r.date)
              : `${MONTH_NAMES[dObj.getUTCMonth()]} ${dObj.getUTCDate()}`;
            points.push({
              label,
              timeKey: String(r.date),
              views: Number(r.page_views || 0),
              visitors: Number(r.unique_visitors || 0),
            });
          });
        }
        break;
      }

      case "custom": {
        const start = customStart && /^\d{4}-\d{2}-\d{2}$/.test(customStart) ? customStart : todayStr;
        const end = customEnd && /^\d{4}-\d{2}-\d{2}$/.test(customEnd) ? customEnd : todayStr;
        metricLabel = `Custom: ${start} to ${end}`;

        const startDate = new Date(`${start}T00:00:00Z`);
        const endDate = new Date(`${end}T00:00:00Z`);

        const diffDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (24 * 3600 * 1000)) + 1);

        const dateList: string[] = [];
        for (let i = 0; i < Math.min(diffDays, 90); i++) {
          const d = new Date(startDate);
          d.setUTCDate(startDate.getUTCDate() + i);
          dateList.push(formatDate(d));
        }

        const siteRes = await client.execute({
          sql: `SELECT date, page_views, unique_visitors FROM site_analytics WHERE date >= ? AND date <= ? ORDER BY date ASC`,
          args: [start, end],
        });
        const rowsMap = new Map(siteRes.rows.map((r: any) => [r.date, r]));

        dateList.forEach((dStr) => {
          const dObj = new Date(`${dStr}T00:00:00Z`);
          const label = `${MONTH_NAMES[dObj.getUTCMonth()]} ${dObj.getUTCDate()}`;
          const r: any = rowsMap.get(dStr);
          points.push({
            label,
            timeKey: dStr,
            views: Number(r?.page_views || 0),
            visitors: Number(r?.unique_visitors || 0),
          });
        });
        break;
      }

      default: {
        return NextResponse.json({ success: false, error: "Invalid range parameter" }, { status: 400 });
      }
    }

    // Calculate Summary Stats
    const totalViews = points.reduce((acc, p) => acc + p.views, 0);
    const totalVisitors = points.reduce((acc, p) => acc + p.visitors, 0);

    let peakValue = 0;
    let peakLabel = points[0]?.label || "N/A";

    points.forEach((p) => {
      if (p.views > peakValue) {
        peakValue = p.views;
        peakLabel = p.label;
      }
    });

    const activePoints = points.filter((p) => p.views > 0);
    const avgValue = points.length > 0 ? Math.round((totalViews / points.length) * 10) / 10 : 0;

    const response: TimeseriesResponse = {
      success: true,
      range,
      metricLabel,
      summary: {
        totalViews,
        totalVisitors,
        peakValue,
        peakLabel,
        avgValue,
      },
      points,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
      },
    });
  } catch (err: any) {
    console.error("Timeseries analytics error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

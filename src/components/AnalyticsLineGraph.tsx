"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  TrendingUp,
  Clock,
  Calendar,
  Eye,
  Users,
  Activity,
  ChevronDown,
  RotateCw,
} from "lucide-react";

export type TimeframeType =
  | "1h"
  | "24h"
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "custom";

interface TimeseriesPoint {
  label: string;
  timeKey: string;
  views: number;
  visitors: number;
}

interface TimeseriesResponse {
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

const TIMEFRAME_OPTIONS: { id: TimeframeType; label: string }[] = [
  { id: "1h", label: "Past 1 Hour" },
  { id: "24h", label: "24 Hours" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "thisWeek", label: "This Week" },
  { id: "lastWeek", label: "Last Week" },
  { id: "thisMonth", label: "This Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "custom", label: "Custom" },
];

export function AnalyticsLineGraph() {
  const [timeframe, setTimeframe] = useState<TimeframeType>("today");
  const [metric, setMetric] = useState<"views" | "visitors" | "both">("both");
  const [data, setData] = useState<TimeseriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Custom date range state
  const todayIso = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchTimeseries = async (selectedRange = timeframe) => {
    setLoading(true);
    try {
      let url = `/api/analytics/timeseries?range=${selectedRange}`;
      if (selectedRange === "custom") {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load timeseries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeseries(timeframe);
  }, [timeframe]);

  const handleCustomApply = () => {
    if (timeframe === "custom") {
      fetchTimeseries("custom");
    } else {
      setTimeframe("custom");
    }
  };

  // SVG Drawing Dimensions
  const svgWidth = 800;
  const svgHeight = 260;
  const padding = { top: 25, right: 25, bottom: 40, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const points = data?.points || [];

  // Determine scale maximum
  const maxValue = useMemo(() => {
    if (points.length === 0) return 10;
    let max = 0;
    points.forEach((p) => {
      if (metric === "views" || metric === "both") max = Math.max(max, p.views);
      if (metric === "visitors" || metric === "both") max = Math.max(max, p.visitors);
    });
    // Add 15% headroom or at least 5
    return Math.max(5, Math.ceil(max * 1.15));
  }, [points, metric]);

  // Coordinates mapping
  const coords = useMemo(() => {
    if (points.length === 0) return { views: [], visitors: [] };
    const stepX = points.length > 1 ? graphWidth / (points.length - 1) : graphWidth / 2;

    const viewsCoords = points.map((p, i) => {
      const x = padding.left + i * stepX;
      const y = padding.top + graphHeight - (p.views / maxValue) * graphHeight;
      return { x, y, ...p };
    });

    const visitorsCoords = points.map((p, i) => {
      const x = padding.left + i * stepX;
      const y = padding.top + graphHeight - (p.visitors / maxValue) * graphHeight;
      return { x, y, ...p };
    });

    return { views: viewsCoords, visitors: visitorsCoords };
  }, [points, maxValue, graphWidth, graphHeight, padding]);

  // Generate SVG path strings
  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const current = pts[i];
      const next = pts[i + 1];
      const midX = (current.x + next.x) / 2;
      path += ` C ${midX} ${current.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
    }
    return path;
  };

  const viewsPath = useMemo(() => buildSmoothPath(coords.views), [coords.views]);
  const visitorsPath = useMemo(() => buildSmoothPath(coords.visitors), [coords.visitors]);

  // Area fill under views curve
  const viewsAreaPath = useMemo(() => {
    if (coords.views.length === 0) return "";
    const baseLine = padding.top + graphHeight;
    const first = coords.views[0];
    const last = coords.views[coords.views.length - 1];
    return `${viewsPath} L ${last.x} ${baseLine} L ${first.x} ${baseLine} Z`;
  }, [viewsPath, coords.views, padding, graphHeight]);

  // Mouse interaction handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const normX = (clientX / rect.width) * svgWidth;

    const stepX = points.length > 1 ? graphWidth / (points.length - 1) : graphWidth;
    let closestIndex = Math.round((normX - padding.left) / stepX);
    closestIndex = Math.max(0, Math.min(points.length - 1, closestIndex));
    setHoverIndex(closestIndex);
  };

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;
  const activeViewCoord = hoverIndex !== null && coords.views[hoverIndex] ? coords.views[hoverIndex] : null;
  const activeVisitorCoord = hoverIndex !== null && coords.visitors[hoverIndex] ? coords.visitors[hoverIndex] : null;

  // X-axis tick indices to avoid crowd
  const xTickIndices = useMemo(() => {
    if (points.length <= 8) return points.map((_, i) => i);
    const step = Math.ceil(points.length / 7);
    const indices: number[] = [];
    for (let i = 0; i < points.length; i += step) {
      indices.push(i);
    }
    if (indices[indices.length - 1] !== points.length - 1) {
      indices.push(points.length - 1);
    }
    return indices;
  }, [points]);

  // Y-axis grid ticks (4 intervals)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    val: Math.round(maxValue * ratio),
    y: padding.top + graphHeight - ratio * graphHeight,
  }));

  return (
    <div className="w-full rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur p-4 sm:p-6 space-y-5 font-mono shadow-xl">
      {/* Top Header: Title, Metric Selector, Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
              Traffic Telemetry Timeline
            </h2>
            {loading && <RotateCw className="w-3.5 h-3.5 text-zinc-500 animate-spin ml-1" />}
          </div>
          <p className="text-xs text-zinc-400 font-sans">
            {data?.metricLabel || "Interactive visitor timeseries"}
          </p>
        </div>
      </div>

      {/* Timeframe Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs overflow-x-auto pb-1">
        {TIMEFRAME_OPTIONS.map((opt) => {
          const isActive = timeframe === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTimeframe(opt.id)}
              className={`px-3 py-1.5 rounded-xl border transition whitespace-nowrap text-xs font-mono font-medium ${
                isActive
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-sm"
                  : "bg-zinc-950/40 hover:bg-zinc-800/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Selector Drawer */}
      {timeframe === "custom" && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">From:</span>
            <input
              type="date"
              value={startDate}
              max={todayIso}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-zinc-200 px-2.5 py-1 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">To:</span>
            <input
              type="date"
              value={endDate}
              max={todayIso}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-zinc-200 px-2.5 py-1 rounded-lg text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={handleCustomApply}
            className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono transition text-xs"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* Summary Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <div className="bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-800/60 space-y-0.5">
          <div className="text-[10px] text-zinc-500 flex items-center gap-1">
            <Eye className="w-3 h-3 text-emerald-400" />
            <span>Total Views</span>
          </div>
          <div className="text-lg font-bold text-white">
            {loading ? "..." : (data?.summary.totalViews ?? 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-800/60 space-y-0.5">
          <div className="text-[10px] text-zinc-500 flex items-center gap-1">
            <Users className="w-3 h-3 text-cyan-400" />
            <span>Unique Visitors</span>
          </div>
          <div className="text-lg font-bold text-cyan-400">
            {loading ? "..." : (data?.summary.totalVisitors ?? 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-800/60 space-y-0.5">
          <div className="text-[10px] text-zinc-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-yellow-400" />
            <span>Peak Activity</span>
          </div>
          <div className="text-base font-bold text-yellow-300 truncate">
            {loading ? "..." : `${data?.summary.peakValue ?? 0} (${data?.summary.peakLabel || "N/A"})`}
          </div>
        </div>

        <div className="bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-800/60 space-y-0.5">
          <div className="text-[10px] text-zinc-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-purple-400" />
            <span>Avg / Interval</span>
          </div>
          <div className="text-lg font-bold text-purple-300">
            {loading ? "..." : (data?.summary.avgValue ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Interactive SVG Line Graph Canvas */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl bg-zinc-950/80 border border-zinc-800/70 select-none pt-2"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-[220px] sm:h-[260px] overflow-visible"
          onMouseMove={handleMouseMove}
        >
          <defs>
            {/* Emerald Area Gradient */}
            <linearGradient id="emeraldAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
              <stop offset="75%" stopColor="#10b981" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>

            {/* Cyan Area Gradient */}
            <linearGradient id="cyanAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>

            {/* Subtle Line Glow Filter */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Horizontal Y Grid Lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={svgWidth - padding.right}
                y2={tick.y}
                stroke="#27272a"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={tick.y + 3}
                fill="#71717a"
                fontSize="9"
                textAnchor="end"
                className="font-mono"
              >
                {tick.val}
              </text>
            </g>
          ))}

          {/* Vertical X Grid Lines & Labels */}
          {xTickIndices.map((idx) => {
            const p = coords.views[idx];
            if (!p) return null;
            return (
              <g key={idx}>
                <line
                  x1={p.x}
                  y1={padding.top}
                  x2={p.x}
                  y2={padding.top + graphHeight}
                  stroke="#1f1f23"
                  strokeDasharray="2 2"
                  strokeWidth="0.8"
                />
                <text
                  x={p.x}
                  y={svgHeight - 14}
                  fill="#71717a"
                  fontSize="9.5"
                  textAnchor="middle"
                  className="font-mono"
                >
                  {p.label}
                </text>
              </g>
            );
          })}

          {/* Area Fill for Page Views */}
          {(metric === "views" || metric === "both") && viewsAreaPath && (
            <path d={viewsAreaPath} fill="url(#emeraldAreaGrad)" />
          )}

          {/* Page Views Primary Line */}
          {(metric === "views" || metric === "both") && viewsPath && (
            <path
              d={viewsPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#neonGlow)"
            />
          )}

          {/* Unique Visitors Secondary Line (Cyan dashed) */}
          {(metric === "visitors" || metric === "both") && visitorsPath && (
            <path
              d={visitorsPath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth={metric === "visitors" ? "2.5" : "1.8"}
              strokeDasharray={metric === "both" ? "4 3" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Active Hover Crosshair Line */}
          {activeViewCoord && (
            <g>
              <line
                x1={activeViewCoord.x}
                y1={padding.top}
                x2={activeViewCoord.x}
                y2={padding.top + graphHeight}
                stroke="#10b981"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                opacity="0.8"
              />

              {/* View Dot Ring */}
              {(metric === "views" || metric === "both") && (
                <>
                  <circle
                    cx={activeViewCoord.x}
                    cy={activeViewCoord.y}
                    r="6"
                    fill="#10b981"
                    opacity="0.25"
                  />
                  <circle
                    cx={activeViewCoord.x}
                    cy={activeViewCoord.y}
                    r="3.5"
                    fill="#10b981"
                    stroke="#09090b"
                    strokeWidth="1.5"
                  />
                </>
              )}

              {/* Visitor Dot Ring */}
              {(metric === "visitors" || metric === "both") && activeVisitorCoord && (
                <>
                  <circle
                    cx={activeVisitorCoord.x}
                    cy={activeVisitorCoord.y}
                    r="5"
                    fill="#06b6d4"
                    opacity="0.3"
                  />
                  <circle
                    cx={activeVisitorCoord.x}
                    cy={activeVisitorCoord.y}
                    r="3"
                    fill="#06b6d4"
                    stroke="#09090b"
                    strokeWidth="1.5"
                  />
                </>
              )}
            </g>
          )}
        </svg>

        {/* Hover Tooltip Overlay Box */}
        {activePoint && activeViewCoord && (
          <div
            className="pointer-events-none absolute z-20 rounded-xl bg-zinc-900/95 border border-zinc-700/80 p-2.5 shadow-2xl backdrop-blur text-xs font-mono space-y-1 transform -translate-x-1/2 transition-all duration-75"
            style={{
              left: `${(activeViewCoord.x / svgWidth) * 100}%`,
              top: "10px",
            }}
          >
            <div className="font-bold text-zinc-200 border-b border-zinc-800 pb-1 flex items-center justify-between gap-4">
              <span>{activePoint.label}</span>
              <span className="text-[10px] text-zinc-500">{timeframe}</span>
            </div>
            <div className="space-y-0.5 pt-0.5">
              <div className="flex items-center justify-between gap-3 text-emerald-400">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Views:</span>
                </span>
                <span className="font-bold">{activePoint.views}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-cyan-400">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Visitors:</span>
                </span>
                <span className="font-bold">{activePoint.visitors}</span>
              </div>
            </div>
          </div>
        )}

        {/* Empty or Zero State Notice */}
        {!loading && points.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500 font-mono">
            No telemetry points recorded for this timeframe yet
          </div>
        )}
      </div>

      {/* Bottom Chart Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-zinc-500 pt-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400 rounded-full" />
            <span className="text-zinc-400 text-[11px]">Page Views</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-400 border-dashed rounded-full" />
            <span className="text-zinc-400 text-[11px]">Unique Visitors</span>
          </div>
        </div>
        <div className="text-[11px] text-zinc-600">
          Hover or drag to inspect timestamp intervals
        </div>
      </div>
    </div>
  );
}

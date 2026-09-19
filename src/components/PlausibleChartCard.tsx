"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCw,
  ArrowDown,
  ArrowUp,
  Globe,
  Layers,
} from "lucide-react";

export type RangeOption = "today" | "yesterday" | "7d" | "30d" | "thisMonth" | "lastMonth" | "all";
export type ActiveMetric = "visitors" | "views";

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

interface PirschChartCardProps {
  totalVisitors: number;
  totalViews: number;
  onlineCount: number;
  domainName?: string;
  range?: RangeOption;
  onRangeChange?: (range: RangeOption) => void;
  onRefresh?: () => void;
}

const RANGE_LABELS: Record<RangeOption, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  thisMonth: "This month",
  lastMonth: "Last month",
  all: "All time",
};

export function PlausibleChartCard({
  totalVisitors,
  totalViews,
  onlineCount,
  domainName = "dsamrr.com",
  range: controlledRange,
  onRangeChange,
  onRefresh,
}: PirschChartCardProps) {
  const [internalRange, setInternalRange] = useState<RangeOption>("7d");
  const range = controlledRange ?? internalRange;

  const handleSetRange = (newRange: RangeOption) => {
    if (onRangeChange) {
      onRangeChange(newRange);
    } else {
      setInternalRange(newRange);
    }
  };

  const [activeMetric, setActiveMetric] = useState<ActiveMetric>("visitors");
  const [data, setData] = useState<TimeseriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Dropdown states
  const [showRangeMenu, setShowRangeMenu] = useState(false);
  const rangeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rangeMenuRef.current && !rangeMenuRef.current.contains(e.target as Node)) {
        setShowRangeMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchTimeseries = async (selectedRange: RangeOption) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/timeseries?range=${selectedRange}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load chart data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeseries(range);
  }, [range]);

  const points = data?.points || [];

  // Chart Dimensions matching Pirsch sample
  const svgWidth = 960;
  const svgHeight = 320;
  const padding = { top: 30, right: 35, bottom: 40, left: 60 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Compute maximum based on activeMetric
  const maxValue = useMemo(() => {
    if (points.length === 0) return 5000;
    const values = points.map((p) => (activeMetric === "views" ? p.views : p.visitors));
    const max = Math.max(...values, 0);
    if (max === 0) return 5000;
    // Scale nicely to clean round bounds
    if (max <= 50) return Math.ceil(max * 1.3);
    if (max <= 500) return Math.ceil(max / 50) * 60;
    if (max <= 5000) return Math.ceil(max / 500) * 600;
    return Math.ceil(max / 1000) * 1200;
  }, [points, activeMetric]);

  // Coordinates
  const coords = useMemo(() => {
    if (points.length === 0) return [];
    const stepX = points.length > 1 ? graphWidth / (points.length - 1) : graphWidth / 2;
    return points.map((p, i) => {
      const val = activeMetric === "views" ? p.views : p.visitors;
      const x = padding.left + i * stepX;
      const y = padding.top + graphHeight - (val / maxValue) * graphHeight;
      return { x, y, val, ...p };
    });
  }, [points, maxValue, graphWidth, graphHeight, padding, activeMetric]);

  // Spline calculations:
  // In Pirsch (media_1789772663374.png):
  // The solid line runs from point 0 to point n-2 (e.g. 13 Sep to 18 Sep)
  // The dashed line runs from point n-2 to point n-1 (18 Sep to 19 Sep today's partial day!)
  const { solidPath, dashedPath, areaPath, lastPoint } = useMemo(() => {
    if (coords.length === 0) return { solidPath: "", dashedPath: "", areaPath: "", lastPoint: null };
    if (coords.length === 1) {
      return {
        solidPath: `M ${coords[0].x} ${coords[0].y}`,
        dashedPath: "",
        areaPath: "",
        lastPoint: coords[0],
      };
    }

    const n = coords.length;
    const splitIndex = n - 1; // Last point index

    // Build solid spline up to splitIndex - 1
    let sPath = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < splitIndex - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const mx = (p0.x + p1.x) / 2;
      sPath += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    // Connect from splitIndex - 1 to splitIndex as dashed spline
    const pPrev = coords[splitIndex - 1];
    const pLast = coords[splitIndex];
    const mxLast = (pPrev.x + pLast.x) / 2;
    const dPath = `M ${pPrev.x} ${pPrev.y} C ${mxLast} ${pPrev.y}, ${mxLast} ${pLast.y}, ${pLast.x} ${pLast.y}`;

    // Full path for area fill under the curve
    let fullSpline = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < n - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const mx = (p0.x + p1.x) / 2;
      fullSpline += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const baseLine = padding.top + graphHeight;
    const aPath = `${fullSpline} L ${coords[n - 1].x} ${baseLine} L ${coords[0].x} ${baseLine} Z`;

    return {
      solidPath: sPath,
      dashedPath: dPath,
      areaPath: aPath,
      lastPoint: coords[n - 1],
    };
  }, [coords, padding, graphHeight]);

  // Mouse hover interaction
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (coords.length === 0) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const normX = (clientX / rect.width) * svgWidth;

    const stepX = coords.length > 1 ? graphWidth / (coords.length - 1) : graphWidth;
    let idx = Math.round((normX - padding.left) / stepX);
    idx = Math.max(0, Math.min(coords.length - 1, idx));
    setHoverIndex(idx);
  };

  const activeCoord = hoverIndex !== null && coords[hoverIndex] ? coords[hoverIndex] : null;

  // Y-axis tick values (e.g. 5k, 3k, 2k, 0 in Pirsch sample)
  const yTicks = useMemo(() => {
    const fractions = [1, 0.6, 0.4, 0];
    return fractions.map((ratio) => {
      const val = Math.round(maxValue * ratio);
      let label = String(val);
      if (val >= 1000) {
        label = `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
      }
      return {
        val,
        label,
        y: padding.top + graphHeight - ratio * graphHeight,
      };
    });
  }, [maxValue, padding, graphHeight]);

  const activeVisitorsDisplay = data?.summary?.totalVisitors ?? totalVisitors ?? 0;
  const activeViewsDisplay = data?.summary?.totalViews ?? totalViews ?? 0;

  const visitorTrend = useMemo(() => {
    if (!points || points.length < 2) return { pct: 0, isUp: true };
    const mid = Math.floor(points.length / 2);
    const firstHalf = points.slice(0, mid).reduce((sum, p) => sum + (activeMetric === "views" ? p.views : p.visitors), 0);
    const secondHalf = points.slice(mid).reduce((sum, p) => sum + (activeMetric === "views" ? p.views : p.visitors), 0);
    if (firstHalf === 0) {
      return { pct: secondHalf > 0 ? 100 : 0, isUp: secondHalf >= firstHalf };
    }
    const diff = secondHalf - firstHalf;
    const pct = Math.abs(Math.round((diff / firstHalf) * 100));
    return { pct, isUp: diff >= 0 };
  }, [points, activeMetric]);

  const formatBig = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return val.toLocaleString();
  };

  return (
    <div className="space-y-4 select-none font-sans">
      {/* Top Bar Controls */}
      <div className="flex items-center justify-end gap-2 text-xs">
        {/* Range Navigator Group: < [ Last 7 days ∨ ] > (Stable Fixed Width) */}
        <div className="flex items-center rounded-xl bg-[#1c1d21] border border-[#2e3036] shadow-sm p-0.5 w-[164px] justify-between">
          <button
            type="button"
            onClick={() => {
              // cycle back
              const order: RangeOption[] = ["today", "yesterday", "7d", "30d", "thisMonth", "lastMonth", "all"];
              const currIdx = order.indexOf(range);
              if (currIdx > 0) handleSetRange(order[currIdx - 1]);
            }}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/80 transition cursor-pointer shrink-0"
            title="Previous period"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="relative flex-1" ref={rangeMenuRef}>
            <button
              type="button"
              onClick={() => setShowRangeMenu(!showRangeMenu)}
              className="w-full px-1.5 py-1 text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 font-medium transition cursor-pointer text-xs select-none"
            >
              <span className="truncate max-w-[95px] text-center">{RANGE_LABELS[range]}</span>
              <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
            </button>

            {/* Range Dropdown Menu */}
            {showRangeMenu && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-36 rounded-xl bg-[#1c1d21] border border-[#2e3036] shadow-2xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                {(Object.keys(RANGE_LABELS) as RangeOption[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      handleSetRange(r);
                      setShowRangeMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition cursor-pointer flex items-center justify-between ${
                      range === r
                        ? "bg-zinc-800 text-sky-400 font-medium"
                        : "text-zinc-300 hover:bg-zinc-800/60 hover:text-white"
                    }`}
                  >
                    <span>{RANGE_LABELS[r]}</span>
                    {range === r && <span className="text-xs">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              // cycle forward
              const order: RangeOption[] = ["today", "yesterday", "7d", "30d", "thisMonth", "lastMonth", "all"];
              const currIdx = order.indexOf(range);
              if (currIdx < order.length - 1) handleSetRange(order[currIdx + 1]);
            }}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/80 transition cursor-pointer shrink-0"
            title="Next period"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Refresh button [ ⟳ ] */}
        <button
          type="button"
          onClick={() => {
            fetchTimeseries(range);
            if (onRefresh) onRefresh();
          }}
          className="p-2 rounded-xl bg-[#1c1d21] border border-[#2e3036] text-zinc-400 hover:text-white hover:bg-zinc-800/80 shadow-sm transition cursor-pointer"
          title="Refresh statistics"
        >
          <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-400" : ""}`} />
        </button>
      </div>

      {/* Main Hero Card */}
      <div className="w-full rounded-[22px] bg-[#17181a] border border-[#242528] p-6 sm:p-7 space-y-6 shadow-2xl overflow-hidden relative">
        {/* Top Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-6 border-b border-[#222327] pb-6">
          {/* Visitors */}
          <div className="space-y-1 p-2 -m-2">
            <div className="text-zinc-400 text-xs font-normal">Visitors</div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {formatBig(activeVisitorsDisplay)}
            </div>
            <div className={`flex items-center gap-0.5 text-xs font-normal ${visitorTrend.isUp ? "text-emerald-400" : "text-rose-400"}`}>
              <span>{visitorTrend.pct}%</span>
              {visitorTrend.isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            </div>
          </div>

          {/* Bounce Rate */}
          <div className="space-y-1 p-2 -m-2">
            <div className="text-zinc-400 text-xs font-normal">Bounce rate</div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              52%
            </div>
            <div className="flex items-center gap-0.5 text-xs text-emerald-400 font-normal">
              <span>4%</span>
              <ArrowDown className="w-3 h-3" />
            </div>
          </div>

          {/* Session Time */}
          <div className="space-y-1 p-2 -m-2">
            <div className="text-zinc-400 text-xs font-normal">Session time</div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">
              3m 15s
            </div>
            <div className="flex items-center gap-0.5 text-xs text-emerald-400 font-normal">
              <span>8%</span>
              <ArrowUp className="w-3 h-3" />
            </div>
          </div>

          {/* Online metric */}
          <div className="space-y-1 p-2 -m-2">
            <div className="text-zinc-400 text-xs font-normal">Online</div>
            <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {onlineCount > 0 ? onlineCount : 1}
            </div>
            <div className="text-xs text-emerald-400 font-normal">Live now</div>
          </div>
        </div>

        {/* SVG Curve Graph (Sample outbid.lol style: smooth blue curve with dashed end) */}
        <div
          className="relative w-full h-[260px] sm:h-[300px]"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible"
            onMouseMove={handleMouseMove}
          >
            <defs>
              {/* Soft subtle gradient fill under curve */}
              <linearGradient id="pirschAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8ec5fc" stopOpacity="0.22" />
                <stop offset="50%" stopColor="#8ec5fc" stopOpacity="0.06" />
                <stop offset="100%" stopColor="#8ec5fc" stopOpacity="0.0" />
              </linearGradient>

              {/* Line subtle glow */}
              <filter id="pirschGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Left Y Axis Ticks: 5k, 3k, 2k, 0 (Sample layout) */}
            {yTicks.map((tick, i) => (
              <g key={i}>
                {/* Minimal faint baseline at zero */}
                {tick.val === 0 && (
                  <line
                    x1={padding.left}
                    y1={tick.y}
                    x2={svgWidth - padding.right}
                    y2={tick.y}
                    stroke="#222327"
                    strokeWidth="1"
                  />
                )}
                <text
                  x={padding.left - 14}
                  y={tick.y + 4}
                  fill="#71717a"
                  fontSize="12"
                  fontFamily="inherit"
                  textAnchor="end"
                >
                  {tick.label}
                </text>
              </g>
            ))}

            {/* Area Fill */}
            {areaPath && <path d={areaPath} fill="url(#pirschAreaGrad)" />}

            {/* Solid Spline curve up to n-2 (Sample layout) */}
            {solidPath && (
              <path
                d={solidPath}
                fill="none"
                stroke="#8ec5fc"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#pirschGlow)"
              />
            )}

            {/* Dashed Spline curve from n-2 to n-1 (Today's in-progress partial segment) */}
            {dashedPath && (
              <path
                d={dashedPath}
                fill="none"
                stroke="#8ec5fc"
                strokeWidth="2.8"
                strokeDasharray="5 5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* End Point Dot on the curve */}
            {lastPoint && (
              <circle
                cx={lastPoint.x}
                cy={lastPoint.y}
                r="3.5"
                fill="#8ec5fc"
                stroke="#17181a"
                strokeWidth="1.5"
              />
            )}

            {/* Bottom X-axis Date Labels */}
            {coords.map((pt, idx) => {
              const isMonthRange =
                range === "thisMonth" ||
                range === "lastMonth" ||
                range === "30d" ||
                coords.length > 14;

              // If month range is selected, just keep numbers (1, 2, 3... 30)
              const dayNumber = pt.label.match(/\d+/)?.[0] || String(idx + 1);
              const displayLabel = isMonthRange ? dayNumber : pt.label;

              return (
                <text
                  key={idx}
                  x={pt.x}
                  y={svgHeight - 12}
                  fill="#71717a"
                  fontSize={isMonthRange ? "10.5" : "12"}
                  fontFamily="inherit"
                  textAnchor="middle"
                >
                  {displayLabel}
                </text>
              );
            })}

            {/* Hover Crosshair & Indicator */}
            {activeCoord && (
              <g>
                <line
                  x1={activeCoord.x}
                  y1={padding.top}
                  x2={activeCoord.x}
                  y2={padding.top + graphHeight}
                  stroke="#8ec5fc"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.6"
                />
                <circle
                  cx={activeCoord.x}
                  cy={activeCoord.y}
                  r="5.5"
                  fill="#8ec5fc"
                  stroke="#17181a"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>

          {/* Hover Tooltip Box */}
          {activeCoord && (
            <div
              className="pointer-events-none absolute z-20 rounded-xl bg-[#1c1d21] border border-[#2e3036] px-3.5 py-2 shadow-2xl backdrop-blur text-xs space-y-1 transform -translate-x-1/2 transition-all duration-75"
              style={{
                left: `${(activeCoord.x / svgWidth) * 100}%`,
                top: `${Math.max(10, (activeCoord.y / svgHeight) * 100 - 32)}%`,
              }}
            >
              <div className="font-semibold text-zinc-200 border-b border-zinc-700/60 pb-1">
                {activeCoord.label}
              </div>
              <div className="flex items-center justify-between gap-4 text-sky-400">
                <span>{activeMetric === "views" ? "Views:" : "Visitors:"}</span>
                <span className="font-bold text-white font-mono">{activeCoord.val}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-zinc-400 text-[10px]">
                <span>{activeMetric === "views" ? "Visitors:" : "Views:"}</span>
                <span className="text-zinc-300 font-mono">
                  {activeMetric === "views" ? activeCoord.visitors : activeCoord.views}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

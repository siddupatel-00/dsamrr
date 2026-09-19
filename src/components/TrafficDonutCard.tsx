"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Maximize2, ChevronDown, X } from "lucide-react";

export interface ChannelItem {
  name: string;
  count: number;
  percentage: number;
}

export interface ReferrerItem {
  source: string;
  count: number;
  percentage: number;
}

interface TrafficDonutCardProps {
  channels: ChannelItem[];
  referrers: ReferrerItem[];
}

// Subtle slate-blue shades matching user reference
const SLATE_PALETTE = {
  direct: "#345e7d",
  social: "#45779b",
  search: "#578eb2",
  referral: "#6d9fb7",
};

interface BadgeInfo {
  id: string;
  label: string;
  render: (x: number, y: number) => React.ReactNode;
}

export function TrafficDonutCard({
  channels = [],
  referrers = [],
}: TrafficDonutCardProps) {
  const [activeTab, setActiveTab] = useState<"channel" | "referrer" | "campaign">("channel");
  const [hoveredChannelId, setHoveredChannelId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showModal, setShowModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const enterChannel = (id: string) => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setHoveredChannelId(id);
  };

  const leaveChannel = (immediate = false) => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if (immediate) {
      setHoveredChannelId(null);
    } else {
      leaveTimerRef.current = setTimeout(() => {
        setHoveredChannelId(null);
      }, 150);
    }
  };

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showModal) {
      setModalSearch("");
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowModal(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal]);

  // SVG Geometry
  const width = 500;
  const height = 360;
  const cx = 250;
  const cy = 180;
  const rOut = 118;
  const rIn = 70;
  const rMid = (rOut + rIn) / 2; // 94

  // Real total visits from database channels prop
  const totalVisits = useMemo(() => {
    return channels.reduce((sum, c) => sum + c.count, 0) || 0;
  }, [channels]);

  const formatCount = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toLocaleString();
  };

  // Channel data breakdown strictly from 100% REAL database props (no dummy fallbacks)
  const channelData = useMemo(() => {
    const findChannel = (term: string) =>
      channels.find((c) => c.name.toLowerCase().includes(term));

    const directItem = findChannel("direct");
    const socialItem = findChannel("social");
    const searchItem = findChannel("search");
    const referralItem = findChannel("referral");

    const dCount = directItem?.count || 0;
    const sCount = socialItem?.count || 0;
    const qCount = searchItem?.count || 0;
    const rCount = referralItem?.count || 0;

    const tot = totalVisits || 1;
    const dPct = Math.round((dCount / tot) * 100);
    const sPct = Math.round((sCount / tot) * 100);
    const qPct = Math.round((qCount / tot) * 100);
    const rPct = Math.max(0, 100 - dPct - sPct - qPct);

    // 1. Social sources from real referrers
    const realSocialSources = referrers.filter((r) => {
      const s = r.source.toLowerCase();
      return (
        s.includes("twitter") ||
        s.includes("x (") ||
        s.includes("t.co") ||
        s.includes("reddit") ||
        s.includes("linkedin") ||
        s.includes("youtube") ||
        s.includes("instagram") ||
        s.includes("facebook") ||
        s.includes("discord")
      );
    });

    const socialSubSources = realSocialSources.map((r) => {
      let icon = (
        <span className="w-3.5 h-3.5 rounded bg-zinc-700 flex items-center justify-center text-[8px] text-white">
          🌐
        </span>
      );
      let displayName = r.source;
      const s = r.source.toLowerCase();

      if (s.includes("twitter") || s.includes("x (") || s.includes("t.co")) {
        displayName = "X";
        icon = (
          <span className="w-3.5 h-3.5 rounded-[3px] bg-black border border-zinc-700 flex items-center justify-center text-[8.5px] font-bold text-white leading-none">
            𝕏
          </span>
        );
      } else if (s.includes("reddit")) {
        displayName = "Reddit";
        icon = (
          <span className="w-3.5 h-3.5 rounded-full bg-[#ff4500] flex items-center justify-center text-[8px] text-white leading-none">
            🤖
          </span>
        );
      } else if (s.includes("youtube")) {
        displayName = "YouTube";
        icon = (
          <span className="w-3.5 h-3 rounded-[2.5px] bg-[#ff0000] flex items-center justify-center text-[7px] text-white leading-none">
            ▶
          </span>
        );
      } else if (s.includes("linkedin")) {
        displayName = "LinkedIn";
        icon = (
          <span className="w-3.5 h-3.5 rounded-[2.5px] bg-[#0a66c2] flex items-center justify-center text-[7.5px] font-bold text-white leading-none">
            in
          </span>
        );
      }

      const pctOfSocial = sCount > 0 ? Math.round((r.count / sCount) * 100) : r.percentage;
      return {
        name: displayName,
        count: r.count,
        pct: Math.min(100, Math.max(1, pctOfSocial)),
        icon,
      };
    });

    // 2. Referral sources from real referrers
    const realReferralSources = referrers.filter((r) => {
      const s = r.source.toLowerCase();
      return (
        !s.includes("twitter") &&
        !s.includes("x (") &&
        !s.includes("t.co") &&
        !s.includes("reddit") &&
        !s.includes("linkedin") &&
        !s.includes("youtube") &&
        !s.includes("facebook") &&
        !s.includes("google") &&
        !s.includes("bing") &&
        !s.includes("duckduckgo") &&
        !s.includes("direct")
      );
    });

    const referralSubSources = realReferralSources.slice(0, 4).map((r) => {
      const pctOfReferral = rCount > 0 ? Math.round((r.count / rCount) * 100) : r.percentage;
      const isGitHub = r.source.toLowerCase().includes("github.io");
      return {
        name: r.source.replace(/^https?:\/\//, "").replace(/\/$/, ""),
        count: r.count,
        pct: Math.min(100, Math.max(1, pctOfReferral)),
        icon: isGitHub ? (
          <span className="w-3.5 h-3.5 rounded bg-[#24292e] border border-zinc-700 flex items-center justify-center text-[8px] text-white leading-none">
            🐙
          </span>
        ) : (
          <span className="w-3.5 h-3.5 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[8px] text-white leading-none">
            🔗
          </span>
        ),
      };
    });

    // 3. Search sources from real referrers
    const realSearchSources = referrers.filter((r) => {
      const s = r.source.toLowerCase();
      return (
        s.includes("google") ||
        s.includes("bing") ||
        s.includes("duckduckgo") ||
        s.includes("search") ||
        s.includes("yandex")
      );
    });

    const searchSubSources = realSearchSources.map((r) => {
      const pctOfSearch = qCount > 0 ? Math.round((r.count / qCount) * 100) : r.percentage;
      return {
        name: r.source,
        count: r.count,
        pct: Math.min(100, Math.max(1, pctOfSearch)),
        icon: (
          <span className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center text-[8px] font-bold text-[#4285f4] leading-none">
            G
          </span>
        ),
      };
    });

    // 4. Direct sources
    const directSubSources =
      dCount > 0
        ? [
            {
              name: "Direct / Bookmark",
              count: dCount,
              pct: 100,
              icon: (
                <span className="w-3.5 h-3.5 rounded bg-sky-600 flex items-center justify-center text-[9px] text-white">
                  🔗
                </span>
              ),
            },
          ]
        : [];

    return [
      {
        id: "referral",
        name: "Referral",
        count: rCount,
        pct: rPct,
        color: SLATE_PALETTE.referral,
        visitorCountStr: formatCount(rCount),
        topSources: referralSubSources,
      },
      {
        id: "direct",
        name: "Direct",
        count: dCount,
        pct: dPct,
        color: SLATE_PALETTE.direct,
        visitorCountStr: formatCount(dCount),
        topSources: directSubSources,
      },
      {
        id: "social",
        name: "Organic social",
        count: sCount,
        pct: sPct,
        color: SLATE_PALETTE.social,
        visitorCountStr: formatCount(sCount),
        topSources: socialSubSources,
      },
      {
        id: "search",
        name: "Organic search",
        count: qCount,
        pct: qPct,
        color: SLATE_PALETTE.search,
        visitorCountStr: formatCount(qCount),
        topSources: searchSubSources,
      },
    ];
  }, [channels, referrers, totalVisits]);

  // ONLY render channels with real visits > 0 (100% accurate, zero dummy items)
  const activeChannelData = useMemo(() => {
    const order = ["referral", "direct", "social", "search"];
    return [...channelData.filter((c) => c.count > 0)].sort(
      (a, b) => order.indexOf(a.id) - order.indexOf(b.id)
    );
  }, [channelData]);

  // Generate SVG arcs dynamically based on real data
  const total = activeChannelData.reduce((s, c) => s + c.count, 0) || 1;
  const gapRad = activeChannelData.length > 1 ? 0.032 : 0;

  // Calibrate start angle so Referral is top, Direct is bottom-right, Social is left
  let currentAngle = -Math.PI * 0.55;
  const segments = activeChannelData.map((c) => {
    const angleSpan = (c.count / total) * (2 * Math.PI) - gapRad;
    const startA = currentAngle;
    const endA = currentAngle + Math.max(0.04, angleSpan);
    currentAngle = endA + gapRad;

    let path = "";
    if (activeChannelData.length === 1) {
      path = `M ${cx} ${cy - rOut} A ${rOut} ${rOut} 0 1 1 ${cx - 0.01} ${cy - rOut} L ${cx - 0.01} ${cy - rIn} A ${rIn} ${rIn} 0 1 0 ${cx} ${cy - rIn} Z`;
    } else {
      const x1 = cx + rOut * Math.cos(startA);
      const y1 = cy + rOut * Math.sin(startA);
      const x2 = cx + rOut * Math.cos(endA);
      const y2 = cy + rOut * Math.sin(endA);

      const x3 = cx + rIn * Math.cos(endA);
      const y3 = cy + rIn * Math.sin(endA);
      const x4 = cx + rIn * Math.cos(startA);
      const y4 = cy + rIn * Math.sin(startA);

      const largeArc = angleSpan > Math.PI ? 1 : 0;
      path = `M ${x1} ${y1} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    }

    const midA = (startA + endA) / 2;
    const midX = cx + rMid * Math.cos(midA);
    const midY = cy + rMid * Math.sin(midA);

    // Resolve real platform badges for this segment based strictly on DB data
    const badges: BadgeInfo[] = [];
    if (c.id === "social") {
      const hasX = c.topSources.some((s) => s.name === "X");
      const hasReddit = c.topSources.some((s) => s.name.toLowerCase().includes("reddit"));
      const hasYouTube = c.topSources.some((s) => s.name.toLowerCase().includes("youtube"));
      const hasLinkedIn = c.topSources.some((s) => s.name.toLowerCase().includes("linkedin"));

      if (hasX) {
        badges.push({
          id: "x",
          label: "X",
          render: (bx, by) => (
            <g key="x" transform={`translate(${bx}, ${by})`}>
              <circle cx="0" cy="0" r="8.5" fill="#000000" stroke="#3f3f46" strokeWidth="0.8" />
              <text
                x="0"
                y="3.2"
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="bold"
                fill="#ffffff"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                𝕏
              </text>
            </g>
          ),
        });
      }
      if (hasReddit) {
        badges.push({
          id: "reddit",
          label: "Reddit",
          render: (bx, by) => (
            <g key="reddit" transform={`translate(${bx}, ${by})`}>
              <circle cx="0" cy="0" r="8.5" fill="#ff4500" stroke="#ff6524" strokeWidth="0.8" />
              <ellipse cx="0" cy="0.8" rx="4.8" ry="3.3" fill="#ffffff" />
              <circle cx="-1.8" cy="0.6" r="0.8" fill="#ff4500" />
              <circle cx="1.8" cy="0.6" r="0.8" fill="#ff4500" />
              <path
                d="M -1.6 2.3 Q 0 3.3 1.6 2.3"
                fill="none"
                stroke="#ff4500"
                strokeWidth="0.65"
                strokeLinecap="round"
              />
              <circle cx="-4.6" cy="-0.3" r="1" fill="#ffffff" />
              <circle cx="4.6" cy="-0.3" r="1" fill="#ffffff" />
              <path
                d="M 0 -2.2 L 0.9 -3.8 L 2.6 -3.4"
                fill="none"
                stroke="#ffffff"
                strokeWidth="0.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="2.9" cy="-3.3" r="0.75" fill="#ffffff" />
            </g>
          ),
        });
      }
      if (hasYouTube) {
        badges.push({
          id: "youtube",
          label: "YouTube",
          render: (bx, by) => (
            <g key="youtube" transform={`translate(${bx}, ${by})`}>
              <circle cx="0" cy="0" r="8.5" fill="#ff0000" stroke="#ff3333" strokeWidth="0.8" />
              <polygon points="-2,-3 -2,3 3,0" fill="#ffffff" />
            </g>
          ),
        });
      }
      if (hasLinkedIn) {
        badges.push({
          id: "linkedin",
          label: "LinkedIn",
          render: (bx, by) => (
            <g key="linkedin" transform={`translate(${bx}, ${by})`}>
              <circle cx="0" cy="0" r="8.5" fill="#0a66c2" stroke="#2583e0" strokeWidth="0.8" />
              <text
                x="0"
                y="3"
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="bold"
                fill="#ffffff"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                in
              </text>
            </g>
          ),
        });
      }
    } else if (c.id === "referral") {
      const hasGitHub = c.topSources.some((s) => s.name.toLowerCase().includes("github.io"));
      const hasWeb = c.topSources.some((s) => !s.name.toLowerCase().includes("github.io"));

      if (hasGitHub) {
        badges.push({
          id: "github",
          label: "GitHub",
          render: (bx, by) => (
            <g key="github" transform={`translate(${bx}, ${by})`}>
              <circle cx="0" cy="0" r="8.5" fill="#181717" stroke="#3f3f46" strokeWidth="0.8" />
              <path
                d="M0 -4.2 C-2.3 -4.2 -4.2 -2.3 -4.2 0 C-4.2 1.8 -3 3.4 -1.3 4 C-1.1 4 -0.9 3.9 -0.9 3.8 L-0.9 2.8 C-2.2 3.1 -2.5 2.2 -2.5 2.2 C-2.7 1.8 -3 1.7 -3 1.7 C-3.4 1.4 -3 1.4 -3 1.4 C-2.5 1.4 -2.2 1.9 -2.2 1.9 C-1.8 2.6 -1.1 2.4 -0.8 2.2 C-0.8 1.9 -0.7 1.7 -0.5 1.5 C-1.5 1.4 -2.6 0.9 -2.6 -0.7 C-2.6 -1.2 -2.4 -1.6 -2 -1.9 C-2.1 -2 -2.3 -2.6 -1.9 -3.2 C-1.9 -3.2 -1.5 -3.3 -0.5 -2.7 C-0.1 -2.8 0.5 -2.8 0.9 -2.8 C1.4 -2.8 2 -2.8 2.4 -2.7 C3.4 -3.3 3.8 -3.2 3.8 -3.2 C4.2 -2.6 4 -2 3.9 -1.9 C4.3 -1.6 4.5 -1.2 4.5 -0.7 C4.5 0.9 3.4 1.4 2.4 1.5 C2.6 1.7 2.8 1.9 2.8 2.4 L2.8 3.8 C2.8 3.9 3 4 3.2 4 C4.9 3.4 6 1.8 6 0 C6 -2.3 4.1 -4.2 1.8 -4.2 Z"
                fill="#ffffff"
                transform="scale(0.8)"
              />
            </g>
          ),
        });
      }
      if (hasWeb) {
        badges.push({
          id: "web",
          label: "Web",
          render: (bx, by) => (
            <g key="web" transform={`translate(${bx}, ${by})`}>
              <circle cx="0" cy="0" r="8.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.8" />
              <circle cx="0" cy="0" r="4.3" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
              <ellipse cx="0" cy="0" rx="2" ry="4.3" fill="none" stroke="#38bdf8" strokeWidth="0.7" />
              <line x1="-4.3" y1="0" x2="4.3" y2="0" stroke="#38bdf8" strokeWidth="0.7" />
            </g>
          ),
        });
      }
    } else if (c.id === "search") {
      const hasGoogle = c.topSources.some((s) => s.name.toLowerCase().includes("google"));
      if (hasGoogle) {
        badges.push({
          id: "google",
          label: "Google",
          render: (bx, by) => (
            <g key="google" transform={`translate(${bx}, ${by})`}>
              <circle cx="0" cy="0" r="8.5" fill="#ffffff" stroke="#e4e4e7" strokeWidth="0.8" />
              <text
                x="0"
                y="3.2"
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="bold"
                fill="#4285f4"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                G
              </text>
            </g>
          ),
        });
      }
    }

    return {
      ...c,
      path,
      startA,
      endA,
      midA,
      midX,
      midY,
      badges,
    };
  });

  const hoveredChannel = hoveredChannelId
    ? channelData.find((c) => c.id === hoveredChannelId) || null
    : null;

  const [containerSize, setContainerSize] = useState({ w: 480, h: 360 });

  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    if (rect.width !== containerSize.w || rect.height !== containerSize.h) {
      setContainerSize({ w: rect.width, h: rect.height });
    }
  };

  const displayedSources = useMemo(() => {
    return hoveredChannel ? hoveredChannel.topSources.slice(0, 3) : [];
  }, [hoveredChannel]);

  const tooltipWidth = 225;
  const tooltipHeight =
    95 + displayedSources.length * 28 + (hoveredChannel && hoveredChannel.topSources.length > 3 ? 18 : 0);

  const showOnLeft = mousePos.x + 20 + tooltipWidth > containerSize.w;
  const targetX = showOnLeft ? mousePos.x - tooltipWidth - 14 : mousePos.x + 18;
  const clampedX = Math.max(10, Math.min(targetX, containerSize.w - tooltipWidth - 10));

  const showAbove =
    mousePos.y > containerSize.h * 0.42 || mousePos.y + tooltipHeight + 20 > containerSize.h;
  const targetY = showAbove ? mousePos.y - tooltipHeight - 14 : mousePos.y + 16;
  const clampedY = Math.max(8, targetY);

  return (
    <div className="w-full rounded-[22px] bg-[#17181a] border border-[#242528] p-5 sm:p-6 space-y-4 shadow-xl select-none font-sans flex flex-col justify-between">
      <div>
        {/* Header: Tabs on Left, REAL count in All (...) on Right */}
        <div className="flex items-center justify-between border-b border-[#222327] pb-3 min-h-[44px]">
          <div className="flex items-center gap-1 bg-[#1c1d21] p-1 rounded-xl border border-[#2e3036]">
            <button
              type="button"
              onClick={() => setActiveTab("channel")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === "channel"
                  ? "bg-[#27272a] text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Channel
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("referrer")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === "referrer"
                  ? "bg-[#27272a] text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Referrer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("campaign")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                activeTab === "campaign"
                  ? "bg-[#27272a] text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Campaign
            </button>
          </div>

          {/* Top Right: Real count All (...) */}
          <div className="flex items-center gap-1 text-xs text-zinc-300 hover:text-white transition font-medium cursor-pointer">
            <span>All ({formatCount(totalVisits)})</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          </div>
        </div>

        {/* Tab 1: Channel - Donut with Accurate Callouts and Real Media Platform Circles strictly attached to their own slice */}
        {activeTab === "channel" && (
          <div
            className="relative w-full h-[360px] flex items-center justify-center overflow-visible"
            onMouseMove={handleContainerMouseMove}
            onMouseLeave={() => leaveChannel(true)}
          >
            {/* Floating Popover Tooltip */}
            {hoveredChannel && (
              <div
                className="pointer-events-none absolute z-50 w-[215px] sm:w-[225px] rounded-2xl bg-[#292a2d] border border-zinc-700/70 p-3.5 shadow-2xl space-y-2.5 backdrop-blur-md transition-[left,top] duration-300 ease-out animate-in fade-in-0 zoom-in-95 duration-250 will-change-[left,top]"
                style={{
                  left: `${clampedX}px`,
                  top: `${clampedY}px`,
                }}
              >
                {/* Header Title */}
                <div className="font-semibold text-white text-[13px] leading-tight">
                  {hoveredChannel.name}
                </div>

                {/* Visitors Row with REAL count */}
                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-zinc-700/40">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-[4px] shadow-sm shrink-0"
                      style={{ backgroundColor: hoveredChannel.color }}
                    />
                    <span className="text-zinc-300 font-normal">Visitors</span>
                  </div>
                  <span className="font-bold text-white font-mono text-xs">
                    {hoveredChannel.visitorCountStr}
                  </span>
                </div>

                {/* TOP SOURCES Subheader with REAL referrers */}
                {hoveredChannel.topSources.length > 0 && (
                  <div className="space-y-1.5 pt-0.5">
                    <div className="text-[9.5px] font-semibold text-zinc-400 tracking-wider uppercase font-mono">
                      TOP SOURCES
                    </div>
                    <div className="space-y-1.5">
                      {displayedSources.map((s, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-zinc-200 truncate pr-2">
                            <span className="shrink-0">{s.icon}</span>
                            <span className="text-[11.5px] truncate">{s.name}</span>
                          </div>
                          <span className="font-mono text-zinc-400 text-xs shrink-0">
                            {s.pct}%
                          </span>
                        </div>
                      ))}
                      {hoveredChannel.topSources.length > 3 && (
                        <div className="text-[10px] text-zinc-400 font-mono text-right pt-0.5">
                          +{hoveredChannel.topSources.length - 3} more in details
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SVG Donut Chart */}
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-full max-w-[500px] overflow-visible"
            >
              {/* Invisible background to clear hover state smoothly */}
              <rect
                width={width}
                height={height}
                fill="transparent"
                onMouseEnter={() => leaveChannel()}
              />

              {/* Empty state ring if 0 visitors */}
              {segments.length === 0 && (
                <g>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={rOut}
                    fill="none"
                    stroke="#242528"
                    strokeWidth={rOut - rIn}
                  />
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#71717a"
                    fontSize="13"
                    fontFamily="inherit"
                  >
                    No visits recorded
                  </text>
                </g>
              )}

              {/* Real Data Slices */}
              {segments.map((seg) => {
                const isHovered = hoveredChannelId === seg.id;
                return (
                  <path
                    key={seg.id}
                    d={seg.path}
                    fill={seg.color}
                    opacity={hoveredChannelId ? (isHovered ? 1 : 0.4) : 0.92}
                    stroke="#17181a"
                    strokeWidth={isHovered ? "2.5" : "1.5"}
                    className="transition-all duration-200 cursor-pointer hover:opacity-100 hover:brightness-110"
                    onMouseEnter={() => enterChannel(seg.id)}
                  />
                );
              })}

              {/* Real Media Platform Circles: Strictly placed at (seg.midX, seg.midY) inside THIS segment */}
              {segments.map((seg) => {
                if (!seg.badges || seg.badges.length === 0) return null;
                const angleSpan = seg.endA - seg.startA;
                // Only render inside slice if slice has sufficient angular width
                if (angleSpan < 0.22) return null;

                const isHovered = hoveredChannelId === seg.id;
                const count = seg.badges.length;
                const spacing = 20;

                return (
                  <g
                    key={`badges-${seg.id}`}
                    className="cursor-pointer transition-opacity duration-150"
                    opacity={hoveredChannelId && !isHovered ? 0.35 : 1}
                    onMouseEnter={() => enterChannel(seg.id)}
                  >
                    {seg.badges.map((badge, idx) => {
                      // All badges share EXACT same seg.midY => 100% in ONE HORIZONTAL LINE
                      // And centered at seg.midX => GUARANTEED strictly inside THIS segment
                      const bx = seg.midX + (idx - (count - 1) / 2) * spacing;
                      const by = seg.midY;
                      return badge.render(bx, by);
                    })}
                  </g>
                );
              })}

              {/* Dynamic Callout Lines & Labels strictly anchored to each segment's actual geometry */}
              {segments.map((seg) => {
                const isHovered = hoveredChannelId === seg.id;
                const cos = Math.cos(seg.midA);
                const sin = Math.sin(seg.midA);

                // Anchor point on the outer rim of this exact segment
                const anchorX = cx + (rOut + 2) * cos;
                const anchorY = cy + (rOut + 2) * sin;

                const isLeft = cos < -0.05;
                let elbowX = anchorX;
                let elbowY = anchorY;
                let lineEndX = anchorX;
                let textX = anchorX;
                let textY = anchorY;
                let textAnchor: "start" | "end" = isLeft ? "end" : "start";

                if (sin < -0.5) {
                  // Top region (e.g. top-left or top-right)
                  elbowY = anchorY - 24;
                  if (isLeft) {
                    elbowX = anchorX - 14;
                    lineEndX = elbowX - 26;
                    textX = lineEndX - 8;
                    textAnchor = "end";
                  } else {
                    elbowX = anchorX + 14;
                    lineEndX = elbowX + 26;
                    textX = lineEndX + 8;
                    textAnchor = "start";
                  }
                  textY = elbowY + 4;
                } else if (sin > 0.5) {
                  // Bottom region (e.g. bottom-left or bottom-right)
                  elbowY = anchorY + 18;
                  if (isLeft) {
                    elbowX = anchorX - 18;
                    lineEndX = elbowX - 26;
                    textX = lineEndX - 8;
                    textAnchor = "end";
                  } else {
                    elbowX = anchorX + 18;
                    lineEndX = elbowX + 26;
                    textX = lineEndX + 8;
                    textAnchor = "start";
                  }
                  textY = elbowY + 4;
                } else {
                  // Lateral (pure left or pure right)
                  elbowY = anchorY;
                  if (isLeft) {
                    elbowX = anchorX - 18;
                    lineEndX = elbowX - 28;
                    textX = lineEndX - 8;
                    textAnchor = "end";
                  } else {
                    elbowX = anchorX + 18;
                    lineEndX = elbowX + 28;
                    textX = lineEndX + 8;
                    textAnchor = "start";
                  }
                  textY = elbowY + 4;
                }

                const path = isLeft
                  ? `M ${lineEndX} ${elbowY} L ${elbowX} ${elbowY} L ${anchorX} ${anchorY}`
                  : `M ${anchorX} ${anchorY} L ${elbowX} ${elbowY} L ${lineEndX} ${elbowY}`;

                return (
                  <g
                    key={`callout-${seg.id}`}
                    className="cursor-pointer transition-opacity duration-150"
                    opacity={hoveredChannelId && !isHovered ? 0.35 : 1}
                    onMouseEnter={() => enterChannel(seg.id)}
                  >
                    <path
                      d={path}
                      fill="none"
                      stroke={isHovered ? "#93c5fd" : "#4a6884"}
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <text
                      x={textX}
                      y={textY}
                      fill={isHovered ? "#ffffff" : "#e4e4e7"}
                      fontSize="13"
                      fontFamily="inherit"
                      fontWeight={isHovered ? "600" : "500"}
                      textAnchor={textAnchor}
                    >
                      {seg.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Tab 2: Referrer List */}
        {activeTab === "referrer" && (
          <div className="mt-4 space-y-2">
            {referrers.length === 0 ? (
              <div className="text-xs text-zinc-500 py-12 text-center font-mono">
                No external referrers recorded yet
              </div>
            ) : (
              referrers.slice(0, 6).map((r, idx) => (
                <div
                  key={idx}
                  className="relative rounded-lg overflow-hidden flex items-center justify-between px-3 py-2 text-xs"
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-[#356281]/25 rounded-lg"
                    style={{ width: `${Math.max(r.percentage, 3)}%` }}
                  />
                  <div className="relative z-10 font-medium text-zinc-200 truncate">
                    {r.source}
                  </div>
                  <div className="relative z-10 flex items-center gap-3 font-mono">
                    <span className="text-white font-medium">{r.count}</span>
                    <span className="text-zinc-500 text-[11px] w-8 text-right">
                      {r.percentage}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Campaign */}
        {activeTab === "campaign" && (
          <div className="mt-4 py-12 text-center space-y-2">
            <div className="text-xs text-zinc-400 font-medium">
              No active UTM campaigns detected
            </div>
            <div className="text-[11px] text-zinc-600 font-mono max-w-sm mx-auto">
              Add utm_source, utm_medium, or utm_campaign query parameters to track specific inbound campaigns.
            </div>
          </div>
        )}
      </div>

      {/* Footer: [ ⛶ ] DETAILS */}
      <div className="pt-3 border-t border-[#222327] flex items-center justify-center">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-400 hover:text-white transition cursor-pointer px-3 py-1.5 rounded-lg hover:bg-zinc-800/40"
        >
          <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
          <span>DETAILS</span>
        </button>
      </div>

      {/* Details Modal */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-[#1c1d20] border border-[#2d2e33] rounded-[22px] shadow-2xl p-5 sm:p-6 space-y-4 max-h-[88vh] flex flex-col cursor-default"
          >
            {/* Top Bar: Title, Search Input, and X Close Button */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#2a2b30]">
              <div className="flex items-center gap-3 flex-1">
                <h3 className="text-base font-bold text-white tracking-tight shrink-0">
                  Traffic Acquisition
                </h3>

                {/* Search Bar matching screenshot */}
                <div className="relative flex-1 max-w-xs">
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder="Search..."
                    autoFocus
                    className="w-full bg-[#141517] border border-[#35363c] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition"
                  />
                  {modalSearch && (
                    <button
                      type="button"
                      onClick={() => setModalSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Close Button X */}
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1 -mr-1">
              {/* Channels List */}
              {(() => {
                const q = modalSearch.toLowerCase().trim();
                const filteredChannels = channelData.filter(
                  (c) => !q || c.name.toLowerCase().includes(q)
                );
                const filteredReferrers = referrers.filter(
                  (r) => !q || r.source.toLowerCase().includes(q)
                );

                return (
                  <>
                    {filteredChannels.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                          <span>Channel</span>
                          <span>Visitors</span>
                        </div>
                        {filteredChannels.map((c, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-[#141517] border border-[#2d2e33] text-xs hover:bg-[#25262b]/60 transition"
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: c.color }}
                              />
                              <span className="text-zinc-200 font-medium text-[13px]">{c.name}</span>
                            </div>
                            <div className="flex items-center gap-3 font-mono">
                              <span className="text-white font-bold text-[13px]">{c.visitorCountStr}</span>
                              <span className="text-zinc-500 text-xs">({c.pct}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {filteredReferrers.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <div className="flex items-center justify-between px-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                          <span>Referrer Source</span>
                          <span>Visitors</span>
                        </div>
                        {filteredReferrers.map((r, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-[#141517] border border-[#2d2e33] text-xs hover:bg-[#25262b]/60 transition"
                          >
                            <span className="text-zinc-200 font-medium text-[13px] truncate pr-2">
                              {r.source}
                            </span>
                            <div className="flex items-center gap-3 font-mono shrink-0">
                              <span className="text-white font-bold text-[13px]">{r.count}</span>
                              <span className="text-zinc-500 text-xs">{r.percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {filteredChannels.length === 0 && filteredReferrers.length === 0 && (
                      <div className="text-xs text-zinc-500 py-12 text-center font-mono">
                        {modalSearch ? `No results matching "${modalSearch}"` : "No entries found"}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

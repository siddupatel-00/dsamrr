"use client";

import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Monitor,
  Tablet,
  Compass,
  Globe,
  Flame,
  Terminal,
  Laptop,
  ArrowRight,
  ExternalLink,
  Search,
  X,
} from "lucide-react";

export interface BreakdownItem {
  label: string;
  count: number;
  percentage: number;
  sublabel?: string;
  code?: string;
}

export interface TabOption {
  id: string;
  label: string;
  items: BreakdownItem[];
}

interface PlausibleBreakdownCardProps {
  tabs: TabOption[];
  defaultTabId?: string;
  emptyMessage?: string;
  detailsModalTitle?: string;
}

// Convert 2-letter country code or common country name to flag emoji
function getCountryFlag(countryOrCode: string): string {
  if (!countryOrCode) return "🌐";
  const str = countryOrCode.trim();

  // If already 2 letters
  if (str.length === 2 && /^[a-zA-Z]{2}$/.test(str)) {
    const codePoints = str
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  const nameMap: Record<string, string> = {
    "united states": "US",
    usa: "US",
    india: "IN",
    germany: "DE",
    "united kingdom": "GB",
    uk: "GB",
    canada: "CA",
    france: "FR",
    australia: "AU",
    netherlands: "NL",
    singapore: "SG",
    japan: "JP",
    brazil: "BR",
    spain: "ES",
    italy: "IT",
    sweden: "SE",
    poland: "PL",
    ukraine: "UA",
    indonesia: "ID",
    vietnam: "VN",
    turkey: "TR",
    switzerland: "CH",
    ireland: "IE",
  };

  const code = nameMap[str.toLowerCase()];
  if (code) {
    const codePoints = code
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }

  return "🌐";
}

// Helper to get device/browser/os icon
function getItemIcon(label: string, tabId: string) {
  const l = label.toLowerCase();
  if (tabId === "device") {
    if (l.includes("mobile") || l.includes("phone")) return <Smartphone className="w-3.5 h-3.5 text-zinc-400" />;
    if (l.includes("tablet") || l.includes("ipad")) return <Tablet className="w-3.5 h-3.5 text-zinc-400" />;
    return <Monitor className="w-3.5 h-3.5 text-zinc-400" />;
  }

  if (tabId === "browser") {
    if (l.includes("safari")) return <Compass className="w-3.5 h-3.5 text-blue-400" />;
    if (l.includes("firefox")) return <Flame className="w-3.5 h-3.5 text-amber-400" />;
    if (l.includes("chrome")) return <Globe className="w-3.5 h-3.5 text-emerald-400" />;
    return <Globe className="w-3.5 h-3.5 text-zinc-400" />;
  }

  if (tabId === "os") {
    if (l.includes("mac") || l.includes("ios") || l.includes("apple")) return <Laptop className="w-3.5 h-3.5 text-zinc-300" />;
    if (l.includes("android")) return <Smartphone className="w-3.5 h-3.5 text-emerald-400" />;
    if (l.includes("linux")) return <Terminal className="w-3.5 h-3.5 text-yellow-400" />;
    if (l.includes("windows")) return <Monitor className="w-3.5 h-3.5 text-sky-400" />;
    return <Monitor className="w-3.5 h-3.5 text-zinc-400" />;
  }

  return null;
}

export function PlausibleBreakdownCard({
  tabs,
  defaultTabId,
  emptyMessage = "No data recorded yet",
  detailsModalTitle,
}: PlausibleBreakdownCardProps) {
  const [activeTabId, setActiveTabId] = useState<string>(
    defaultTabId || (tabs.length > 0 ? tabs[0].id : "")
  );
  const [showAllModal, setShowAllModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const currentTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const items = currentTab?.items || [];
  const previewItems = items.slice(0, 6);

  // Filter items in modal when user searches
  const filteredModalItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.label.toLowerCase().includes(q) ||
      (item.sublabel && item.sublabel.toLowerCase().includes(q)) ||
      (item.code && item.code.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    if (!showAllModal) {
      setSearchQuery("");
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowAllModal(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAllModal]);

  const formatCount = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}k`;
    return num.toLocaleString();
  };

  return (
    <div className="w-full rounded-[22px] bg-[#17181a] border border-[#242528] p-5 sm:p-6 space-y-4 shadow-xl select-none font-sans flex flex-col justify-between">
      <div>
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-[#222327] pb-3 min-h-[44px]">
          <div className="flex items-center gap-1 bg-[#1c1d21] p-1 rounded-xl border border-[#2e3036]">
            {tabs.map((tab) => {
              const active = activeTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    active
                      ? "bg-[#27272a] text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
            Visitors
          </span>
        </div>

        {/* Rows with horizontal proportional background bars */}
        <div className="mt-4 space-y-2">
          {previewItems.length === 0 ? (
            <div className="text-xs text-zinc-500 py-8 text-center font-mono">
              {emptyMessage}
            </div>
          ) : (
            previewItems.map((item, idx) => {
              const icon = getItemIcon(item.label, activeTabId);
              const isLocationTab = activeTabId === "country" || activeTabId === "city";
              const flag = isLocationTab ? getCountryFlag(item.code || item.label) : null;

              return (
                <div
                  key={idx}
                  className="group relative rounded-lg overflow-hidden flex items-center justify-between px-3 py-2 text-xs transition hover:bg-zinc-800/30"
                >
                  {/* Proportional background pill bar (Screenshot 3 style) */}
                  <div
                    className="absolute inset-y-0 left-0 bg-sky-500/15 rounded-lg transition-all duration-500 pointer-events-none group-hover:bg-sky-500/25"
                    style={{ width: `${Math.max(item.percentage, 3)}%` }}
                  />

                  {/* Item Label + Icon/Flag */}
                  <div className="relative z-10 flex items-center gap-2.5 truncate pr-3">
                    {flag && (
                      <span className="text-sm shrink-0 leading-none">
                        {flag}
                      </span>
                    )}
                    {icon && <span className="shrink-0">{icon}</span>}
                    <span className="font-medium text-zinc-200 truncate">
                      {item.label}
                    </span>
                    {item.sublabel && (
                      <span className="text-[10px] text-zinc-500 truncate hidden sm:inline">
                        ({item.sublabel})
                      </span>
                    )}
                  </div>

                  {/* Count & Percentage */}
                  <div className="relative z-10 flex items-center gap-3 shrink-0 font-mono">
                    <span className="text-white font-medium">
                      {formatCount(item.count)}
                    </span>
                    <span className="text-zinc-500 text-[11px] w-9 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Details Footer Link (Exact Screenshot 1 & 3 style) */}
      <div className="pt-2 border-t border-zinc-800/40 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => setShowAllModal(true)}
          className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
        >
          <span className="w-3 h-3 border border-zinc-600 rounded-[2px] inline-flex items-center justify-center text-[9px] leading-none">
            +
          </span>
          <span>Details</span>
        </button>
        <span className="text-[11px] font-mono text-zinc-500">
          Total: {items.length} {items.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {/* Details Modal */}
      {showAllModal && (
        <div
          onClick={() => setShowAllModal(false)}
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
                  {currentTab.label}
                </h3>

                {/* Search Bar matching screenshot */}
                <div className="relative flex-1 max-w-xs">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    autoFocus
                    className="w-full bg-[#141517] border border-[#35363c] rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
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
                onClick={() => setShowAllModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subheader Column Labels */}
            <div className="flex items-center justify-between px-3 text-[11px] font-semibold text-zinc-400 tracking-wider">
              <span>{currentTab.label}</span>
              <span>Visitors</span>
            </div>

            {/* List of items */}
            <div className="overflow-y-auto space-y-1 flex-1 pr-1 -mr-1">
              {filteredModalItems.length === 0 ? (
                <div className="text-xs text-zinc-500 py-12 text-center font-mono">
                  {searchQuery ? `No results matching "${searchQuery}"` : "No entries found"}
                </div>
              ) : (
                filteredModalItems.map((item, idx) => {
                  const icon = getItemIcon(item.label, activeTabId);
                  const isLocationTab = activeTabId === "country" || activeTabId === "city";
                  const flag = isLocationTab ? getCountryFlag(item.code || item.label) : null;

                  return (
                    <div
                      key={idx}
                      className="relative rounded-xl overflow-hidden flex items-center justify-between px-3 py-2.5 text-xs hover:bg-[#25262b]/60 transition"
                    >
                      <div className="relative z-10 flex items-center gap-3 truncate pr-3">
                        {flag && <span className="text-base shrink-0 leading-none">{flag}</span>}
                        {icon && <span className="shrink-0">{icon}</span>}
                        <span className="font-medium text-zinc-200 truncate text-[13px]">
                          {item.label}
                        </span>
                        {item.sublabel && (
                          <span className="text-[11px] text-zinc-500 truncate">
                            ({item.sublabel})
                          </span>
                        )}
                      </div>
                      <div className="relative z-10 flex items-center gap-3 shrink-0 font-mono">
                        <span className="text-zinc-200 font-medium text-[13px]">
                          {formatCount(item.count)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

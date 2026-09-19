"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Globe, ArrowLeft, RefreshCw, Lock, Key, AlertCircle } from "lucide-react";
import { useAnalyticsAuth } from "@/hooks/useAnalyticsAuth";
import { PlausibleChartCard } from "@/components/PlausibleChartCard";
import {
  PlausibleBreakdownCard,
  BreakdownItem,
  TabOption,
} from "@/components/PlausibleBreakdownCard";
import { TrafficDonutCard } from "@/components/TrafficDonutCard";
import { RangeOption } from "@/components/PlausibleChartCard";

interface LocationItem {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  visitCount: number;
  referrer: string;
  lastVisitedAt: string;
}

interface SourceItem {
  source: string;
  count: number;
  percentage: number;
}

interface ChannelItem {
  name: string;
  count: number;
  percentage: number;
}

interface BreakdownMetric {
  name: string;
  count: number;
  percentage: number;
}

interface AnalyticsApiResponse {
  success: boolean;
  range?: string;
  totalViews: number;
  totalVisitors: number;
  onlineCount: number;
  uniqueCountries: number;
  uniqueCities: number;
  locations: LocationItem[];
  sources: SourceItem[];
  channels: ChannelItem[];
  devices: BreakdownMetric[];
  browsers: BreakdownMetric[];
  os: BreakdownMetric[];
}

export default function AnalyticsPage() {
  const { isUnlocked, loading: authLoading, unlock } = useAnalyticsAuth();
  const [selectedRange, setSelectedRange] = useState<RangeOption>("7d");
  const [data, setData] = useState<AnalyticsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [unlockErr, setUnlockErr] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const fetchAnalytics = async (rangeToFetch: RangeOption = selectedRange, isManual = false) => {
    if (!isUnlocked) return;
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/analytics/map?range=${rangeToFetch}&t=${Date.now()}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load analytics:", e);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isUnlocked) return;
    fetchAnalytics(selectedRange);
    const interval = setInterval(() => fetchAnalytics(selectedRange, false), 15000);
    return () => clearInterval(interval);
  }, [selectedRange, isUnlocked]);

  // Locations breakdown (Country & City tabs)
  const locationTabs: TabOption[] = useMemo(() => {
    if (!data?.locations) return [];

    // Group by country
    const countryMap = new Map<string, { count: number; code?: string }>();
    data.locations.forEach((loc) => {
      const country = loc.country || "Global";
      const existing = countryMap.get(country) || { count: 0, code: loc.countryCode };
      existing.count += loc.visitCount;
      if (loc.countryCode && !existing.code) existing.code = loc.countryCode;
      countryMap.set(country, existing);
    });

    const totalCountryVisits =
      Array.from(countryMap.values()).reduce((sum, c) => sum + c.count, 0) || 1;

    const countryItems: BreakdownItem[] = Array.from(countryMap.entries())
      .map(([country, info]) => ({
        label: country,
        count: info.count,
        percentage: Math.round((info.count / totalCountryVisits) * 100),
        code: info.code,
      }))
      .sort((a, b) => b.count - a.count);

    // Group by city
    const cityMap = new Map<string, { count: number; country: string; code?: string }>();
    data.locations.forEach((loc) => {
      const city = loc.city || "Unknown";
      const existing = cityMap.get(city) || {
        count: 0,
        country: loc.country,
        code: loc.countryCode,
      };
      existing.count += loc.visitCount;
      cityMap.set(city, existing);
    });

    const totalCityVisits =
      Array.from(cityMap.values()).reduce((sum, c) => sum + c.count, 0) || 1;

    const cityItems: BreakdownItem[] = Array.from(cityMap.entries())
      .map(([city, info]) => ({
        label: city,
        count: info.count,
        percentage: Math.round((info.count / totalCityVisits) * 100),
        sublabel: info.country,
        code: info.code,
      }))
      .sort((a, b) => b.count - a.count);

    return [
      { id: "country", label: "Country", items: countryItems },
      { id: "city", label: "City", items: cityItems },
    ];
  }, [data]);

  // Devices breakdown (Device, Browser, OS tabs)
  const deviceTabs: TabOption[] = useMemo(() => {
    if (!data) return [];

    const deviceItems: BreakdownItem[] = (data.devices || []).map((d) => ({
      label: d.name,
      count: d.count,
      percentage: d.percentage,
    }));

    const browserItems: BreakdownItem[] = (data.browsers || []).map((b) => ({
      label: b.name,
      count: b.count,
      percentage: b.percentage,
    }));

    const osItems: BreakdownItem[] = (data.os || []).map((o) => ({
      label: o.name,
      count: o.count,
      percentage: o.percentage,
    }));

    return [
      { id: "device", label: "Device", items: deviceItems },
      { id: "browser", label: "Browser", items: browserItems },
      { id: "os", label: "OS", items: osItems },
    ];
  }, [data]);

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400 font-mono text-xs">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Checking authorization...</span>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-[#141517] border border-[#242528] rounded-[24px] p-6 sm:p-8 shadow-2xl space-y-6 font-sans text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-zinc-300 shadow-inner">
            <Lock className="w-6 h-6 text-zinc-300" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Analytics Restricted
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
              This analytics dashboard is private. Please enter your authorized access key or visit the{" "}
              <Link href="/privacy" className="text-emerald-400 hover:underline font-medium">
                Privacy tab
              </Link>
              .
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!passInput.trim()) return;
              setUnlocking(true);
              setUnlockErr(null);
              const res = await unlock(passInput);
              setUnlocking(false);
              if (!res.success) {
                setUnlockErr(res.error || "Incorrect access key.");
              }
            }}
            className="space-y-4 pt-2 text-left"
          >
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                <Key className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                placeholder="Enter access key..."
                autoFocus
                className="w-full bg-[#0d0e10] border border-[#2d2e33] rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition"
              />
            </div>

            {unlockErr && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{unlockErr}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={unlocking || !passInput.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:cursor-not-allowed"
            >
              {unlocking ? "Verifying..." : "Unlock Analytics"}
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/map"
                className="text-[11px] text-cyan-400 hover:underline flex items-center justify-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>View Public 3D Visitor Map instead</span>
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6 px-2 sm:px-4 py-4 font-sans antialiased selection:bg-sky-500/30 selection:text-white">
      {/* Top Header Navigation - Simple & Minimalistic */}
      <div className="flex items-center justify-between border-b border-[#222327] pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-white">
            Analytics
          </h1>
          <button
            type="button"
            onClick={() => fetchAnalytics(selectedRange, true)}
            disabled={refreshing}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-sky-400" : ""}`}
            />
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/map"
            className="px-3 py-1.5 rounded-xl bg-[#1c1d21] hover:bg-[#25262c] border border-[#2e3036] text-xs font-medium text-zinc-300 hover:text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>3D Globe</span>
          </Link>
          <Link
            href="/"
            className="px-3 py-1.5 rounded-xl bg-[#1c1d21] hover:bg-[#25262c] border border-[#2e3036] text-xs font-medium text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Leaderboard</span>
          </Link>
        </div>
      </div>

      {/* Hero Chart Card (outbid.lol Pirsch exact layout) */}
      <PlausibleChartCard
        totalVisitors={data?.totalVisitors ?? 0}
        totalViews={data?.totalViews ?? 0}
        onlineCount={data?.onlineCount ?? 1}
        domainName="dsamrr.com"
        range={selectedRange}
        onRangeChange={(newRange) => {
          setSelectedRange(newRange);
          fetchAnalytics(newRange, false);
        }}
        onRefresh={() => fetchAnalytics(selectedRange, true)}
      />

      {/* Second Row: Locations & Traffic Sources Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Locations Card [Country] City */}
        <PlausibleBreakdownCard
          tabs={locationTabs}
          defaultTabId="country"
          emptyMessage="No location telemetry recorded yet"
          detailsModalTitle="All Locations Breakdown"
        />

        {/* Traffic Acquisition Donut Card [Channel] Referrer Campaign */}
        <TrafficDonutCard
          channels={data?.channels || []}
          referrers={data?.sources || []}
        />
      </div>

      {/* Third Row: Devices Breakdown [Device] Browser OS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlausibleBreakdownCard
          tabs={deviceTabs}
          defaultTabId="device"
          emptyMessage="No device telemetry recorded yet"
          detailsModalTitle="Devices & Browsers Breakdown"
        />

        {/* Minimalist Quick Insights / Overview */}
        <div className="w-full rounded-[22px] bg-[#17181a] border border-[#242528] p-5 sm:p-6 space-y-4 shadow-xl select-none font-sans flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#222327] pb-3 min-h-[44px]">
              <div className="flex items-center gap-1 bg-[#1c1d21] p-1 rounded-xl border border-[#2e3036]">
                <span className="px-3 py-1 rounded-lg text-xs font-medium bg-[#27272a] text-white shadow-sm">
                  Overview
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                Telemetry
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-[#1c1d21] border border-[#2e3036] space-y-1">
                <span className="text-[11px] text-zinc-400 font-normal">
                  Total Page Views
                </span>
                <div className="text-xl font-bold text-white font-mono">
                  {(data?.totalViews ?? 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-zinc-500">
                  All visits & refreshes
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1c1d21] border border-[#2e3036] space-y-1">
                <span className="text-[11px] text-zinc-400 font-normal">
                  Unique Visitors
                </span>
                <div className="text-xl font-bold text-sky-400 font-mono">
                  {(data?.totalVisitors ?? 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-zinc-500">
                  Distinct people
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1c1d21] border border-[#2e3036] space-y-1">
                <span className="text-[11px] text-zinc-400 font-normal">
                  Tracked Cities
                </span>
                <div className="text-xl font-bold text-zinc-200 font-mono">
                  {data?.uniqueCities ?? 0}
                </div>
                <div className="text-[10px] text-zinc-500">
                  Global locations
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#1c1d21] border border-[#2e3036] space-y-1">
                <span className="text-[11px] text-zinc-400 font-normal">
                  Primary Referrer
                </span>
                <div className="text-base font-bold text-white truncate font-mono">
                  {data?.sources?.[0]?.source || "Direct"}
                </div>
                <div className="text-[10px] text-zinc-500">
                  Leading source
                </div>
              </div>
            </div>
          </div>

          {/* Matching Bottom Line to align card bottoms */}
          <div className="pt-2 border-t border-zinc-800/40 flex items-center justify-between text-xs">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              Live Aggregate
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              4 Metrics
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

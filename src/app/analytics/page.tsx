"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Globe,
  MapPin,
  TrendingUp,
  Activity,
  ArrowLeft,
  Users,
  Compass,
  Radio,
  Share2,
} from "lucide-react";

interface LocationItem {
  id: string;
  city: string;
  country: string;
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

interface AnalyticsData {
  success: boolean;
  totalVisitors: number;
  uniqueCountries: number;
  uniqueCities: number;
  locations: LocationItem[];
  sources: SourceItem[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/analytics/map");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 10000);
    return () => clearInterval(interval);
  }, []);

function getFullCountryName(country?: string): string {
  if (!country) return "Global / Unknown";
  const trimmed = country.trim();
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

  // Aggregate country counts
  const countryBreakdown = React.useMemo(() => {
    if (!data?.locations) return [];
    const map = new Map<string, { country: string; totalVisits: number; cities: Set<string> }>();
    
    data.locations.forEach((loc) => {
      const fullName = getFullCountryName(loc.country);
      const existing = map.get(fullName) || { country: fullName, totalVisits: 0, cities: new Set() };
      existing.totalVisits += loc.visitCount;
      if (loc.city) existing.cities.add(loc.city);
      map.set(fullName, existing);
    });

    const total = Array.from(map.values()).reduce((sum, c) => sum + c.totalVisits, 0) || 1;

    return Array.from(map.values())
      .map((c) => ({
        country: c.country,
        totalVisits: c.totalVisits,
        cityCount: c.cities.size,
        percentage: Math.round((c.totalVisits / total) * 100),
      }))
      .sort((a, b) => b.totalVisits - a.totalVisits);
  }, [data]);

  // Sorted cities breakdown
  const cityBreakdown = React.useMemo(() => {
    if (!data?.locations) return [];
    const total = data.locations.reduce((sum, l) => sum + l.visitCount, 0) || 1;
    return [...data.locations]
      .sort((a, b) => b.visitCount - a.visitCount)
      .map((l) => ({
        city: l.city,
        country: getFullCountryName(l.country),
        visitCount: l.visitCount,
        referrer: l.referrer,
        percentage: Math.round((l.visitCount / total) * 100),
      }));
  }, [data]);

  const topSource = data?.sources?.[0]?.source || "Direct";

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 py-6 px-4 max-w-5xl mx-auto space-y-6 font-mono selection:bg-zinc-800 selection:text-white">
      {/* Header Navigation */}
      <div className="flex items-center justify-end gap-2 border-b border-zinc-800/80 pb-3">
        <Link
          href="/map"
          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>3D Globe View</span>
        </Link>
        <Link
          href="/"
          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Leaderboard</span>
        </Link>
      </div>

      {/* Top 4 Key Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Visitors */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur space-y-1.5">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>Total Visitors</span>
            <Users className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {loading ? "..." : (data?.totalVisitors ?? 0)}
          </div>
          <div className="text-[10px] text-zinc-500">
            Across global sessions
          </div>
        </div>

        {/* Unique Countries */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur space-y-1.5">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>Countries</span>
            <Globe className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {loading ? "..." : (data?.uniqueCountries ?? 0)}
          </div>
          <div className="text-[10px] text-zinc-500">
            Worldwide regions
          </div>
        </div>

        {/* Unique Cities */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur space-y-1.5">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>Cities</span>
            <MapPin className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {loading ? "..." : (data?.uniqueCities ?? 0)}
          </div>
          <div className="text-[10px] text-zinc-500">
            Geolocated hubs
          </div>
        </div>

        {/* Top Traffic Source */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur space-y-1.5">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span>Top Referrer</span>
            <Share2 className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-base font-bold text-white truncate tracking-tight">
            {loading ? "..." : topSource}
          </div>
          <div className="text-[10px] text-zinc-500">
            Leading traffic source
          </div>
        </div>
      </div>

      {/* Grid: Countries & Cities Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Countries Breakdown Table */}
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-zinc-800/60 pb-2">
            <span className="font-bold text-zinc-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Countries ({countryBreakdown.length})</span>
            </span>
            <span className="text-[10px] text-zinc-500">Visits (% of total)</span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-xs text-zinc-500 py-4 text-center">Loading countries...</div>
            ) : countryBreakdown.length === 0 ? (
              <div className="text-xs text-zinc-500 py-4 text-center">No telemetry recorded yet</div>
            ) : (
              countryBreakdown.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/70 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-200">
                      {item.country}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {item.totalVisits} <span className="text-zinc-500 text-[10px] font-normal">({item.percentage}%)</span>
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
                      style={{ width: `${Math.max(item.percentage, 4)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>{item.cityCount} {item.cityCount === 1 ? "city" : "cities"}</span>
                    <span>Rank #{idx + 1}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cities Breakdown Table */}
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-zinc-800/60 pb-2">
            <span className="font-bold text-zinc-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-yellow-400" />
              <span>Cities ({cityBreakdown.length})</span>
            </span>
            <span className="text-[10px] text-zinc-500">Visits (% of total)</span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-xs text-zinc-500 py-4 text-center">Loading cities...</div>
            ) : cityBreakdown.length === 0 ? (
              <div className="text-xs text-zinc-500 py-4 text-center">No telemetry recorded yet</div>
            ) : (
              cityBreakdown.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800/70 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-zinc-500 text-[10px]">#{idx + 1}</span>
                      <span className="font-medium text-zinc-200 truncate">
                        {item.city}
                      </span>
                      <span className="text-zinc-500 text-[10px]">({item.country})</span>
                    </div>
                    <span className="text-emerald-400 font-bold shrink-0 ml-2">
                      {item.visitCount} <span className="text-zinc-500 text-[10px] font-normal">({item.percentage}%)</span>
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-500 to-emerald-500 rounded-full"
                      style={{ width: `${Math.max(item.percentage, 4)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>Source: {item.referrer}</span>
                    <span>Active hub</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Traffic Sources Breakdown */}
      {data?.sources && data.sources.length > 0 && (
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-zinc-800/60 pb-2">
            <span className="font-bold text-zinc-300 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Traffic Sources</span>
            </span>
            <span className="text-[10px] text-zinc-500">Referrals Breakdown</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.sources.map((s, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/70 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-200">{s.source}</span>
                  <span className="text-emerald-400 font-bold">{s.count}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${Math.max(s.percentage, 5)}%` }}
                  />
                </div>
                <div className="text-right text-[10px] text-zinc-500">
                  {s.percentage}% of traffic
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

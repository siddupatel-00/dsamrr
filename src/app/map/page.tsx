"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Globe as GlobeIcon,
  X,
  Radio,
  Share2,
  MapPin,
  Eye,
  Activity,
  Flame,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { InteractiveGlobe, LocationMarker } from "@/components/InteractiveGlobe";
import Starfield from "@/components/Starfield";

interface SourceItem {
  source: string;
  count: number;
  percentage: number;
}

export default function MapTelemetryPage() {
  const [loading, setLoading] = useState(true);
  const [totalVisitors, setTotalVisitors] = useState<number>(0);
  const [uniqueCountries, setUniqueCountries] = useState<number>(0);
  const [uniqueCities, setUniqueCities] = useState<number>(0);
  const [locations, setLocations] = useState<LocationMarker[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [activeLocation, setActiveLocation] = useState<LocationMarker | null>(null);

  const fetchTelemetry = async () => {
    try {
      const res = await fetch("/api/analytics/map");
      const data = await res.json();
      if (data.success) {
        setTotalVisitors(data.totalVisitors || 0);
        setUniqueCountries(data.uniqueCountries || 0);
        setUniqueCities(data.uniqueCities || 0);
        setLocations(data.locations || []);
        setSources(data.sources || []);
      }
    } catch (e) {
      console.error("Telemetry fetch note:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 top-14 w-screen h-[calc(100vh-3.5rem)] bg-black overflow-hidden select-none">
      {/* 0. Deep Space Canvas Starfield */}
      <Starfield />

      {/* 1. Full-Screen Interactive Vector Map */}
      <div className="absolute inset-0 w-full h-full z-10">
        <InteractiveGlobe
          locations={locations}
          activeLocation={activeLocation}
          onSelectLocation={setActiveLocation}
        />
      </div>

      {/* 2. Top-Left Floating Glassmorphic Telemetry Card (Compact) */}
      <div className="absolute top-4 left-4 z-20 w-auto max-w-[280px] p-3 rounded-2xl bg-[#09090b]/85 border border-zinc-800/80 shadow-2xl backdrop-blur-xl font-mono text-[11px] space-y-2 pointer-events-auto">
        {/* Brand Row */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-950/80 border border-emerald-700/80 flex items-center justify-center text-emerald-400 shadow-sm">
            <Activity className="w-3 h-3" />
          </div>
          <span className="font-bold text-white tracking-wide text-xs">DSAMRR</span>
        </div>

        {/* Visitor Count */}
        <div className="flex items-center gap-1.5 text-zinc-200 font-mono">
          <span className="font-bold text-emerald-400">
            {loading ? "..." : totalVisitors}
          </span>
          <span className="text-zinc-300">visitors across the world</span>
        </div>

        {/* Metric Pill Breakdowns */}
        <div className="pt-1.5 border-t border-zinc-800/70 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-800 text-zinc-300 text-[10px]">
              {uniqueCountries} {uniqueCountries === 1 ? "country" : "countries"}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-800 text-zinc-300 text-[10px]">
              {uniqueCities} {uniqueCities === 1 ? "city" : "cities"}
            </span>
          </div>
          <Link
            href="/analytics"
            className="text-yellow-400 hover:text-yellow-300 underline text-[10px] font-mono decoration-yellow-400/80 hover:decoration-yellow-300 transition shrink-0 ml-1 cursor-pointer"
          >
            show analytics
          </Link>
        </div>
      </div>



      {/* 4. Top-Right Close Button */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-auto font-mono">
        <Link
          href="/"
          className="w-9 h-9 rounded-2xl bg-[#09090b]/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center shadow-2xl transition backdrop-blur cursor-pointer"
          title="Back to Leaderboard"
        >
          <X className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

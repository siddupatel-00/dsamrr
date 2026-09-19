"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { InteractiveGlobe, LocationMarker } from "@/components/InteractiveGlobe";
import Starfield from "@/components/Starfield";

export default function MapTelemetryPage() {
  const [locations, setLocations] = useState<LocationMarker[]>([]);
  const [activeLocation, setActiveLocation] = useState<LocationMarker | null>(null);

  const fetchTelemetry = async () => {
    try {
      const res = await fetch("/api/analytics/map");
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations || []);
      }
    } catch (e) {
      console.error("Telemetry fetch note:", e);
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

      {/* 2. Top-Right Close Button */}
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

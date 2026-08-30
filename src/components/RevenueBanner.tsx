"use client";

import React, { useEffect, useState } from "react";

interface RevenueBannerProps {
  initialRevenue?: number;
  launchHoursAgo?: number;
}

export function RevenueBanner({
  initialRevenue = 0,
  launchHoursAgo = 1,
}: RevenueBannerProps) {
  const [revenue, setRevenue] = useState(initialRevenue);
  const [hours, setHours] = useState(launchHoursAgo);

  const fetchRevenue = async () => {
    try {
      const res = await fetch("/api/ads");
      const data = await res.json();
      if (data.success && typeof data.totalRevenue === "number") {
        setRevenue(data.totalRevenue);
      }
    } catch (e) {
      console.error("Failed to fetch revenue:", e);
    }
  };

  useEffect(() => {
    const launchDate = new Date("2026-08-30T00:00:00Z").getTime();
    const now = Date.now();
    const diffHours = Math.max(1, Math.floor((now - launchDate) / (1000 * 60 * 60)));
    setHours(diffHours);

    fetchRevenue();

    // 1. Instant event listener for local payment completion
    const handleRevenueUpdate = () => {
      fetchRevenue();
    };

    window.addEventListener("revenueUpdated", handleRevenueUpdate);
    window.addEventListener("adBooked", handleRevenueUpdate);

    // 2. Continuous real-time 5-second polling for live global payments
    const pollInterval = setInterval(fetchRevenue, 5000);

    return () => {
      window.removeEventListener("revenueUpdated", handleRevenueUpdate);
      window.removeEventListener("adBooked", handleRevenueUpdate);
      clearInterval(pollInterval);
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center pt-32 sm:pt-48 pb-20 text-center space-y-3.5 font-sans select-none">
      {/* Top Tagline */}
      <div className="text-xs sm:text-sm text-zinc-400 font-normal tracking-wide">
        This <span className="text-[#ff6154] font-medium">website</span> made
      </div>

      {/* Hero Revenue Card - Dark Theme Styled to match DSAMRR */}
      <div className="relative group">
        {/* Subtle glow */}
        <div className="absolute -inset-0.5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-orange-500/10 via-[#ff6154]/10 to-amber-500/10 blur-md opacity-50 group-hover:opacity-75 transition duration-300" />

        {/* Card Pill in dark theme */}
        <div className="relative px-8 sm:px-12 py-3.5 sm:py-4.5 rounded-2xl sm:rounded-3xl bg-[#0e0f14] border border-[#1f2128] text-white shadow-2xl flex items-center justify-center">
          <span className="text-3xl sm:text-5xl font-black font-sans tracking-tight flex items-center">
            <span className="text-[#ff6154] mr-2 font-bold select-none">
              ₹
            </span>
            <span className="text-white tracking-wide font-extrabold font-mono">
              {revenue.toLocaleString("en-IN")}
            </span>
          </span>
        </div>
      </div>

      {/* Bottom Subtitle */}
      <div className="text-[11px] sm:text-xs text-zinc-500 font-mono space-y-1">
        <div>since launch</div>
        <div className="pt-0.5">
          report problem{" "}
          <a
            href="https://x.com/Zenitsu_T7"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-400 hover:text-yellow-300 font-medium hover:underline transition"
          >
            click here
          </a>
        </div>
      </div>
    </div>
  );
}

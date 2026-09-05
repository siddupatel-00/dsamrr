"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export function VisitorCounter() {
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  useEffect(() => {
    const trackUniqueVisitor = async () => {
      try {
        const isTracked = localStorage.getItem("dsamrr_unique_visitor_id");
        const method = isTracked ? "GET" : "POST";
        const referrer = typeof document !== "undefined" ? document.referrer : "";

        const res = await fetch("/api/analytics", {
          method,
          headers: { "Content-Type": "application/json" },
          body: method === "POST" ? JSON.stringify({ referrer }) : undefined,
        });
        const data = await res.json();
        if (data.success && typeof data.totalVisitors === "number") {
          setVisitorCount(data.totalVisitors);
          if (!isTracked) {
            localStorage.setItem("dsamrr_unique_visitor_id", "v_" + Math.random().toString(36).substring(2, 10));
          }
        }
      } catch (err) {
        setVisitorCount(1);
      }
    };

    trackUniqueVisitor();
  }, []);

  return (
    <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-zinc-400">
      <span>Total unique visitors since launch:</span>
      <span className="text-zinc-200 font-bold">
        {visitorCount !== null ? visitorCount.toLocaleString() : "..."}
      </span>
      <Link
        href="/map"
        className="text-yellow-400 hover:text-yellow-300 underline underline-offset-2 ml-1 text-xs font-mono font-medium transition cursor-pointer"
      >
        see here
      </Link>
    </div>
  );
}

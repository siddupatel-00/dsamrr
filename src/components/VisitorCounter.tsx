"use client";

import React, { useEffect, useState } from "react";

export function VisitorCounter() {
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  useEffect(() => {
    const trackUniqueVisitor = async () => {
      try {
        const isTracked = localStorage.getItem("dsamrr_unique_visitor_id");
        const method = isTracked ? "GET" : "POST";

        const res = await fetch("/api/analytics", {
          method,
          headers: { "Content-Type": "application/json" },
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
    </div>
  );
}

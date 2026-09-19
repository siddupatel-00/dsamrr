"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function VisitorCounter() {
  const pathname = usePathname();

  useEffect(() => {
    const trackPageView = async () => {
      try {
        let visitorId = localStorage.getItem("dsamrr_unique_visitor_id");
        if (!visitorId || !/^[a-f0-9]{32}$/.test(visitorId)) {
          visitorId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          localStorage.setItem("dsamrr_unique_visitor_id", visitorId);
        }

        const referrer = typeof document !== "undefined" ? document.referrer : "";

        // Send POST on every page load, refresh, or route change so Total Views increments every time
        await fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referrer, visitorId }),
        });
      } catch {}
    };

    trackPageView();
  }, [pathname]);

  return null;
}

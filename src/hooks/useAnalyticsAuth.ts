"use client";

import { useState, useEffect, useCallback } from "react";

export function useAnalyticsAuth() {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = useCallback(async () => {
    try {
      // Fast optimistic check from localStorage
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("dsamrr_analytics_unlocked");
        if (cached === "true") {
          setIsUnlocked(true);
        }
      }

      const res = await fetch("/api/privacy/verify");
      const data = await res.json();
      const authenticated = Boolean(data.authenticated);

      setIsUnlocked(authenticated);
      if (typeof window !== "undefined") {
        if (authenticated) {
          localStorage.setItem("dsamrr_analytics_unlocked", "true");
        } else {
          localStorage.removeItem("dsamrr_analytics_unlocked");
        }
      }
    } catch {
      // Keep optimistic or false on network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener("dsamrr-analytics-auth-change", handleAuthChange);
    return () => {
      window.removeEventListener("dsamrr-analytics-auth-change", handleAuthChange);
    };
  }, [checkAuth]);

  const unlock = async (password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/privacy/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (data.success && data.authenticated) {
        setIsUnlocked(true);
        if (typeof window !== "undefined") {
          localStorage.setItem("dsamrr_analytics_unlocked", "true");
          window.dispatchEvent(new Event("dsamrr-analytics-auth-change"));
        }
        return { success: true };
      } else {
        return { success: false, error: data.error || "Invalid password / access key." };
      }
    } catch (err: any) {
      return { success: false, error: err.message || "Network error. Please try again." };
    }
  };

  const lock = async () => {
    try {
      await fetch("/api/privacy/verify", { method: "DELETE" });
    } catch {}

    setIsUnlocked(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("dsamrr_analytics_unlocked");
      window.dispatchEvent(new Event("dsamrr-analytics-auth-change"));
    }
  };

  return {
    isUnlocked,
    loading,
    unlock,
    lock,
    checkAuth,
  };
}

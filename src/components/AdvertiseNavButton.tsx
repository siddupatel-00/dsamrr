"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Megaphone,
  Plus,
  Calendar,
  Lock,
  AlertCircle,
  X,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { AdBookingModal } from "./AdSidebar";
import { STANDARD_AD_SLOTS } from "@/lib/adsData";

interface SlotStatus {
  slotId: string;
  label: string;
  isOccupied: boolean;
  isPrebooked: boolean;
  activeExpiresAt?: string;
  prebookedExpiresAt?: string;
  activeAdName?: string;
}

export function AdvertiseNavButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [slots, setSlots] = useState<SlotStatus[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchSlotStatuses = async () => {
    try {
      const res = await fetch("/api/ads");
      const data = await res.json();
      if (data.success) {
        const adsList: any[] = data.allAds || data.ads || [];
        const today = new Date().toISOString().split("T")[0];

        const mapped: SlotStatus[] = STANDARD_AD_SLOTS.map((slot) => {
          const activeAd = adsList.find(
            (a) => a.slotId === slot.id && a.startedAt <= today && a.expiresAt >= today
          );
          const prebookedAd = adsList.find(
            (a) => a.slotId === slot.id && a.startedAt > today
          );

          return {
            slotId: slot.id,
            label: slot.label,
            isOccupied: Boolean(activeAd),
            isPrebooked: Boolean(prebookedAd),
            activeExpiresAt: activeAd?.expiresAt,
            prebookedExpiresAt: prebookedAd?.expiresAt,
            activeAdName: activeAd?.name || slot.defaultName,
          };
        });

        setSlots(mapped);
      }
    } catch (e) {
      console.error("Failed to load slot status:", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSlotStatuses();
    }
  }, [isOpen]);

  const availableSlots = slots.filter((s) => !s.isOccupied);
  const allFilled = slots.length > 0 && availableSlots.length === 0;

  const handleSelectFreeSlot = (slot: SlotStatus) => {
    setSelectedSlot(slot.slotId);
    setIsOpen(false);
  };

  const handleGoToPrebook = () => {
    setIsOpen(false);
    router.push("/prebook");
  };

  const modalContent = isOpen && mounted ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-[#0e0f14] border border-[#1f2128] rounded-3xl p-6 sm:p-7 shadow-[0_30px_90px_rgba(0,0,0,0.9)] text-zinc-100 font-sans space-y-5 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f2128] pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
                <Megaphone className="w-4 h-4" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight font-sans">
                Advertise on DSAMRR
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Place your developer tool or project in front of active competitive programmers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {allFilled ? (
          <div className="space-y-5 py-4 text-center">
            <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-800/50 text-amber-300 text-xs sm:text-sm font-mono space-y-2 max-w-lg mx-auto">
              <div className="font-bold flex items-center justify-center gap-2 text-sm text-amber-400 font-sans">
                <span>⚠️</span>
                <span>Oops sorry, all 10 slots are currently occupied!</span>
              </div>
              <p className="text-zinc-300 font-sans text-xs leading-relaxed">
                Every active ad spot is currently running. You can pre-book any upcoming slot directly on our pre-book page to see exact expiration dates and guarantee your reservation.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoToPrebook}
              className="w-full max-w-md mx-auto py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xl font-sans"
            >
              <Calendar className="w-4 h-4" />
              <span>Go to Pre-Book Page (/prebook)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Free Spots Grid */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-300 font-mono">
                <span>🟢 Available Free Slots ({availableSlots.length} open today)</span>
                <span className="text-zinc-500 font-normal">Instant Activation</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                {availableSlots.map((slot) => (
                  <div
                    key={slot.slotId}
                    className="p-4 rounded-2xl border bg-emerald-950/20 border-emerald-800/60 hover:border-emerald-500 flex flex-col justify-between space-y-3 transition shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-zinc-100">{slot.label}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 border border-emerald-700 text-emerald-400 font-bold">
                        Free
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-sans leading-snug">
                      Vacant sidebar spot. Goes live immediately upon payment verification.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSelectFreeSlot(slot)}
                      className="w-full py-2 rounded-xl text-xs font-bold font-sans bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Claim Slot (₹20 / ₹35)</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Pre-Book Navigation Button */}
            <div className="pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={handleGoToPrebook}
                className="w-full py-3 rounded-2xl bg-[#14161f] hover:bg-[#1b1f2b] border border-[#262b3a] hover:border-amber-500 text-zinc-300 hover:text-white text-xs font-sans font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Want a specific occupied slot (Zens.AI, Watchgoose, etc.)? Pre-Book on /prebook</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Clean Navbar Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-100 transition px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 cursor-pointer shadow-sm"
      >
        <Megaphone className="w-3.5 h-3.5 text-emerald-400" />
        <span className="font-medium">Advertise</span>
      </button>

      {/* Render Modal via Portal directly to body */}
      {modalContent && typeof document !== "undefined" && createPortal(modalContent, document.body)}

      {/* Instant Free Slot Booking Modal */}
      {selectedSlot && (
        <AdBookingModal
          slotId={selectedSlot}
          isPrebook={false}
          onClose={() => setSelectedSlot(null)}
          onBooked={() => {
            setSelectedSlot(null);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

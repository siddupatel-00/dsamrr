"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Lock,
  Plus,
  Megaphone,
  ArrowLeft,
  AlertCircle,
  X,
} from "lucide-react";
import { AdBookingModal } from "@/components/AdSidebar";

interface SlotStatus {
  slotId: string;
  label: string;
  isOccupied: boolean;
  isPrebooked: boolean;
  activeExpiresAt?: string;
  prebookedExpiresAt?: string;
  activeAd?: {
    name: string;
    tagline: string;
    targetUrl: string;
    imageUrl?: string;
  };
  prebookedAd?: {
    name: string;
    tagline: string;
    targetUrl: string;
    imageUrl?: string;
  };
}

export default function AdsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [slots, setSlots] = useState<SlotStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isPrebookMode, setIsPrebookMode] = useState(false);
  const [prebookStartDate, setPrebookStartDate] = useState<string>("");
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const fetchSlotStatuses = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ads");
      const data = await res.json();
      if (data.success && data.slots) {
        setSlots(data.slots);
      }
    } catch (err) {
      console.error("Failed to load ads slots:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlotStatuses();
  }, []);

  const handleSlotClick = (slot: SlotStatus) => {
    setErrorNotice(null);

    if (!session?.user) {
      router.push(`/auth?callbackUrl=/ads`);
      return;
    }

    if (slot.isPrebooked) {
      setErrorNotice(`Sorry, ${slot.label} is already pre-booked by another advertiser. Please select another slot.`);
      return;
    }

    setSelectedSlot(slot.slotId);

    if (slot.isOccupied && slot.activeExpiresAt) {
      setIsPrebookMode(true);
      setPrebookStartDate(slot.activeExpiresAt);
    } else {
      setIsPrebookMode(false);
      setPrebookStartDate("");
    }
  };

  const leftSlots = slots.filter((s) => s.slotId.startsWith("left"));
  const rightSlots = slots.filter((s) => s.slotId.startsWith("right"));
  const occupiedCount = slots.filter((s) => s.isOccupied).length;
  const prebookedCount = slots.filter((s) => s.isPrebooked).length;

  const renderSlotCard = (slot: SlotStatus) => {
    const isAlreadyPrebooked = slot.isPrebooked;
    const isCurrentlyVacant = !slot.isOccupied && !slot.isPrebooked;
    const isPrebookable = slot.isOccupied && !slot.isPrebooked;

    return (
      <div
        key={slot.slotId}
        className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 shadow-xl transition duration-200 ${
          isAlreadyPrebooked
            ? "bg-[#180a0c] border-rose-900/70 shadow-rose-950/20 backdrop-blur-md opacity-85 hover:opacity-100"
            : isCurrentlyVacant
            ? "bg-[#0b1a13] border-emerald-800/50 hover:border-emerald-500"
            : "bg-[#0e0f14] border-[#1f2128] hover:border-amber-500/70"
        }`}
      >
        {/* Slot Header */}
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm text-zinc-100 font-mono">
            {slot.label}
          </span>
          {isAlreadyPrebooked && (
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-rose-950/90 border border-rose-800 text-rose-400 font-bold flex items-center gap-1.5 shadow-sm">
              <Lock className="w-3 h-3 text-rose-400" />
              <span>Pre-Booked (Locked)</span>
            </span>
          )}
          {isPrebookable && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-amber-950/80 border border-amber-800 text-amber-400 font-bold">
              🟡 Active (Pre-Bookable)
            </span>
          )}
          {isCurrentlyVacant && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-emerald-950 border border-emerald-700 text-emerald-400 font-bold">
              🟢 Available Now
            </span>
          )}
        </div>

        {/* Active Advertisement Preview */}
        {slot.activeAd ? (
          <div className={`p-3.5 rounded-xl space-y-2 border ${isAlreadyPrebooked ? "bg-zinc-950/70 border-rose-950/80" : "bg-zinc-950/60 border-zinc-800/80"}`}>
            <div className="text-[10px] uppercase font-mono text-zinc-500 font-bold tracking-wider">
              Current Running Advertisement:
            </div>
            <div className="flex items-start gap-3">
              {slot.activeAd.imageUrl ? (
                <img
                  src={slot.activeAd.imageUrl}
                  alt={slot.activeAd.name}
                  className="w-9 h-9 rounded-lg object-cover bg-zinc-800 border border-zinc-700 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-bold text-xs font-mono shrink-0">
                  {slot.activeAd.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {slot.activeAd.name}
                </div>
                <div className="text-[11px] text-zinc-400 truncate">
                  {slot.activeAd.tagline}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/30 text-emerald-300 text-xs font-sans">
            No active advertiser on this slot right now. Ready for instant activation!
          </div>
        )}

        {/* Date & Schedule Details */}
        <div className="space-y-1 font-mono text-xs border-t border-zinc-800/60 pt-3">
          {isAlreadyPrebooked && (
            <>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Current ad ends on:</span>
                <strong className="text-zinc-300">{slot.activeExpiresAt}</strong>
              </div>
              <div className="flex items-center justify-between text-rose-300 font-bold">
                <span>Pre-booked until:</span>
                <strong className="text-rose-400">{slot.prebookedExpiresAt}</strong>
              </div>
            </>
          )}
          {isPrebookable && (
            <div className="flex items-center justify-between text-zinc-300">
              <span className="text-zinc-400">Current ad ends on:</span>
              <strong className="text-amber-400 font-bold">{slot.activeExpiresAt}</strong>
            </div>
          )}
          {isCurrentlyVacant && (
            <div className="flex items-center justify-between text-emerald-400">
              <span>Goes Live:</span>
              <strong>Instantly upon payment</strong>
            </div>
          )}
        </div>

        {/* Pre-Book / Action Button */}
        <button
          type="button"
          onClick={() => handleSlotClick(slot)}
          className={`w-full py-2.5 rounded-xl text-xs font-bold font-sans transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
            isAlreadyPrebooked
              ? "bg-rose-950/70 hover:bg-rose-900/80 border border-rose-800/80 text-rose-300"
              : isCurrentlyVacant
              ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
              : "bg-amber-500 hover:bg-amber-400 text-zinc-950"
          }`}
        >
          {isAlreadyPrebooked && (
            <>
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Pre-Booked (Locked)</span>
            </>
          )}
          {isPrebookable && (
            <>
              <Calendar className="w-4 h-4" />
              <span>Pre-Book Slot (Starts {slot.activeExpiresAt})</span>
            </>
          )}
          {isCurrentlyVacant && (
            <>
              <Plus className="w-4 h-4" />
              <span>Claim Slot Live Now (₹20 / ₹35)</span>
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pt-4 pb-16 px-3 sm:px-6 font-sans">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2128] pb-5">
        <div>
          <Link
            href="/"
            className="text-xs font-mono text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1.5 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Leaderboard</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Megaphone className="w-7 h-7 text-emerald-400" />
            <span>Book Advertisement Slots</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Claim available vacant slots or pre-book upcoming queues in advance.
          </p>
        </div>

        {/* Status Counter Badge */}
        <div className="flex items-center gap-2 font-mono text-xs shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-[#0e0f14] border border-[#1f2128] text-zinc-300">
            Occupied: <strong className="text-amber-400">{occupiedCount}/10</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#0e0f14] border border-[#1f2128] text-zinc-300">
            Pre-booked: <strong className="text-rose-400">{prebookedCount}/10</strong>
          </div>
        </div>
      </div>

      {/* Error / Already Pre-booked Toast Alert */}
      {errorNotice && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-700 text-rose-200 text-xs flex items-center justify-between font-mono animate-in fade-in shadow-xl">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{errorNotice}</span>
          </div>
          <button
            onClick={() => setErrorNotice(null)}
            className="text-rose-300 hover:text-white transition p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Two Vertical Columns (L1-L5 Down, R1-R5 Down) */}
      {loading ? (
        <div className="py-16 text-center text-zinc-500 font-mono text-sm">
          Loading ad slots schedule...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left Column: L1 down to L5 */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-zinc-400 font-mono tracking-wider uppercase flex items-center gap-2 pb-1 border-b border-zinc-800/80">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Left Sidebar Spots (L1 – L5)</span>
            </div>
            <div className="space-y-4">
              {leftSlots.map((slot) => renderSlotCard(slot))}
            </div>
          </div>

          {/* Right Column: R1 down to R5 */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-zinc-400 font-mono tracking-wider uppercase flex items-center gap-2 pb-1 border-b border-zinc-800/80">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Right Sidebar Spots (R1 – R5)</span>
            </div>
            <div className="space-y-4">
              {rightSlots.map((slot) => renderSlotCard(slot))}
            </div>
          </div>
        </div>
      )}

      {/* Ad Booking & Pre-Booking Checkout Modal */}
      {selectedSlot && (
        <AdBookingModal
          slotId={selectedSlot}
          isPrebook={isPrebookMode}
          prebookStartDate={prebookStartDate}
          onClose={() => {
            setSelectedSlot(null);
            setIsPrebookMode(false);
          }}
          onBooked={() => {
            setSelectedSlot(null);
            setIsPrebookMode(false);
            fetchSlotStatuses();
          }}
        />
      )}
    </div>
  );
}

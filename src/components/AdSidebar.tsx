"use client";

import React, { useState, useRef, useEffect } from "react";
import Script from "next/script";
import { useSession } from "next-auth/react";
import { Megaphone, Plus, Sparkles, X, Check, ArrowRight, Upload, Image as ImageIcon, CreditCard } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface TrustMrrAd {
  id: string;
  name: string;
  tagline: string;
  url: string;
  bgClass: string;
  borderClass: string;
  hoverBorderClass: string;
  logo: React.ReactNode;
  logoUrl?: string;
  startedAt?: string;
  expiresAt: string; // ISO date string YYYY-MM-DD
  durationDays?: 15 | 30;
}

export const INITIAL_LEFT_ADS: TrustMrrAd[] = [
  {
    id: "left-1",
    name: "Claim Ad Spot #L1",
    tagline: "Vacant slot available for immediate booking",
    url: "",
    bgClass: "bg-[#1c1228]",
    borderClass: "border-[#331c49]/80",
    hoverBorderClass: "hover:border-[#522b75]",
    logo: null,
    expiresAt: "2026-01-01",
    durationDays: 15,
  },
  {
    id: "left-2",
    name: "Claim Ad Spot #L2",
    tagline: "Vacant slot available for immediate booking",
    url: "",
    bgClass: "bg-[#0c1b2c]",
    borderClass: "border-[#143152]/80",
    hoverBorderClass: "hover:border-[#215187]",
    logo: null,
    expiresAt: "2026-01-01",
    durationDays: 15,
  },
  {
    id: "left-3",
    name: "Claim Ad Spot #L3",
    tagline: "Vacant slot available for immediate booking",
    url: "",
    bgClass: "bg-[#231514]",
    borderClass: "border-[#3e211e]/80",
    hoverBorderClass: "hover:border-[#66352f]",
    logo: null,
    expiresAt: "2026-01-01",
    durationDays: 15,
  },
  {
    id: "left-4",
    name: "Claim Ad Spot #L4",
    tagline: "Vacant slot available for immediate booking",
    url: "",
    bgClass: "bg-[#201021]",
    borderClass: "border-[#3a1b3b]/80",
    hoverBorderClass: "hover:border-[#612c63]",
    logo: null,
    expiresAt: "2026-01-01",
    durationDays: 15,
  },
  {
    id: "left-5",
    name: "Claim Ad Spot #L5",
    tagline: "Vacant slot available for immediate booking",
    url: "",
    bgClass: "bg-[#0b1b26]",
    borderClass: "border-[#133045]/80",
    hoverBorderClass: "hover:border-[#204d6e]",
    logo: null,
    expiresAt: "2026-01-01",
    durationDays: 15,
  },
];

export const INITIAL_RIGHT_ADS: TrustMrrAd[] = [
  {
    id: "right-1",
    name: "Claim Ad Spot #R1",
    tagline: "Vacant slot available for immediate booking",
    url: "",
    bgClass: "bg-[#0c2217]",
    borderClass: "border-[#153e2a]/80",
    hoverBorderClass: "hover:border-[#226343]",
    logo: null,
    expiresAt: "2026-01-01",
    durationDays: 15,
  },
  {
    id: "right-2",
    name: "Claim Ad Spot #R2",
    tagline: "Vacant slot available for immediate booking",
    url: "",
    bgClass: "bg-[#15171a]",
    borderClass: "border-[#282c33]/80",
    hoverBorderClass: "hover:border-[#404752]",
    logo: null,
    expiresAt: "2026-01-01",
    durationDays: 15,
  },
  {
    id: "right-3",
    name: "Claim Ad Spot #R3",
    tagline: "Vacant slot available for immediate booking",
    url: "",
    bgClass: "bg-[#1f1220]",
    borderClass: "border-[#381e39]/80",
    hoverBorderClass: "hover:border-[#59305b]",
    logo: null,
    expiresAt: "2026-01-01",
    durationDays: 15,
  },
  {
    id: "right-4",
    name: "Claim Ad Spot #R4",
    tagline: "Vacant slot available for immediate booking",
    url: "",
    bgClass: "bg-[#0e1e24]",
    borderClass: "border-[#193540]/80",
    hoverBorderClass: "hover:border-[#2a586a]",
    logo: null,
    expiresAt: "2026-01-01",
    durationDays: 15,
  },
  {
    id: "right-5",
    name: "Claim Ad Spot #R5",
    tagline: "Vacant slot available for immediate booking",
    url: "",
    bgClass: "bg-[#22131b]",
    borderClass: "border-[#3d2030]/80",
    hoverBorderClass: "hover:border-[#61334d]",
    logo: null,
    expiresAt: "2026-01-01",
    durationDays: 15,
  },
];

export function TrustMrrSidebar({
  ads = [],
  position,
  onBookSlot,
}: {
  ads: TrustMrrAd[];
  position: "left" | "right";
  onBookSlot?: (slotId: string) => void;
}) {
  const today = new Date().toISOString().split("T")[0];

  const handleAdClick = (slotId: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/ads/click", JSON.stringify({ slotId }));
      } else {
        fetch("/api/ads/click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slotId }),
          keepalive: true,
        }).catch(() => {});
      }
    } catch (e) {}
  };

  return (
    <aside className="hidden xl:flex flex-col gap-3 w-[210px] shrink-0 sticky top-[54px] h-[calc(100vh-68px)] pb-1 justify-between self-start">
      {ads.map((ad, idx) => {
        const isExpired = ad.expiresAt < today;

        if (isExpired) {
          return (
            <button
              key={ad.id}
              onClick={() => onBookSlot && onBookSlot(ad.id)}
              className="group rounded-2xl p-4 flex-1 flex flex-col items-center text-center justify-center bg-[#0d0f14]/60 hover:bg-[#13161f] border border-dashed border-zinc-700/80 hover:border-zinc-500 transition-all duration-200 cursor-pointer shadow-sm relative"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-800/80 group-hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-300 group-hover:text-white transition mb-2">
                <Plus className="w-4 h-4" />
              </div>
              <div className="font-bold text-xs text-zinc-300 group-hover:text-white font-sans">
                Claim Ad Spot #{position === "left" ? "L" : "R"}{idx + 1}
              </div>
              <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                Claim for 15d (₹20) or 30d (₹35)
              </p>
            </button>
          );
        }

        return (
          <a
            key={ad.id}
            href={ad.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleAdClick(ad.id)}
            className={`group rounded-2xl p-3.5 flex-1 flex flex-col items-center text-center justify-center ${ad.bgClass} border ${ad.borderClass} ${ad.hoverBorderClass} transition-all duration-200 shadow-md relative`}
          >
            <div className="mb-2 transform group-hover:scale-110 transition duration-200 flex items-center justify-center">
              {ad.logoUrl ? (
                <img
                  src={ad.logoUrl}
                  alt={ad.name}
                  className="w-7 h-7 rounded-md object-cover bg-zinc-800 border border-white/10"
                />
              ) : (
                ad.logo
              )}
            </div>

            <div className="font-bold text-xs text-white group-hover:text-zinc-100 transition font-sans mb-1 tracking-tight">
              {ad.name}
            </div>

            <p className="text-[10.5px] text-zinc-400 leading-snug font-sans max-w-[175px]">
              {ad.tagline}
            </p>
          </a>
        );
      })}

    </aside>
  );
}

export function AdBookingModal({
  slotId,
  onClose,
  onBooked,
  isPrebook = false,
  prebookStartDate,
}: {
  slotId: string;
  onClose: () => void;
  onBooked: (newAd: TrustMrrAd) => void;
  isPrebook?: boolean;
  prebookStartDate?: string;
}) {
  const { data: session } = useSession();
  const [duration, setDuration] = useState<15 | 30>(30);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [logoImage, setLogoImage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPercent: number;
    message: string;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setCouponLoading(true);
    setCouponError("");

    try {
      const res = await fetch("/api/ads/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim() }),
      });
      const data = await res.json();

      if (data.success && data.valid) {
        setAppliedCoupon({
          code: data.code || couponInput.trim().toUpperCase(),
          discountPercent: data.discountPercent || 100,
          message: data.message || "Coupon applied successfully!",
        });
        setCouponError("");
      } else {
        setAppliedCoupon(null);
        setCouponError(data.error || "Invalid coupon code.");
      }
    } catch (err: any) {
      setCouponError(err.message || "Failed to validate coupon.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !tagline.trim() || !url.trim() || !email.trim()) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const baseDate = isPrebook && prebookStartDate ? new Date(`${prebookStartDate}T00:00:00Z`) : new Date();
    baseDate.setDate(baseDate.getDate() + duration);
    const expiresDateStr = baseDate.toISOString().split("T")[0];

    const cleanUrl = url.trim().startsWith("http://") || url.trim().startsWith("https://")
      ? url.trim()
      : `https://${url.trim()}`;

    const colors = [
      { bg: "bg-[#1c1228]", border: "border-[#331c49]", hover: "hover:border-[#522b75]" },
      { bg: "bg-[#0c1b2c]", border: "border-[#143152]", hover: "hover:border-[#215187]" },
      { bg: "bg-[#231514]", border: "border-[#3e211e]", hover: "hover:border-[#66352f]" },
      { bg: "bg-[#0b1b26]", border: "border-[#133045]", hover: "hover:border-[#204d6e]" },
      { bg: "bg-[#0c2217]", border: "border-[#153e2a]", hover: "hover:border-[#226343]" },
      { bg: "bg-[#0e1e24]", border: "border-[#193540]", hover: "hover:border-[#2a586a]" },
    ];
    const chosenColor = colors[Math.floor(Math.random() * colors.length)];

    const createdAd: TrustMrrAd = {
      id: slotId,
      name: name.trim(),
      tagline: tagline.trim(),
      url: cleanUrl,
      logoUrl: logoImage || undefined,
      bgClass: chosenColor.bg,
      borderClass: chosenColor.border,
      hoverBorderClass: chosenColor.hover,
      logo: logoImage ? (
        <img
          src={logoImage}
          alt={name}
          className="w-7 h-7 rounded-md object-cover bg-zinc-800 border border-white/10"
        />
      ) : (
        <div className="w-7 h-7 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-bold text-xs font-mono">
          {name.slice(0, 2).toUpperCase()}
        </div>
      ),
      expiresAt: expiresDateStr,
      durationDays: duration,
    };

    // 100% Free Coupon Bypass
    if (appliedCoupon && appliedCoupon.discountPercent === 100) {
      try {
        const freeRes = await fetch("/api/ads/claim-free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotId,
            durationDays: duration,
            targetUrl: cleanUrl,
            imageUrl: logoImage,
            name: name.trim(),
            tagline: tagline.trim(),
            email: email.trim(),
            isPrebook,
            couponCode: appliedCoupon.code,
          }),
        });
        const freeData = await freeRes.json();

        if (freeData.success) {
          setSubmitted(true);
          window.dispatchEvent(new Event("revenueUpdated"));
          setTimeout(() => {
            onBooked(createdAd);
            onClose();
          }, 1200);
        } else {
          setErrorMsg(freeData.error || "Failed to claim free slot with coupon.");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to claim free slot.");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      // 1. Create Razorpay order on backend
      const orderRes = await fetch("/api/ads/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          duration,
          targetUrl: cleanUrl,
          imageUrl: logoImage,
          name: name.trim(),
          tagline: tagline.trim(),
          email: email.trim(),
          isPrebook,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderData.success || !orderData.order) {
        throw new Error(orderData.error || "Failed to initiate payment order");
      }

      const order = orderData.order;

      // 2. Open Razorpay Standard Checkout
      if (typeof window !== "undefined" && window.Razorpay) {
        const options = {
          key: orderData.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: "INR",
          name: "DSAMRR Ad Placement",
          description: `${duration} Days Advertisement (${slotId})`,
          order_id: order.id,
          handler: async function (response: any) {
            // 3. Verify Razorpay Payment and Activate in Database
            try {
              const verifyRes = await fetch("/api/ads/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  slotId,
                  name: name.trim(),
                  tagline: tagline.trim(),
                  targetUrl: cleanUrl,
                  imageUrl: logoImage,
                  email: email.trim(),
                  duration,
                  isPrebook,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                setSubmitted(true);
                window.dispatchEvent(new Event("revenueUpdated"));
                setTimeout(() => {
                  onBooked(createdAd);
                  onClose();
                }, 1200);
              } else {
                setErrorMsg(verifyData.error || "Payment verification failed.");
              }
            } catch (err: any) {
              setErrorMsg(err.message || "Failed to verify payment.");
            } finally {
              setLoading(false);
            }
          },
          prefill: {
            name: name.trim(),
          },
          theme: {
            color: "#10b981",
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (response: any) {
          setErrorMsg(response.error?.description || "Payment was not completed.");
          setLoading(false);
        });
        rzp.open();
      } else {
        setErrorMsg("Payment gateway failed to initialize. Please refresh and try again.");
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn font-mono">
        <div className="bg-[#0c0c0e] border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg ${isPrebook ? "bg-amber-950/60 border-amber-800/60 text-amber-400" : "bg-emerald-950/60 border-emerald-800/60 text-emerald-400"} flex items-center justify-center`}>
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100 font-sans">
                  {isPrebook ? "Pre-Book Ad Placement" : "Book Ad Placement"}
                </h3>
                {isPrebook && prebookStartDate && (
                  <p className="text-[10px] text-amber-400 font-mono">
                    Starts {prebookStartDate} • Guaranteed Queue
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isPrebook && (
            <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-300 text-[11px] font-mono leading-relaxed">
              <strong>Pre-Booking Policy:</strong> Slot will be locked exclusively for you starting on {prebookStartDate}. No other advertiser can book this queue. Non-refundable.
            </div>
          )}

          {submitted ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-5 h-5" />
              </div>
              <div className="font-bold text-white font-sans text-sm">
                {isPrebook ? "Pre-Booking Confirmed & Slot Locked!" : "Payment Verified & Ad Live!"}
              </div>
              <p className="text-xs text-zinc-400">
                {isPrebook
                  ? `Your advertisement is queued and guaranteed to go live on ${prebookStartDate} for ${duration} days.`
                  : `Your advertisement is now live for the next ${duration} days.`}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              {/* Duration Selector */}
              <div className="space-y-1">
                <label className="text-zinc-400">Campaign Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDuration(15)}
                    className={`py-2 rounded-lg border text-xs font-mono transition cursor-pointer ${
                      duration === 15
                        ? "bg-zinc-800 border-zinc-600 text-white font-bold"
                        : "bg-[#15171c] border-[#262933] text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    15 Days ({appliedCoupon?.discountPercent === 100 ? "FREE" : "₹20"})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuration(30)}
                    className={`py-2 rounded-lg border text-xs font-mono transition cursor-pointer ${
                      duration === 30
                        ? "bg-zinc-800 border-zinc-600 text-white font-bold"
                        : "bg-[#15171c] border-[#262933] text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    30 Days ({appliedCoupon?.discountPercent === 100 ? "FREE" : "₹35"})
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Product / Tool Name</label>
                <input
                  type="text"
                  placeholder="e.g. AlgoCoach AI"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#15171c] border border-[#262933] text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              </div>

              {/* Device Image Upload Field */}
              <div className="space-y-1">
                <label className="text-zinc-400 flex items-center justify-between">
                  <span>Upload Logo Image from Device</span>
                  <span className="text-[10px] text-zinc-500">(Optional)</span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                {logoImage ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#15171c] border border-[#262933]">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={logoImage}
                        alt="Uploaded Logo"
                        className="w-8 h-8 rounded-md object-cover bg-zinc-800 border border-zinc-700"
                      />
                      <span className="text-zinc-300 text-[11px]">Image selected</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLogoImage("")}
                      className="text-zinc-500 hover:text-rose-400 text-xs px-2 py-1 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 rounded-lg bg-[#15171c] hover:bg-[#1b1e24] border border-dashed border-[#2e323e] hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose from device</span>
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Tagline (Max 80 chars)</label>
                <input
                  type="text"
                  maxLength={80}
                  placeholder="Real-time mock coding interviews with AI."
                  required
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#15171c] border border-[#262933] text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Destination Website URL</label>
                <input
                  type="text"
                  placeholder="e.g. abc.com"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#15171c] border border-[#262933] text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Your Email Address (for receipt & analytics)</label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#15171c] border border-[#262933] text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              </div>

              {/* Secret Coupon Code Section */}
              <div className="space-y-1 pt-1">
                <label className="text-zinc-400 text-[11px]">Have a Coupon Code?</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                      if (couponError) setCouponError("");
                    }}
                    disabled={Boolean(appliedCoupon)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#15171c] border border-[#262933] text-zinc-100 focus:outline-none focus:border-zinc-600 uppercase font-mono text-xs disabled:opacity-60"
                  />
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponInput("");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition cursor-pointer"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition disabled:opacity-50 cursor-pointer"
                    >
                      {couponLoading ? "..." : "Apply"}
                    </button>
                  )}
                </div>

                {appliedCoupon && (
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-400 text-[11px] font-mono flex items-center justify-between">
                    <span>{appliedCoupon.message}</span>
                    <span className="font-bold">100% FREE</span>
                  </div>
                )}

                {couponError && (
                  <div className="text-rose-400 text-[11px] font-mono">
                    {couponError}
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 rounded-lg font-bold text-xs transition font-mono flex items-center justify-center gap-1.5 shadow-md cursor-pointer mt-2 disabled:opacity-50 ${
                  appliedCoupon?.discountPercent === 100
                    ? "bg-emerald-400 hover:bg-emerald-300 text-zinc-950"
                    : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                }`}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : appliedCoupon?.discountPercent === 100 ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Claim Ad Spot for Free (₹0)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Claim Your Ad for {duration} Days (₹{duration === 15 ? 20 : 35})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Script from "next/script";
import { Zap, Check, ArrowRight, X, Sparkles, Star, GitCommit, ShieldCheck } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultGithubHandle?: string;
}

export function ProUpgradeModal({
  isOpen,
  onClose,
  onSuccess,
  defaultGithubHandle = "",
}: ProUpgradeModalProps) {
  const [mounted, setMounted] = useState(false);
  const [duration, setDuration] = useState<15 | 30>(15);
  const [githubHandle, setGithubHandle] = useState(defaultGithubHandle);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPercent?: number;
    discountType?: string;
    price15?: number;
    price30?: number;
    message?: string;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getPrice = (dur: 15 | 30) => {
    if (appliedCoupon?.discountPercent === 100) return 0;
    if (appliedCoupon?.discountType === "custom_price") {
      return dur === 15 ? (appliedCoupon.price15 ?? 1) : (appliedCoupon.price30 ?? 1);
    }
    const base = dur === 30 ? 2 : 1;
    if (appliedCoupon?.discountPercent) {
      return Math.max(1, Math.round(base * (1 - appliedCoupon.discountPercent / 100)));
    }
    return base;
  };

  const price = getPrice(duration);

  const handleApplyCoupon = async () => {
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
          discountPercent: data.discountPercent || 0,
          discountType: data.discountType,
          price15: data.price15,
          price30: data.price30,
          message: data.message || "Coupon applied successfully!",
        });
        setCouponError("");
      } else {
        setAppliedCoupon(null);
        setCouponError(data.error || "Coupon code is not valid.");
      }
    } catch (err: any) {
      setCouponError("Coupon code is not valid.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // 0. If 100% discount, bypass Razorpay and activate Pro directly
      if (price === 0) {
        const verifyRes = await fetch("/api/pro/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: `free_${appliedCoupon?.code || "coupon"}`,
            razorpay_payment_id: `free_pay_${Date.now()}`,
            razorpay_signature: "free_coupon",
            duration,
            githubHandle: githubHandle.trim(),
            couponCode: appliedCoupon?.code,
            isAnonymous,
          }),
        });

        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          setSuccess(true);
          setTimeout(() => {
            if (onSuccess) onSuccess();
            onClose();
            window.location.reload();
          }, 1500);
          return;
        } else {
          throw new Error(verifyData.error || "Failed to activate free Pro membership");
        }
      }

      // 1. Create order
      const orderRes = await fetch("/api/pro/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationDays: duration,
          couponCode: appliedCoupon?.code,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderData.success || !orderData.order) {
        throw new Error(orderData.error || "Failed to initialize payment");
      }

      const order = orderData.order;

      // 2. Open Razorpay Checkout
      if (typeof window !== "undefined" && window.Razorpay) {
        const options = {
          key: orderData.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: "INR",
          name: "DSAMRR Pro Membership",
          description: `DSAMRR Pro (${duration} Days) Developer Plan`,
          order_id: order.id,
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch("/api/pro/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  duration,
                  githubHandle: githubHandle.trim(),
                  couponCode: appliedCoupon?.code,
                  isAnonymous,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                setSuccess(true);
                setTimeout(() => {
                  if (onSuccess) onSuccess();
                  onClose();
                  window.location.reload();
                }, 1500);
              } else {
                setErrorMsg(verifyData.error || "Verification failed");
              }
            } catch (err: any) {
              setErrorMsg(err.message || "Failed to complete verification");
            }
          },
          theme: {
            color: "#f59e0b",
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (resp: any) {
          setErrorMsg(resp.error?.description || "Payment cancelled or failed");
        });
        rzp.open();
      } else {
        throw new Error("Razorpay checkout is loading, please try again in a second");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Checkout error");
    } finally {
      setLoading(false);
    }
  };

  const modalContent = isOpen && mounted ? (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div
        onClick={onClose}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150 font-sans cursor-pointer"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-[#0e0f14] border border-[#1f2128] rounded-3xl p-6 sm:p-7 shadow-[0_30px_90px_rgba(0,0,0,0.9)] text-zinc-100 space-y-4 my-auto max-h-[92vh] overflow-y-auto cursor-default"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#1f2128] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-400">
                <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  DSAMRR Pro
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Developer Showcase & GitHub Integration
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {success ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Welcome to DSAMRR Pro! ⚡</h4>
              <p className="text-xs text-zinc-400">
                Your GitHub card and PRO badge are now active on your profile and the leaderboard.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePay} className="space-y-4">
              {/* Feature List */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-[#15171c] border border-[#262933] text-xs">
                <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pro Membership Perks:</span>
                </div>
                <div className="space-y-1.5 pt-1 text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Display verified GitHub Card (stars, top repos, commits)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Gold PRO badge next to your username on the Leaderboard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Featured spotlight on developer profile</span>
                  </div>
                </div>
              </div>

              {/* GitHub Handle Input */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-300 font-medium flex items-center justify-between">
                  <span>Your GitHub Username</span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {isAnonymous ? "(optional in ghost mode)" : "(to showcase)"}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">
                    @
                  </span>
                  <input
                    type="text"
                    required={!isAnonymous}
                    placeholder="octocat"
                    value={githubHandle}
                    onChange={(e) => setGithubHandle(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#15171c] border border-[#262933] text-zinc-100 text-xs focus:outline-none focus:border-amber-500/80 font-mono"
                  />
                </div>
              </div>

              {/* Anonymous / Ghost Mode Toggle */}
              <div className="p-3 rounded-2xl bg-[#15171c] border border-[#262933] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5 font-sans">
                    <span>👻 Keep profile anonymous (Ghost Mode)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans leading-tight">
                    Mask your name and hide external links on the public leaderboard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer flex items-center shrink-0 ${
                    isAnonymous ? "bg-amber-500 justify-end" : "bg-zinc-700 justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
                </button>
              </div>

              {/* Plan Duration Selector */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-300 font-medium">Choose Plan Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDuration(15)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-mono transition cursor-pointer flex flex-col items-center justify-center ${
                      duration === 15
                        ? "bg-amber-950/40 border-amber-500/80 text-amber-300 font-bold"
                        : "bg-[#15171c] border-[#262933] text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span className="text-sm font-sans font-extrabold text-white">15 Days</span>
                    <span className="text-[11px] text-amber-400 mt-0.5">₹{getPrice(15)} total</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDuration(30)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-mono transition cursor-pointer flex flex-col items-center justify-center ${
                      duration === 30
                        ? "bg-amber-950/40 border-amber-500/80 text-amber-300 font-bold"
                        : "bg-[#15171c] border-[#262933] text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span className="text-sm font-sans font-extrabold text-white">30 Days</span>
                    <span className="text-[11px] text-amber-400 mt-0.5">₹{getPrice(30)} total</span>
                  </button>
                </div>
              </div>

              {/* Coupon Code Section */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-300 font-medium">Coupon Code</label>
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
                    className="flex-1 px-3 py-2 rounded-xl bg-[#15171c] border border-[#262933] text-zinc-100 text-xs focus:outline-none focus:border-amber-500/80 uppercase font-mono disabled:opacity-60"
                  />
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponInput("");
                      }}
                      className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition cursor-pointer"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition disabled:opacity-50 cursor-pointer"
                    >
                      {couponLoading ? "..." : "Apply"}
                    </button>
                  )}
                </div>

                {appliedCoupon && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-400 text-xs font-mono flex items-center justify-between">
                    <span className="truncate pr-2">{appliedCoupon.message}</span>
                    <span className="font-bold shrink-0">
                      {appliedCoupon.discountPercent === 100
                        ? "100% FREE"
                        : appliedCoupon.discountType === "custom_price"
                        ? "₹1 DEAL"
                        : `${appliedCoupon.discountPercent}% OFF`}
                    </span>
                  </div>
                )}

                {couponError && (
                  <div className="text-rose-400 text-xs font-mono">
                    {couponError}
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : price === 0 ? (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-zinc-950" />
                    <span>Activate Free DSAMRR Pro (₹0)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-zinc-950" />
                    <span>Get DSAMRR Pro for ₹{price}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  ) : null;

  if (typeof document === "undefined" || !mounted) return null;
  return createPortal(modalContent, document.body);
}

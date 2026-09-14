"use client";

import React, { useState } from "react";
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
  const [duration, setDuration] = useState<15 | 30>(15);
  const [githubHandle, setGithubHandle] = useState(defaultGithubHandle);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const price = duration === 30 ? 2 : 1;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Create order
      const orderRes = await fetch("/api/pro/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationDays: duration }),
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

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 font-sans">
        <div className="relative w-full max-w-md bg-[#0e0f14] border border-[#1f2128] rounded-3xl p-6 sm:p-7 shadow-[0_30px_90px_rgba(0,0,0,0.9)] text-zinc-100 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#1f2128] pb-4">
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
                  <span className="text-[10px] text-zinc-500 font-mono">(to showcase)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="octocat"
                    value={githubHandle}
                    onChange={(e) => setGithubHandle(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#15171c] border border-[#262933] text-zinc-100 text-xs focus:outline-none focus:border-amber-500/80 font-mono"
                  />
                </div>
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
                    <span className="text-[11px] text-amber-400 mt-0.5">₹1 total</span>
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
                    <span className="text-[11px] text-amber-400 mt-0.5">₹2 total</span>
                  </button>
                </div>
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
  );
}

"use client";

import React, { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Terminal,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
} from "lucide-react";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<"email" | "otp_and_password">("email");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const authenticateSession = async (userEmail: string, userPass: string) => {
    const res = await signIn("credentials", {
      redirect: false,
      email: userEmail.trim(),
      password: userPass.trim(),
      callbackUrl,
    });

    if (res?.error) {
      setErrorMsg(res.error || "Authentication failed. Please check your credentials.");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  // Step 1: Send OTP for Signup OR Direct Sign In
  const handleEmailOrSigninSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (isSignUp) {
      // 1. Send OTP to email first
      try {
        const otpRes = await fetch("/api/auth/otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "send", email: email.trim() }),
        });
        const otpData = await otpRes.json();

        if (otpData.success) {
          setStep("otp_and_password");
          setSuccessMsg(`Verification code sent to ${email.trim()}.`);
        } else {
          setErrorMsg(otpData.error || "Failed to send verification code.");
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to send verification code.");
      } finally {
        setLoading(false);
      }
    } else {
      // Direct Sign In with Email & Password
      if (!password.trim()) {
        setErrorMsg("Please enter your password.");
        setLoading(false);
        return;
      }

      try {
        await authenticateSession(email.trim(), password.trim());
      } catch (err: any) {
        setErrorMsg(err.message || "Sign in failed. Please check your credentials.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Step 2: Verify OTP, Set Password & Complete Signup
  const handleVerifyOtpAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrorMsg("Please enter the 6-digit verification code.");
      return;
    }

    if (!password.trim() || password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const verifyRes = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          email: email.trim(),
          otp: otpCode.trim(),
          password: password.trim(),
        }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        setErrorMsg(verifyData.error || "Invalid verification code.");
        setLoading(false);
        return;
      }

      // Complete session creation
      await authenticateSession(email.trim(), password.trim());
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to complete signup.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", email: email.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("A new verification code has been sent!");
      } else {
        setErrorMsg(data.error || "Failed to resend code.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send reset code.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMsg("Please enter your email address first to receive a password reset code.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_reset_otp", email: email.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg("Password reset code sent via SMTP! Check your inbox.");
      } else {
        setErrorMsg(data.error || "Failed to send reset code.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send reset code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-[#0c0d11] border border-[#1f2128] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-bold text-lg font-mono tracking-tight text-white">DSAMRR</span>
          </Link>
          <h1 className="text-xl font-bold text-white">
            {isSignUp
              ? step === "otp_and_password"
                ? "Verify OTP & Set Password"
                : "Sign Up with Email"
              : "Welcome Back"}
          </h1>
          <p className="text-xs text-zinc-400">
            {isSignUp
              ? step === "otp_and_password"
                ? `Enter code sent to ${email} and choose password`
                : "Enter your email to receive a verification code"
              : "Sign in with your email and password"}
          </p>
        </div>

        {/* Step 2 of Sign Up: OTP + Password Setting */}
        {isSignUp && step === "otp_and_password" ? (
          <form onSubmit={handleVerifyOtpAndSignup} className="space-y-4 text-xs font-mono">
            <div className="space-y-2 text-center">
              <label className="text-zinc-300 font-medium font-sans flex items-center justify-center gap-1.5">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>6-Digit Verification Code</span>
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                required
                autoFocus
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full text-center text-2xl font-mono tracking-[8px] py-2.5 rounded-xl bg-[#15171c] border border-[#262933] text-emerald-400 font-extrabold focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-300 font-medium flex items-center gap-1.5 font-sans">
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Create Password (Min 6 chars)</span>
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#15171c] border border-[#262933] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/80 transition font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-300 font-medium flex items-center gap-1.5 font-sans">
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Confirm Password</span>
              </label>
              <input
                type="password"
                placeholder="••••••••••••"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#15171c] border border-[#262933] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/80 transition font-sans"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 font-mono animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 font-mono animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6 || password.length < 6}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition font-sans flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account & Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-sans pt-2 border-t border-zinc-800/60">
              <button
                type="button"
                onClick={() => setStep("email")}
                className="hover:text-white underline cursor-pointer"
              >
                Change Email
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Resend Code</span>
              </button>
            </div>
          </form>
        ) : (
          /* Step 1: Email Form (Sign Up asks only Email, Sign In asks Email + Password) */
          <form onSubmit={handleEmailOrSigninSubmit} className="space-y-4 text-xs font-mono">
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-medium flex items-center gap-1.5 font-sans">
                <Mail className="w-3.5 h-3.5 text-zinc-400" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#15171c] border border-[#262933] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/80 transition font-sans"
              />
            </div>

            {!isSignUp && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-300 font-medium flex items-center gap-1.5 font-sans">
                    <Lock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Password</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[11px] text-zinc-400 hover:text-emerald-400 font-sans cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#15171c] border border-[#262933] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/80 transition font-sans"
                />
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2 font-mono animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 font-mono animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition font-sans flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? "Send Verification Code" : "Sign In with Email"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Toggle between Sign In & Sign Up */}
            <div className="pt-2 text-center text-xs text-zinc-500 border-t border-[#1f2128]/70 font-sans">
              {isSignUp ? (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setStep("email");
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    className="text-emerald-400 hover:underline font-semibold cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              ) : (
                <p>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setStep("email");
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    className="text-emerald-400 hover:underline font-semibold cursor-pointer"
                  >
                    Sign Up
                  </button>
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-zinc-500 font-mono text-xs">Loading authentication...</div>}>
      <AuthForm />
    </Suspense>
  );
}

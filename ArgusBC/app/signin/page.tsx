"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ArgusLogo } from "@/components/ArgusLogo";
import {
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const {
    user,
    authConfigured,
    error,
    clearError,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    enterDemoMode,
  } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // If already authenticated or in demo mode, offer quick jump to dashboard
  const handleProceedToDashboard = () => {
    router.push("/dashboard");
  };

  const handleEnterDemo = () => {
    clearError();
    setFormError(null);
    enterDemoMode();
    router.push("/dashboard");
  };

  const handleGoogleSubmit = async () => {
    clearError();
    setFormError(null);
    try {
      setLocalLoading(true);
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      setFormError(msg);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFormError(null);

    if (!email || !password) {
      setFormError("Please enter both email and password.");
      return;
    }

    try {
      setLocalLoading(true);
      if (mode === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : `${mode === "signin" ? "Sign-in" : "Sign-up"} failed`;
      setFormError(msg);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0c051a] text-white flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-purple-500/30 selection:text-white">
      {/* Dynamic Glassmorphism Atmospheric Background Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-Center Electric Purple Ambient Glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[38rem] h-[38rem] rounded-full bg-[#7c3aed]/40 blur-[130px]" />

        {/* Right Crescent Sky-Cyan Disc (matching reference image sphere edge) */}
        <div className="absolute top-1/2 -translate-y-1/2 right-[-6rem] lg:right-[-2rem] w-80 sm:w-[26rem] h-80 sm:h-[26rem] rounded-full border border-sky-400/40 bg-[#0284c7]/40 blur-[90px]" />
        <div className="hidden lg:block absolute top-1/2 -translate-y-1/2 right-[2%] w-72 h-72 rounded-full border border-sky-300/30 bg-[#0ea5e9]/20 backdrop-blur-sm pointer-events-none shadow-[0_0_80px_rgba(14,165,233,0.3)]" />

        {/* Bottom-Left Vivid Violet/Magenta Nebula */}
        <div className="absolute -bottom-28 -left-20 w-[30rem] h-[30rem] rounded-full bg-[#9333ea]/35 blur-[120px]" />

        {/* Atmospheric Diagonal Light Beam */}
        <div className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_top,_rgba(168,85,247,0.18)_0%,_rgba(12,5,26,0)_70%)] pointer-events-none" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <ArgusLogo size="md" className="border border-white/20 shadow-md" />
          <div>
            <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              <span>ARGUS</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/70 border border-white/10">
                Beta v1.0
              </span>
            </span>
            <span className="hidden sm:inline text-xs text-white/50 border-l border-white/15 pl-2.5 ml-2.5 font-normal">
              Data Governance Gateway · Made for operators and AI agents

            </span>
          </div>
        </div>

      </header>

      {/* Main Glassmorphism Authentication Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center py-8 sm:py-12">
        <div className="w-full max-w-xl glass-frost-card rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 space-y-6 relative overflow-hidden">
          {/* Identity Title */}
          <div className="text-left pt-2 pb-1 space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
              Sign In to ARGUS
            </h1>

            <p className="text-xs text-white/70 max-w-md leading-relaxed">
              Login to ARGUS control panel for data governance policy and agent creation.
            </p>
          </div>

          {/* User Already Signed In Banner */}
          {user && (
            <div className="p-4 bg-white/10 border border-white/20 rounded-2xl text-xs space-y-3 backdrop-blur-md shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Active session:</span>
                <span className="font-semibold text-white font-mono truncate max-w-[240px]">
                  {user.email || user.displayName}
                </span>
              </div>
              <button
                type="button"
                onClick={handleProceedToDashboard}
                className="w-full py-2.5 bg-white text-gray-950 hover:bg-white/90 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.25)]"
              >
                <span>Proceed to Control Plane</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Configuration State Notice (Unconfigured Demo Shell) */}
          {!authConfigured && (
            <div className="p-4 bg-amber-500/10 border border-amber-400/30 rounded-2xl text-xs space-y-3 backdrop-blur-md">
              <div className="flex items-start gap-2.5 text-amber-200 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="leading-snug">
                  Firebase environment variables are not configured in <code className="font-mono font-bold bg-amber-400/20 px-1.5 py-0.5 rounded text-amber-100">.env.local</code>.
                </span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                Cloud identity providers are offline. You can run Argus locally in an unauthenticated
                demo shell without live Google/Firebase credentials.
              </p>
              <button
                type="button"
                onClick={handleEnterDemo}
                className="w-full py-2.5 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-100 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 backdrop-blur-md shadow-xs"
              >
                <Terminal className="w-3.5 h-3.5 text-amber-300" />
                <span>Enter Demo Shell Directly</span>
              </button>
            </div>
          )}

          {/* Error Message Display */}
          {(formError || error) && (
            <div className="p-3.5 bg-red-500/15 border border-red-400/30 text-red-200 rounded-xl text-xs flex items-start gap-2.5 backdrop-blur-md">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="leading-relaxed">{formError || error}</div>
            </div>
          )}

          {/* Google Sign-In Action */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSubmit}
              disabled={localLoading}
              className="w-full py-3 px-4 glass-frost-button rounded-xl text-xs font-medium text-white flex items-center justify-center gap-3 transition-all hover:bg-white/[0.14] border border-white/20 shadow-md focus:outline-none focus:ring-2 focus:ring-purple-400/40 disabled:opacity-50"
            >
              {/* Google G Mark SVG */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.4 8.8 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7 0-1.1.1-1.9.4-2.7L1.6 6.5C.6 8.5 0 10.7 0 12s.6 3.5 1.6 5.5l3.7-2.8z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.8-2.4-6.7-5.3L1.6 15.9C3.5 19.7 7.4 23 12 23z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-white/10 w-full" />
              <span className="px-3 text-[10px] text-white/50 uppercase tracking-widest relative font-mono">
                Or email &amp; password
              </span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-white/80"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="analyst@agency.internal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 glass-frost-input rounded-xl text-xs placeholder:text-white/35 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-white/80"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 glass-frost-input rounded-xl text-xs placeholder:text-white/35 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={localLoading}
              className="w-full py-3 bg-white text-gray-950 hover:bg-white/90 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(255,255,255,0.22)] focus:outline-none focus:ring-2 focus:ring-purple-400/40 disabled:opacity-50"
            >
              {localLoading ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <KeyRound className="w-3.5 h-3.5" />
              )}
              <span>{mode === "signin" ? "Sign In with Credentials" : "Create Account"}</span>
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="text-center pt-2 border-t border-white/10">
            {mode === "signin" ? (
              <p className="text-xs text-white/60">
                Need an operator account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setFormError(null);
                    setMode("signup");
                  }}
                  className="text-purple-300 hover:text-purple-200 hover:underline font-medium transition-colors"
                >
                  Create credentials
                </button>
              </p>
            ) : (
              <p className="text-xs text-white/60">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setFormError(null);
                    setMode("signin");
                  }}
                  className="text-purple-300 hover:text-purple-200 hover:underline font-medium transition-colors"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>

          {/* Bottom Corner Annotations (Direct homage to the reference image) */}
          <div className="flex items-center justify-between text-white/40">
            <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-wider">
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-right">
              ARGUS by VEM Studio 2026
            </span>
          </div>
        </div>
      </main>

      {/* Security Gating Note Footer */}
      <footer className="relative z-10 text-center text-[11px] text-white/40 max-w-xl mx-auto space-y-1">
        <div>
          SECURITY NOTE: Client-only route gating is an interface-layer control, not production authorization.
        </div>
      </footer>
    </div>
  );
}

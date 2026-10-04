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
    <div className="min-h-screen bg-[#f4f5f7] text-gray-900 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-[#f5f3ff] selection:text-[#7c3aed]">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-gray-200/80 pb-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <ArgusLogo size="md" />
          <div>
            <span className="font-bold text-base tracking-tight text-gray-900">
              ARGUS
            </span>
            <span className="hidden sm:inline text-xs text-gray-500 border-l border-gray-200 pl-2.5 ml-2.5 font-normal">
              Authentication Gateway &middot; Control Plane
            </span>
          </div>
        </div>

        <div className="text-xs flex items-center gap-2">
          {authConfigured ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Firebase Auth Configured</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-amber-800 bg-amber-50 border border-amber-200 rounded-full font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Demo Shell Active</span>
            </span>
          )}
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center py-10">
        <div className="w-full max-w-md bg-white border border-gray-200/80 p-6 sm:p-8 rounded-2xl shadow-card space-y-6">
          {/* Identity Title */}
          <div className="text-center sm:text-left">
            <div className="text-xs font-semibold uppercase tracking-wider text-argus-brand mb-1">
              Operator Identification
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Sign In to Argus
            </h1>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Authenticate operator credentials to inspect documents, evaluate RedactCore policies,
              and manage derived view manifests.
            </p>
          </div>

          {/* User Already Signed In Banner */}
          {user && (
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Active session:</span>
                <span className="font-semibold text-gray-900 font-mono">
                  {user.email || user.displayName}
                </span>
              </div>
              <button
                type="button"
                onClick={handleProceedToDashboard}
                className="w-full py-2 bg-[#7c3aed] text-white hover:bg-[#6d28d9] font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Proceed to Control Plane</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Configuration State Notice */}
          {!authConfigured && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2.5">
              <div className="flex items-start gap-2 text-amber-900 font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span className="leading-snug">
                  Firebase environment variables are not configured in <code className="font-mono font-bold">.env.local</code>.
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Cloud identity providers are offline. You can run Argus locally in an unauthenticated
                demo shell without live Google/Firebase credentials.
              </p>
              <button
                type="button"
                onClick={handleEnterDemo}
                className="w-full py-2 bg-white hover:bg-gray-50 border border-amber-300 text-gray-900 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Terminal className="w-3.5 h-3.5 text-argus-brand" />
                <span>Enter Demo Shell Directly</span>
              </button>
            </div>
          )}

          {/* Error Message Display */}
          {(formError || error) && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="leading-relaxed">{formError || error}</div>
            </div>
          )}

          {/* Google Sign-In Action */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSubmit}
              disabled={localLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 disabled:opacity-50 shadow-xs"
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

            <div className="relative flex items-center justify-center">
              <div className="border-t border-gray-200 w-full" />
              <span className="bg-white px-3 text-[11px] text-gray-400 uppercase tracking-wider relative font-medium">
                Or email &amp; password
              </span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-gray-700"
              >
                Operator Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="analyst@agency.internal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 text-xs text-gray-900 rounded-lg focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-gray-700"
              >
                Secret Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 text-xs text-gray-900 rounded-lg focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] placeholder:text-gray-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={localLoading}
              className="w-full py-2.5 bg-[#7c3aed] text-white hover:bg-[#6d28d9] text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 disabled:opacity-50 shadow-xs"
            >
              {localLoading ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <KeyRound className="w-3.5 h-3.5" />
              )}
              <span>{mode === "signin" ? "Sign In with Credentials" : "Create Account"}</span>
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="text-center pt-2 border-t border-gray-100">
            {mode === "signin" ? (
              <p className="text-xs text-gray-500">
                Need an operator account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setFormError(null);
                    setMode("signup");
                  }}
                  className="text-argus-brand hover:underline font-medium"
                >
                  Create credentials
                </button>
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    setFormError(null);
                    setMode("signin");
                  }}
                  className="text-argus-brand hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Security Gating Note Footer */}
      <footer className="text-center text-[11px] text-gray-400 max-w-xl mx-auto space-y-1">
        <div>
          SECURITY NOTE: Client-only route gating is an interface-layer control, not production authorization.
        </div>
        <div>
          RedactCore enforcement and Cerberus identity verification remain authoritative for all underlying documents and derived views.
        </div>
      </footer>
    </div>
  );
}

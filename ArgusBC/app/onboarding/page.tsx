"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { orgService } from "@/lib/org-service";
import { Organization, UserInvitation } from "@/lib/organization-types";
import { ArgusLogo } from "@/components/ArgusLogo";
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clock,
  KeyRound,
  Users,
  HardDrive,
  Layers,
  Sparkles,
  Plus,
  ChevronRight,
  LogOut,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();

  const [userOrgs, setUserOrgs] = useState<Organization[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<UserInvitation[]>([]);
  const [orgName, setOrgName] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const refreshUserData = useCallback(() => {
    if (!user) return;
    const orgs = orgService.getUserOrganizations(user.uid, user.email || undefined);
    const invs = orgService.getUserPendingInvitations(user.email || undefined);
    setUserOrgs(orgs);
    setPendingInvitations(invs);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/signin");
      return;
    }

    refreshUserData();
  }, [user, authLoading, router, refreshUserData]);

  const handleJoinDemoVemStudio = () => {
    if (!user || !user.email) return;
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = orgService.attachUserToDemoVemStudio(
        user.uid,
        user.email,
        user.displayName || undefined
      );
      setSuccessMsg(`Joined '${res.organization.name}'! Launching control plane...`);
      setTimeout(() => {
        router.push("/dashboard");
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to join demo-vemstudio";
      setError(msg);
      setIsSubmitting(false);
    }
  };

  const handleAcceptInvite = (invId: string) => {
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = orgService.acceptInvitation(invId, user?.uid, user?.displayName || undefined);
      if (!res.success) {
        setError(res.error || "Failed to activate invitation.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg("Invitation accepted! Entering workspace...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error accepting invitation";
      setError(msg);
      setIsSubmitting(false);
    }
  };

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken.trim()) return;

    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = orgService.acceptInvitation(
        inviteToken.trim(),
        user?.uid,
        user?.displayName || undefined
      );
      if (!res.success) {
        setError(res.error || "Invalid invitation token or already consumed.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg("Invitation verified! Entering organization...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error verifying invitation code";
      setError(msg);
      setIsSubmitting(false);
    }
  };

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setError("Please specify a valid organization name.");
      return;
    }

    if (!user || !user.email) {
      setError("Authenticated user email required to provision organization.");
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = orgService.createOrganization(
        orgName.trim(),
        user.uid,
        user.email,
        user.displayName || undefined
      );

      if (!res.success) {
        setError("Failed to provision organization.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(`Organization '${res.organization.name}' provisioned! Launching control plane...`);
      setTimeout(() => {
        router.push("/dashboard");
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Provisioning failed";
      setError(msg);
      setIsSubmitting(false);
    }
  };

  const handleEnterOrg = (orgId: string) => {
    orgService.switchOrganization(orgId);
    router.push("/dashboard");
  };

  const cleanSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "my-org";

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-200 animate-spin" />
          <span className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            {"ARGUS // VERIFYING TENANCY STATUS..."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-zinc-800 selection:text-white">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* Top Header */}
      <header className="relative z-10 max-w-5xl mx-auto w-full flex items-center justify-between pb-6 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <ArgusLogo size="md" />
          <div>
            <div className="font-mono text-[11px] tracking-widest uppercase text-zinc-400">
              {"ARGUS // TENANCY ONBOARDING"}
            </div>
            <div className="text-xs text-zinc-500">
              Multi-Tenant Isolation &amp; Role Boundary Setup
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium text-zinc-300">
              {user.displayName || "Authenticated User"}
            </div>
            <div className="text-[11px] font-mono text-zinc-500">{user.email}</div>
          </div>
          <button
            onClick={() => signOut().then(() => router.push("/signin"))}
            className="p-2 border border-zinc-800 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-5xl mx-auto w-full py-8 my-auto">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-3.5 bg-rose-950/40 border border-rose-800/80 rounded-lg text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-3.5 bg-emerald-950/40 border border-emerald-800/80 rounded-lg text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1-Click Demo Evaluation Project for Non-Tenant Accounts */}
        <div className="mb-8 p-6 bg-gradient-to-r from-emerald-950/40 via-zinc-900/90 to-emerald-950/40 border border-emerald-500/40 rounded-2xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Google Builder Cup Evaluation Access</span>
              </div>
              <h2 className="text-lg font-bold text-white">
                Join Evaluation Project: <span className="text-emerald-400 font-mono">demo-vemstudio</span> (HUKUROU)
              </h2>
              <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
                Your account ({user?.email}) is not yet associated with an enterprise tenant. You can immediately join the official <strong className="text-white">demo-vemstudio</strong> evaluation project with pre-configured Google Drive sync, sample redaction policies, and real-time AI agent access logging.
              </p>
            </div>

            <button
              type="button"
              onClick={handleJoinDemoVemStudio}
              disabled={isSubmitting}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shrink-0"
            >
              <Building2 className="w-4 h-4" />
              <span>Attach to demo-vemstudio &amp; Enter</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Existing Organizations Banner (if any) */}
        {userOrgs.length > 0 && (
          <div className="mb-8 p-5 bg-zinc-900/80 border border-zinc-800 rounded-xl shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Assigned Organization Membership Detected</span>
                </div>
                <h3 className="text-base font-semibold text-white">
                  You already belong to {userOrgs.length} active organization{userOrgs.length > 1 ? "s" : ""}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  You can immediately enter your control-plane workspace, or provision an additional organization below.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {userOrgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleEnterOrg(org.id)}
                    className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Enter {org.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pending Invitations Section */}
        {pendingInvitations.length > 0 && (
          <div className="mb-8 p-5 bg-amber-950/20 border border-amber-800/50 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-400 mb-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Team Invitation Available</span>
            </div>
            <p className="text-xs text-zinc-300 mb-4">
              An administrator has invited your account ({user.email}) to join an existing organization.
            </p>

            <div className="space-y-3">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-lg flex items-center justify-between flex-wrap gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">
                        {inv.orgId === "org-hukurou" ? "HUKUROU" : inv.orgId}
                      </span>
                      <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[11px] font-mono">
                        Role: {inv.roleId}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      Invited: {new Date(inv.createdAt).toLocaleDateString()} {"//"} Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAcceptInvite(inv.id)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>Accept &amp; Join Organization</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2-Column Options Grid: Create New Org vs Enter Code */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Card: Provision New Organization (2 Cols) */}
          <div className="lg:col-span-2 p-6 bg-zinc-900/60 border border-zinc-800/90 rounded-xl shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-200">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Provision New Organization
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Instantly establish an enterprise tenant boundary with dedicated storage and workspaces.
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded text-[10px] font-mono uppercase tracking-wider">
                  Self-Serve Tenant
                </span>
              </div>

              {/* Provisioning Features Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 mb-1">
                    <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Dedicated Cloud Storage</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono break-all">
                    gs://argus-tenant-{cleanSlug}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    Single tenant bucket with isolated file storage and retention policies.
                  </div>
                </div>

                <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 mb-1">
                    <Layers className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Two Default Workspaces</span>
                  </div>
                  <div className="text-[11px] text-zinc-300">
                    Demo-{orgName || "Organization"} &amp; {orgName || "Organization"}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    Includes sandbox for safe agent prototyping + production control plane.
                  </div>
                </div>

                <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Lead Admin Role</span>
                  </div>
                  <div className="text-[11px] text-zinc-300 font-mono">
                    {"Rank 100 // Reserved Authority"}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    Granted policy authoring, member invitation, and full control plane rights.
                  </div>
                </div>

                <div className="p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200 mb-1">
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Subscription Quota</span>
                  </div>
                  <div className="text-[11px] text-zinc-300 font-mono">
                    {"10 Seats // 14-Day Evaluation"}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">
                    Invite collaborators with customized privilege ranks up to Rank 80.
                  </div>
                </div>
              </div>

              {/* Creation Form */}
              <form onSubmit={handleCreateOrg} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                    Organization / Company Name
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Corporation, HUKUROU, Obsidian Cyber"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !orgName.trim()}
                  className="w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Provision Organization &amp; Enter Argus</span>
                </button>
              </form>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-900 text-[11px] text-zinc-600 font-mono text-center">
              Cerberus Gateway enforces strict workspace boundaries &amp; zero-leakage RAG retrieval.
            </div>
          </div>

          {/* Secondary Card: Invitation Token / Manual Activation (1 Col) */}
          <div className="p-6 bg-zinc-900/60 border border-zinc-800/90 rounded-xl shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-200">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Have an Invite Token?
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Join an existing tenant workspace
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                If your workspace administrator sent you an invitation ID or direct code, paste it below to link your account.
              </p>

              <form onSubmit={handleManualTokenSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                    Invitation Token / ID
                  </label>
                  <input
                    type="text"
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    placeholder="e.g. inv-1728200000"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-mono transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !inviteToken.trim()}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Verify &amp; Activate</span>
                </button>
              </form>
            </div>

            <div className="mt-6 p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-lg text-[11px] text-zinc-400">
              <div className="font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span>Awaiting Invitation?</span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Ask your organization Admin to invite <span className="text-zinc-400 font-mono">{user.email}</span> from the <span className="text-zinc-300">Sandbox &gt; Team</span> management console.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-5xl mx-auto w-full pt-6 border-t border-zinc-900 flex items-center justify-between text-[11px] font-mono text-zinc-600">
        <div>{"ARGUS CONTROL PLANE // TENANCY ENGINE v2.4"}</div>
        <div className="flex items-center gap-3">
          <span>GCP FIRESTORE BACKED</span>
          <span>{"//"}</span>
          <span>CERBERUS ENFORCED</span>
        </div>
      </footer>
    </div>
  );
}

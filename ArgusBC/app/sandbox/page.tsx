"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ProtectedRoute, useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { orgService } from "@/lib/org-service";
import { DEMO_SUBJECTS, LOCAL_POLICIES, DEMO_DOCUMENTS, formatDigest } from "@/lib/api";
import { DocumentStatusBadge } from "@/components/DocumentStatusBadge";
import {
  Terminal,
  Cpu,
  Shield,
  ShieldCheck,
  Bot,
  AlertTriangle,
  Lock,
  Info,
  Users,
  UserPlus,
  Mail,
  CheckCircle2,
  Trash2,
  Clock,
  Send,
  Sparkles,
} from "lucide-react";

export default function SandboxPage() {
  const { user } = useAuth();

  // Top Tabs: "team" (Members & Invitations) vs "simulator" (RAG Scenario Simulator)
  const [activeTab, setActiveTab] = useState<"team" | "simulator">("team");

  // --- Team & Invitations State ---
  const [subscription, setSubscription] = useState(() => orgService.getSubscription());
  const [members, setMembers] = useState(() => orgService.getMembers());
  const [invitations, setInvitations] = useState(() => orgService.getInvitations());
  const [roles] = useState(() => orgService.getRoles());

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("role-member");
  const [inviteFeedback, setInviteFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  // --- Simulator State ---
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("demo_sales_viewer");
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("sales-quarterly");
  const [selectedDocSha, setSelectedDocSha] = useState<string>(DEMO_DOCUMENTS[0].source_sha256);

  const activeSubject = DEMO_SUBJECTS.find((s) => s.subject_id === selectedSubjectId) || DEMO_SUBJECTS[0];
  const activePolicy = LOCAL_POLICIES.find((p) => p.policy_id === selectedPolicyId) || LOCAL_POLICIES[0];
  const activeDoc = DEMO_DOCUMENTS.find((d) => d.source_sha256 === selectedDocSha) || DEMO_DOCUMENTS[0];

  const adminUid = user?.uid || "user-admin-jc";
  const adminEmail = user?.email || "jc@vem-studio.com";

  React.useEffect(() => {
    orgService.getMemberByIdOrEmail(adminUid, adminEmail);
    setMembers([...orgService.getMembers()]);
    setSubscription({ ...orgService.getSubscription() });
    setInvitations([...orgService.getInvitations()]);
  }, [user, adminUid, adminEmail]);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSubmittingInvite(true);
    setInviteFeedback(null);

    const res = orgService.inviteUser(adminUid, inviteEmail.trim(), selectedRoleId, adminEmail);
    setIsSubmittingInvite(false);

    if (res.success && res.invitation) {
      setInviteFeedback({
        success: true,
        message: `Invitation successfully sent to ${res.invitation.email}! 1 seat has been reserved.`,
      });
      setInviteEmail("");
      setInvitations([...orgService.getInvitations()]);
      setSubscription({ ...orgService.getSubscription() });
    } else {
      setInviteFeedback({
        success: false,
        message: res.error || "Failed to send invitation.",
      });
    }
  };

  const handleAcceptInvite = (invitationId: string) => {
    const res = orgService.acceptInvitation(invitationId);
    if (res.success && res.member) {
      setInvitations([...orgService.getInvitations()]);
      setMembers([...orgService.getMembers()]);
      setSubscription({ ...orgService.getSubscription() });
      const assignedRole = roles.find((r) => r.id === res.member?.roleId);
      setInviteFeedback({
        success: true,
        message: `Invitation activated! ${res.member.email} is now an Active Member with role "${assignedRole?.name || res.member.roleId}".`,
      });
    } else {
      setInviteFeedback({
        success: false,
        message: res.error || "Failed to activate invitation.",
      });
    }
  };

  const handleRevokeInvite = (invitationId: string) => {
    const revoked = orgService.revokeInvitation(invitationId);
    if (revoked) {
      setInvitations([...orgService.getInvitations()]);
      setSubscription({ ...orgService.getSubscription() });
      setInviteFeedback({
        success: true,
        message: "Invitation revoked. 1 seat returned to available pool.",
      });
    }
  };

  const availableSeats = Math.max(0, subscription.seatLimit - subscription.seatsAllocated);
  const seatPercentage = Math.min(100, Math.round((subscription.seatsAllocated / subscription.seatLimit) * 100));

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/80">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  Users &amp; Agents Governance
                </h1>
                <span className="text-[11px] font-medium text-zinc-800 bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 rounded-full">
                  Organization: HUKUROU
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 max-w-2xl leading-relaxed">
                Manage organization seat licenses, send invitations within subscription limits, and simulate
                RedactCore access boundaries for personas and AI agents.
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("team");
                  setInviteFeedback(null);
                }}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === "team"
                    ? "bg-white text-gray-900 shadow-xs font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Team &amp; Invitations</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("simulator");
                  setInviteFeedback(null);
                }}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === "simulator"
                    ? "bg-white text-gray-900 shadow-xs font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Policy Simulator</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Team & Invitations */}
          {activeTab === "team" && (
            <div className="space-y-6">
              {/* Seat Pool & Subscription Overview */}
              <div className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Organization Subscription &amp; Seat Pool
                    </div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5 flex items-center gap-2">
                      <span>Enterprise Tier Plan</span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        ACTIVE
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 font-mono text-left sm:text-right">
                    <div>Valid Through: {subscription.currentPeriodEnd.split("T")[0]}</div>
                    <div className="text-[11px] text-gray-400">Auto-Renew: Enabled</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800">
                      {subscription.seatsAllocated} of {subscription.seatLimit} Seats Allocated
                    </span>
                    <span className="text-gray-500 font-mono">
                      {availableSeats} seats remaining
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200/60">
                    <div
                      className={`h-full transition-all duration-300 ${
                        seatPercentage >= 90 ? "bg-amber-500" : "bg-zinc-900"
                      }`}
                      style={{ width: `${seatPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Invite User Card & Form */}
              <div className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <UserPlus className="w-4 h-4 text-zinc-900" />
                  <h2 className="text-sm font-bold text-gray-900">
                    Invite New Organization Member
                  </h2>
                </div>

                <form onSubmit={handleSendInvite} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Invitee Email Address <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="email"
                          required
                          placeholder="e.g. colleague@company.internal"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Assigned Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedRoleId}
                        onChange={(e) => setSelectedRoleId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} (Rank: {r.rank})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-gray-400" />
                      <span>Admin Authority: Invitation reserves 1 seat in HUKUROU for 14 days.</span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingInvite || !inviteEmail.trim() || availableSeats <= 0}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingInvite ? "Sending..." : "Send Invitation"}</span>
                    </button>
                  </div>
                </form>

                {inviteFeedback && (
                  <div
                    className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2 ${
                      inviteFeedback.success
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-red-50 border-red-200 text-red-900"
                    }`}
                  >
                    {inviteFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    )}
                    <span>{inviteFeedback.message}</span>
                  </div>
                )}
              </div>

              {/* Pending Invitations Table */}
              {invitations.length > 0 && (
                <div className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Pending Invitations ({invitations.filter((i) => i.status === "pending").length})
                    </h3>
                    <span className="text-[11px] text-gray-400 font-mono">14-DAY LIFECYCLE</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-100 text-[11px]">
                          <th className="py-2">Email</th>
                          <th className="py-2">Assigned Role</th>
                          <th className="py-2">Invited By</th>
                          <th className="py-2">Expires</th>
                          <th className="py-2">Status</th>
                          <th className="py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {invitations.map((inv) => {
                          const assignedRole = roles.find((r) => r.id === inv.roleId);
                          return (
                            <tr key={inv.id} className="hover:bg-gray-50/50">
                              <td className="py-2.5 font-medium text-gray-900 font-mono">{inv.email}</td>
                              <td className="py-2.5 text-gray-600">
                                {assignedRole?.name || inv.roleId} (Rank: {assignedRole?.rank || 50})
                              </td>
                              <td className="py-2.5 text-gray-500 font-mono">{inv.invitedByUserId}</td>
                              <td className="py-2.5 text-gray-500">{inv.expiresAt.split("T")[0]}</td>
                              <td className="py-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                                    inv.status === "pending"
                                      ? "bg-amber-50 text-amber-700 border-amber-200"
                                      : "bg-gray-100 text-gray-500 border-gray-200"
                                  }`}
                                >
                                  {inv.status}
                                </span>
                              </td>
                              <td className="py-2.5 text-right">
                                {inv.status === "pending" && (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleAcceptInvite(inv.id)}
                                      className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-semibold transition-colors shadow-xs"
                                      title="Simulate user accepting this invitation"
                                    >
                                      Activate &amp; Join
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const url = `${window.location.origin}/invite?id=${inv.id}`;
                                        navigator.clipboard.writeText(url);
                                        setInviteFeedback({
                                          success: true,
                                          message: `Invitation link copied to clipboard: ${url}`,
                                        });
                                      }}
                                      className="px-2 py-1 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 text-[11px] font-medium"
                                      title="Copy invitation acceptance link"
                                    >
                                      Copy Link
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRevokeInvite(inv.id)}
                                      className="text-[11px] text-red-600 hover:text-red-800 font-medium px-1"
                                    >
                                      Revoke
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Current Active Members Table */}
              <div className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Active Members ({members.length})
                  </h3>
                  <span className="text-[11px] text-gray-400 font-mono">SEAT OCCUPIED</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-100 text-[11px]">
                        <th className="py-2">Name / Email</th>
                        <th className="py-2">Role</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Joined Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {members.map((m) => {
                        const mRole = roles.find((r) => r.id === m.roleId);
                        const isLeadAdmin = m.roleId === "role-admin";
                        return (
                          <tr key={m.userId} className="hover:bg-gray-50/50">
                            <td className="py-2.5">
                              <div className="font-medium text-gray-900">{m.displayName || m.email}</div>
                              <div className="text-[11px] text-gray-400 font-mono">{m.email}</div>
                            </td>
                            <td className="py-2.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                                  isLeadAdmin
                                    ? "bg-zinc-900 text-white border-zinc-900"
                                    : "bg-gray-100 text-gray-800 border-gray-200"
                                }`}
                              >
                                {isLeadAdmin && <Shield className="w-2.5 h-2.5" />}
                                <span>{mRole?.name || m.roleId} (Rank: {mRole?.rank || 50})</span>
                              </span>
                            </td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {m.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-gray-500 font-mono">{m.joinedAt.split("T")[0]}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Persona & Policy Retrieval Simulator */}
          {activeTab === "simulator" && (
            <div className="space-y-6">
              {/* Architecture Notice */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <span className="font-semibold uppercase tracking-wide">
                    Cerberus Gateway Simulation:
                  </span>{" "}
                  This sandbox simulates agent document retrieval under policy boundaries. RedactCore renders
                  the underlying document transformations and verifies zero leakage before agent ingestion.
                </div>
              </div>

              {/* Context Selector Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Subject Selector */}
                <div className="p-4 bg-white border border-gray-200/80 rounded-xl shadow-xs space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    Demo Subject Persona
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 text-xs text-gray-800 rounded-lg focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  >
                    {DEMO_SUBJECTS.map((s) => (
                      <option key={s.subject_id} value={s.subject_id}>
                        {s.name} ({s.clearance})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Policy Selector */}
                <div className="p-4 bg-white border border-gray-200/80 rounded-xl shadow-xs space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    RedactCore Policy
                  </label>
                  <select
                    value={selectedPolicyId}
                    onChange={(e) => setSelectedPolicyId(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 text-xs text-gray-800 rounded-lg focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  >
                    {LOCAL_POLICIES.map((p) => (
                      <option key={p.policy_id} value={p.policy_id}>
                        {p.name} (v{p.version})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Document Selector */}
                <div className="p-4 bg-white border border-gray-200/80 rounded-xl shadow-xs space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                    Source Document Fixture
                  </label>
                  <select
                    value={selectedDocSha}
                    onChange={(e) => setSelectedDocSha(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 text-xs text-gray-800 rounded-lg focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  >
                    {DEMO_DOCUMENTS.map((d) => (
                      <option key={d.source_sha256} value={d.source_sha256}>
                        {d.filename} ({d.file_type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Simulation Output Card */}
              <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                    <Bot className="w-4 h-4 text-zinc-900" />
                    <span>Agent Retrieval Query Context</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">MCP / RAG SIMULATION</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
                    <div className="font-semibold text-gray-800">
                      Subject: {activeSubject.name} (Clearance: {activeSubject.clearance})
                    </div>
                    <div className="text-gray-600 font-mono text-[11px]">
                      Policy: {activePolicy.name} &middot; Target: {activeDoc.filename}
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800 text-[11px] leading-relaxed">
                    <strong>Cerberus Gateway Decision:</strong> Access granted under policy{" "}
                    <code>{activePolicy.policy_id}</code>. Document transformed with fail-closed zero-leakage guarantees before reaching agent context.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

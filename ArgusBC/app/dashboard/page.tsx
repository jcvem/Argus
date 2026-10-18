"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute, useAuth } from "@/lib/auth-context";
import { orgService } from "@/lib/org-service";
import { AppShell } from "@/components/AppShell";
import { TimelineCard, TimelineEntryData } from "@/components/TimelineCard";
import { HealthCards } from "@/components/HealthCards";
import { FindingsModal } from "@/components/FindingsModal";
import { DocumentStatusBadge } from "@/components/DocumentStatusBadge";
import { api, DEMO_DOCUMENTS, formatDigest } from "@/lib/api";
import { HealthResponse, DemoDocumentRecord } from "@/lib/types";
import {
  Search,
  Plus,
  RefreshCw,
  Eye,
  Sliders,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  Filter,
  Database,
  Sparkles,
  Play,
  RotateCcw,
  Zap,
  Activity,
  UploadCloud,
} from "lucide-react";
import {
  auditService,
  CANONICAL_SEED_ENTRIES,
  AgentSimulationType,
  AGENT_SIMULATION_PRESETS,
} from "@/lib/audit-service";
import { LiveRedactionStudio } from "@/components/LiveRedactionStudio";

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isHealthLive, setIsHealthLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DemoDocumentRecord[]>(DEMO_DOCUMENTS);
  const [inspectingDoc, setInspectingDoc] = useState<DemoDocumentRecord | null>(null);

  // Real-time Activity Feed State
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntryData[]>(CANONICAL_SEED_ENTRIES);
  const [isLiveFeedConnected, setIsLiveFeedConnected] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedSimAgent, setSelectedSimAgent] = useState<AgentSimulationType>("AVA");
  const [showSimulator, setShowSimulator] = useState(false);
  const [showLiveStudio, setShowLiveStudio] = useState(true);
  const [simSuccessBanner, setSimSuccessBanner] = useState<{
    agentName: string;
    latency: string;
    live: boolean;
  } | null>(null);

  // Search & Role filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  // Global card view toggles
  const [globalCompact, setGlobalCompact] = useState(false);
  const [globalViewMode, setGlobalViewMode] = useState<"list" | "grid">("list");

  // Show extra telemetry section
  const [showTelemetry, setShowTelemetry] = useState(false);

  // Firestore HUKUROU Provisioning state
  const { user } = useAuth();
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionMessage, setProvisionMessage] = useState<{ success: boolean; text: string } | null>(null);

  const handleProvisionHukurou = async () => {
    setIsProvisioning(true);
    setProvisionMessage(null);
    const adminUid = user?.uid || "user-admin-jc";
    const adminEmail = user?.email || "jc@vem-studio.com";
    const res = await orgService.provisionHukurouToFirestore(adminUid, adminEmail);
    setIsProvisioning(false);
    if (res.success) {
      setProvisionMessage({
        success: true,
        text: `HUKUROU organization provisioned to Firestore with ${res.recordsCreated} records. Admin: ${adminEmail}`,
      });
    } else {
      setProvisionMessage({
        success: false,
        text: res.error || "Failed to provision records to Firestore.",
      });
    }
  };

  const loadHealthData = async () => {
    setLoading(true);
    const result = await api.checkHealth();
    setHealth(result.data);
    setIsHealthLive(result.live);
    setLoading(false);
  };

  useEffect(() => {
    loadHealthData();

    // Subscribe to live Firestore audit event ingestion stream
    const unsubscribe = auditService.subscribeToAuditEvents((events) => {
      setTimelineEntries(events);
      setIsLiveFeedConnected(true);
    });

    return () => unsubscribe();
  }, []);

  const handleTriggerSimulation = async (agentKey: AgentSimulationType) => {
    setIsSimulating(true);
    try {
      const res = await auditService.triggerLiveAgentExecution(agentKey);
      setSimSuccessBanner({
        agentName: res.event.agentName,
        latency: res.event.reductionLatency || `${res.latencyMs}ms`,
        live: res.isLiveBackend,
      });
      setTimeout(() => setSimSuccessBanner(null), 8000);
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Reset Activity Feed Modal State
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [isResettingFeed, setIsResettingFeed] = useState(false);

  const handleResetFeed = () => {
    setShowResetConfirmModal(true);
  };

  const handleConfirmResetFeed = async () => {
    setIsResettingFeed(true);
    try {
      await auditService.resetFeedToDefaults();
      setShowResetConfirmModal(false);
    } catch (err) {
      console.error("Failed to reset feed:", err);
    } finally {
      setIsResettingFeed(false);
    }
  };

  // Filter timeline entries based on search query and selected role
  const filteredTimeline = timelineEntries.filter((entry) => {
    const matchesSearch =
      searchQuery === "" ||
      entry.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.agentRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.fileTarget.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.actionSentence.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      !roleFilter ||
      entry.agentCategory.toLowerCase() === roleFilter.toLowerCase() ||
      entry.agentRole.toLowerCase().includes(roleFilter.toLowerCase());

    return matchesSearch && matchesRole;
  });

  const verifiedCount = documents.filter((d) => d.safety_state === "verified").length;
  const reviewCount = documents.filter((d) => d.safety_state === "review_required").length;
  const blockedCount = documents.filter((d) => d.safety_state.startsWith("blocked")).length;

  return (
    <ProtectedRoute>
      <AppShell
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeRoleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
      >
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          {/* 1. Page Header Bar matching UI_concept.png */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/80">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  Data Timeline &amp; Activity Feed
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{isLiveFeedConnected ? "Live Firestore Feed" : "Activity Feed (Synced)"}</span>
                  <span className="text-[10px] opacity-75 font-mono">({filteredTimeline.length})</span>
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time AI agent activity feed, declarative policy checkpoints, and verified privacy-preserved view generation.
              </p>
            </div>

            {/* Right actions: search input, simulator toggle, telemetry toggle, new view button */}
            <div className="flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter timeline…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 w-44"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowSimulator(!showSimulator)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                  showSimulator
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>{showSimulator ? "Hide Simulator" : "Simulate Agent Query"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLiveStudio(!showLiveStudio)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                  showLiveStudio
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{showLiveStudio ? "Hide Redactor" : "Live Drag & Drop"}</span>
              </button>

              <button
                type="button"
                onClick={handleResetFeed}
                className="px-2.5 py-1.5 text-xs text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors flex items-center gap-1"
                title="Reset feed to baseline cards"
              >
                <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                <span className="hidden sm:inline">Reset</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTelemetry(!showTelemetry)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                  showTelemetry
                    ? "bg-zinc-100 text-zinc-900 border-zinc-300 font-semibold"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showTelemetry ? "Hide Health" : "Health"}</span>
              </button>

              <Link
                href="/views/new"
                className="px-3.5 py-1.5 text-xs font-medium bg-[#10b981] hover:bg-[#059669] text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>New View</span>
              </Link>
            </div>
          </div>

          {/* HUKUROU Organization & Firestore Provisioning Banner */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
                  HK
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900 tracking-tight">
                      Organization: HUKUROU
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200">
                      Tier: Enterprise (10 Seats)
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-2">
                    <span>Cloud Storage: gs://argus-tenant-org-hukurou</span>
                    <span>&middot;</span>
                    <span>Admin: jc@vem-studio.com</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleProvisionHukurou}
                  disabled={isProvisioning}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{isProvisioning ? "Provisioning..." : "Provision HUKUROU to Firestore"}</span>
                </button>
              </div>
            </div>

            {provisionMessage && (
              <div
                className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2 ${
                  provisionMessage.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                {provisionMessage.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                )}
                <span>{provisionMessage.text}</span>
              </div>
            )}
          </div>

          {/* 1.5. Live AI Agent Query & Interception Simulator */}
          {showSimulator && (
            <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 text-white rounded-xl p-5 shadow-sm border border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      Live AI Agent Interception &amp; RedactCore Enclave
                    </h2>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-emerald-500/30">
                      Real-Time Ingestion
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300">
                    Simulate an external AI agent requesting enterprise documents. Argus intercepts the query, enforces declarative policies, verifies zero leakage in milliseconds, and streams the card into this feed.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400 hidden lg:inline">
                    Backend: <span className="text-emerald-400 font-mono">RedactCore Cloud Run / Local</span>
                  </span>
                </div>
              </div>

              {/* Agent Preset Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.values(AGENT_SIMULATION_PRESETS).map((preset) => {
                  const isSelected = selectedSimAgent === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setSelectedSimAgent(preset.key)}
                      className={`text-left p-3 rounded-lg border transition-all text-xs space-y-1.5 ${
                        isSelected
                          ? "bg-zinc-800 border-emerald-500 ring-2 ring-emerald-500/20 text-white shadow-xs"
                          : "bg-zinc-850/50 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{preset.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {preset.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        Target: <span className="text-zinc-200 font-mono">{preset.targetFilename}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate font-mono">
                        Policy: <span className="text-emerald-400">{preset.policyId}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Action Trigger Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-800/80">
                <div className="text-xs text-zinc-400 flex items-center gap-2">
                  <span>Selected agent:</span>
                  <span className="font-semibold text-white">
                    {AGENT_SIMULATION_PRESETS[selectedSimAgent].name} ({AGENT_SIMULATION_PRESETS[selectedSimAgent].role})
                  </span>
                  <span>&rarr;</span>
                  <span className="font-mono text-emerald-400">
                    {AGENT_SIMULATION_PRESETS[selectedSimAgent].targetFilename}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleTriggerSimulation(selectedSimAgent)}
                  disabled={isSimulating}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-lg transition-all shadow-sm"
                >
                  {isSimulating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                      <span>Executing RedactCore Enclave...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current text-zinc-950" />
                      <span>Trigger AI Agent Request</span>
                    </>
                  )}
                </button>
              </div>

              {/* Simulation Result Success Banner */}
              {simSuccessBanner && (
                <div className="p-3 bg-emerald-950/90 border border-emerald-500/40 rounded-lg text-xs text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Intercepted query for <strong>{simSuccessBanner.agentName}</strong> &bull; Policy enforced in{" "}
                      <strong className="text-emerald-300 font-mono">{simSuccessBanner.latency}</strong> &bull;{" "}
                      <strong>0 bytes leaked</strong> &bull; Card prepended to Activity Feed!
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-900/60 text-emerald-300 rounded border border-emerald-700/50 self-start sm:self-auto">
                    {simSuccessBanner.live ? "Cloud Run Live" : "Enclave Verified"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 1.6. Live Drag & Drop Redaction Studio */}
          {showLiveStudio && (
            <LiveRedactionStudio />
          )}

          {/* Active Filter Pill Bar (if role or search is active) */}
          {(roleFilter || searchQuery) && (
            <div className="flex items-center gap-2 text-xs bg-white p-2.5 rounded-xl border border-gray-200">
              <span className="text-gray-400 font-medium">Active filters:</span>
              {roleFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                  <span>Role: {roleFilter}</span>
                  <button
                    type="button"
                    onClick={() => setRoleFilter(null)}
                    className="hover:text-zinc-900 font-bold ml-1"
                  >
                    &times;
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                  <span>Query: &ldquo;{searchQuery}&rdquo;</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="hover:text-black font-bold ml-1"
                  >
                    &times;
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setRoleFilter(null);
                  setSearchQuery("");
                }}
                className="text-[11px] text-gray-500 hover:text-gray-900 underline ml-auto"
              >
                Clear all
              </button>
            </div>
          )}

          {/* 2. Optional RedactCore System Telemetry Drawer */}
          {showTelemetry && health && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  RedactCore Telemetry &amp; Verification Health
                </span>
                <button
                  type="button"
                  onClick={loadHealthData}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-xs text-argus-brand hover:underline font-medium"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                  <span>Refresh Endpoint</span>
                </button>
              </div>
              <HealthCards
                health={health}
                isLive={isHealthLive}
                verifiedCount={verifiedCount}
                reviewCount={reviewCount}
                blockedCount={blockedCount}
              />
            </div>
          )}

          {/* 3. AI Agent Timeline Cards Feed (The Core Reference Layout) */}
          <div className="space-y-5">
            {filteredTimeline.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center space-y-2">
                <p className="text-sm font-semibold text-gray-800">
                  No timeline entries matched your criteria.
                </p>
                <p className="text-xs text-gray-500">
                  Try clearing the role filter or adjusting your search term.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRoleFilter(null);
                    setSearchQuery("");
                  }}
                  className="px-3 py-1.5 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 rounded-lg text-xs font-medium mt-2"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div
                className={
                  globalViewMode === "grid"
                    ? "grid grid-cols-1 xl:grid-cols-2 gap-5"
                    : "space-y-5"
                }
              >
                {filteredTimeline.map((entry) => (
                  <TimelineCard
                    key={entry.id}
                    entry={entry}
                    isCompactGlobal={globalCompact}
                    viewModeGlobal={globalViewMode}
                    onCompactToggle={() => setGlobalCompact(!globalCompact)}
                    onViewModeToggle={() =>
                      setGlobalViewMode(globalViewMode === "list" ? "grid" : "list")
                    }
                    onInspectFile={(filename) => {
                      const match = documents.find((d) => d.filename.includes(filename.split(".")[0]));
                      if (match) {
                        setInspectingDoc(match);
                      }
                    }}
                    onAddClick={() => {
                      // Trigger new view generation flow
                      window.location.href = "/views/new";
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 4. Ingested Documents & Safety Ledger Table */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Ingested Documents &amp; Immutable Source Ledger
                </h2>
                <p className="text-xs text-gray-500">
                  Local RedactCore documents stored under immutable byte-identical SHA-256 digests.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/documents"
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                >
                  Open Ingest Workspace
                </Link>
                <Link
                  href="/views/new"
                  className="px-3 py-1.5 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Generate View
                </Link>
              </div>
            </div>

            {/* Document Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Document / File</th>
                      <th className="py-2.5 px-4">Source SHA-256</th>
                      <th className="py-2.5 px-4">Structure</th>
                      <th className="py-2.5 px-4">Findings</th>
                      <th className="py-2.5 px-4">Safety State</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {documents.map((doc) => (
                      <tr
                        key={doc.source_sha256}
                        className="hover:bg-gray-50/70 transition-colors"
                      >
                        {/* Filename & Type */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-argus-brand flex-shrink-0" />
                            <div>
                              <div className="font-semibold text-gray-900 truncate max-w-[220px]">
                                {doc.filename}
                              </div>
                              <div className="text-[11px] text-gray-400 uppercase font-mono">
                                {doc.file_type} &middot; {doc.uploaded_at}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Source Hash */}
                        <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                          <span
                            className="bg-gray-50 px-2 py-0.5 border border-gray-200 rounded text-[10px]"
                            title={doc.source_sha256}
                          >
                            {formatDigest(doc.source_sha256, 8, 6)}
                          </span>
                        </td>

                        {/* Normalized Structure */}
                        <td className="py-3 px-4 text-[11px] text-gray-600">
                          <div>
                            {doc.page_count}p &middot; {doc.text_block_count} blocks
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {doc.table_count} tables &middot; {doc.figure_count} figures
                          </div>
                        </td>

                        {/* Findings */}
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-900 font-mono">
                            {doc.findings_count}
                          </span>
                          <span className="text-[11px] text-gray-500 ml-1">entities</span>
                        </td>

                        {/* Safety State */}
                        <td className="py-3 px-4">
                          <DocumentStatusBadge state={doc.safety_state} />
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setInspectingDoc(doc)}
                              className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-colors"
                            >
                              Inspect
                            </button>
                            <Link
                              href="/views/new"
                              className="px-2.5 py-1 text-xs font-medium bg-zinc-100 text-zinc-900 border border-zinc-200 hover:bg-zinc-200 rounded-md transition-colors"
                            >
                              Derive
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Demo Indicator */}
              <div className="p-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-gray-500 font-mono">
                <div>
                  SHOWING {documents.length} LOCAL FIXTURE RECORDS &middot; DETERMINISTIC PIPELINE
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>CLIENT SESSION: ACTIVE (LOCAL EMULATION)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Safe Findings Inspection Drawer/Modal */}
        <FindingsModal
          document={inspectingDoc}
          onClose={() => setInspectingDoc(null)}
        />

        {/* Reset Activity Feed Confirmation Modal */}
        {showResetConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-200 overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="w-11 h-11 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-gray-900">
                    Reset Activity Feed to Baseline?
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    This will purge recent interactive transformations and restore the activity timeline to the canonical demo baseline events (AVA Marketing, Cerberus Gateway, and RedactCore Daemon).
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-gray-50 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowResetConfirmModal(false)}
                  disabled={isResettingFeed}
                  className="px-4 py-2 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResetFeed}
                  disabled={isResettingFeed}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isResettingFeed ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Resetting Feed...</span>
                    </>
                  ) : (
                    <span>Confirm Reset</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </ProtectedRoute>
  );
}

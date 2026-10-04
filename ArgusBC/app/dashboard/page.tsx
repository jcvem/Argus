"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/lib/auth-context";
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
} from "lucide-react";

// Canonical timeline activity feed entries matching UI_concept.png
const INITIAL_TIMELINE_ENTRIES: TimelineEntryData[] = [
  {
    id: "ACT-0914-1",
    agentName: "AVA",
    agentRole: "Marketing AI Agent",
    agentCategory: "Marketing",
    timestamp: "2026/09/14 10:28 AM",
    actionSentence:
      "created a new campaign draft for October promotion, asking for September sells report.",
    fileTarget: "Sep_Sells.xls",
    policyCheckRole: "AVA (Role: Marketing - Agent)",
    policyConfirmedText:
      "Marketing - Agent allowed access to Sep_Sells.xls, but blocked for",
    policyBlockedItem: "customer detail lists sheet.",
    policyGeneratedView: "Sep_Sells_Marketing_AVA.xls",
    reductionLatency: "63ms",
    initialTab: "reason",
    safetyStatus: "allowed_with_reduction",
    reasonDetails: {
      policyId: "sales-quarterly",
      policyVersion: "1.0.0",
      rulesTriggered: [
        "RULE-SAL-01: Redact CUSTOMER_NAME in spreadsheets",
        "RULE-SAL-02: Suppress EMAIL_ADDRESS values",
        "RULE-SAL-03: Mask PHONE_NUMBER values",
        "RULE-SAL-04: Block raw customer detail lists sheet (fail-closed)",
      ],
      explanation:
        'AVA (Marketing Agent) requested access to September sales metrics. Under policy "sales-quarterly", aggregated totals, item quantities, and product descriptions are allowed. However, all granular customer PII (Customer Name, Email, Phone Number) is strictly redacted with irreversible black bars, and the "Customer Detail Lists" worksheet is quarantined.',
      failClosedGuarantees: [
        "Zero raw PII transmitted to agent/LLM context",
        "Derived file verified with byte-identical source preservation",
        "Post-transform leak check passed (0 bytes leaked)",
      ],
    },
    rawDataDetails: {
      filename: "Sep_Sells.xls",
      fileSize: "48.2 KB",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      parsedBlocks: 142,
      entitiesDetected: 24,
      sheets: [
        "Sept 2026 Sales (32 rows)",
        "August 2026 Summary (18 rows)",
        "Customer Detail Lists (BLOCKED)",
      ],
    },
  },
  {
    id: "ACT-0914-2",
    agentName: "AVA",
    agentRole: "Marketing AI Agent",
    agentCategory: "Marketing",
    timestamp: "2026/09/14 10:29 AM",
    actionSentence:
      "created a new campaign draft for October promotion, asking for September sells report.",
    fileTarget: "Sep_Sells.xls",
    policyCheckRole: "AVA (Role: Marketing - Agent)",
    policyConfirmedText:
      "Marketing - Agent allowed access to Sep_Sells.xls, but blocked for",
    policyBlockedItem: "customer detail lists sheet.",
    policyGeneratedView: "Sep_Sells_Marketing_AVA.xls",
    reductionLatency: "63ms",
    initialTab: "guardedView", // Matches second card in UI_concept.png
    safetyStatus: "verified",
    reasonDetails: {
      policyId: "sales-quarterly",
      policyVersion: "1.0.0",
      rulesTriggered: [
        "RULE-SAL-01: Redact CUSTOMER_NAME",
        "RULE-SAL-02: Suppress EMAIL_ADDRESS",
        "RULE-SAL-03: Mask PHONE_NUMBER",
      ],
      explanation:
        "Guarded derivative view generated successfully with complete customer PII redaction and spreadsheet layout preservation.",
      failClosedGuarantees: [
        "Customer Name column redacted with solid black bars",
        "Customer Email column suppressed",
        "Phone numbers masked",
      ],
    },
    rawDataDetails: {
      filename: "Sep_Sells.xls",
      fileSize: "48.2 KB",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      parsedBlocks: 142,
      entitiesDetected: 24,
      sheets: ["Sept 2026 Sales", "August 2026", "Customer Detail Lists (BLOCKED)"],
    },
  },
  {
    id: "ACT-0912-1",
    agentName: "Cerberus Gateway",
    agentRole: "Developer Runtime Agent (Preview)",
    agentCategory: "Developer",
    timestamp: "2026/09/12 04:15 PM",
    actionSentence:
      "intercepted API request for partner onboarding documentation, evaluating access boundaries.",
    fileTarget: "Partner_Contract_2026.docx",
    policyCheckRole: "Cerberus Gateway (Role: Developer - Preview Shell)",
    policyConfirmedText:
      "Developer role evaluated against reviewer policy; 4 sensitive findings held for",
    policyBlockedItem: "dual-custody figure review.",
    policyGeneratedView: "Partner_Contract_Developer_View.docx",
    reductionLatency: "94ms",
    initialTab: "reason",
    safetyStatus: "review_required",
    reasonDetails: {
      policyId: "reviewer",
      policyVersion: "1.0.0",
      rulesTriggered: [
        "RULE-REV-01: Require human review for embedded technical diagrams",
        "RULE-REV-02: Mask secret API credentials",
      ],
      explanation:
        'Cerberus Gateway (Preview) emulated developer context retrieval. The document contains technical architecture figures with embedded text that require explicit review per "reviewer" policy rules.',
      failClosedGuarantees: [
        "Quarantined from automated AI ingestion until reviewed",
        "API keys masked with deterministic SHA-256 digests",
      ],
    },
    rawDataDetails: {
      filename: "Partner_Contract_2026.docx",
      fileSize: "112.4 KB",
      sha256: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
      parsedBlocks: 88,
      entitiesDetected: 7,
      sheets: ["Document Sections: 4", "Embedded Figures: 2"],
    },
  },
  {
    id: "ACT-0910-1",
    agentName: "RedactCore Daemon",
    agentRole: "Automated Verifier",
    agentCategory: "Security",
    timestamp: "2026/09/10 09:00 AM",
    actionSentence:
      "completed normalized structural parsing and cryptographic leak verification.",
    fileTarget: "Financial_Audit_Q3.pdf",
    policyCheckRole: "RedactCore Pipeline (Role: Finance - Auditor)",
    policyConfirmedText:
      "Auditor role cleared under finance-full-access policy; phone numbers masked and",
    policyBlockedItem: undefined,
    policyGeneratedView: "Financial_Audit_Q3_Auditor.pdf",
    reductionLatency: "118ms",
    initialTab: "reason",
    safetyStatus: "verified",
    reasonDetails: {
      policyId: "finance-full-access",
      policyVersion: "1.0.0",
      rulesTriggered: [
        "RULE-FIN-01: Allow salary and employee identification for audit",
        "RULE-FIN-02: Mask phone numbers",
      ],
      explanation:
        'Financial audit view generated with full post-transform verification. Original source file SHA-256 matches byte-identically with immutable ledger.',
      failClosedGuarantees: [
        "Byte-identical immutable original verified",
        "Derived artifact reopened and parsed for leak checks",
      ],
    },
    rawDataDetails: {
      filename: "Financial_Audit_Q3.pdf",
      fileSize: "320.1 KB",
      sha256: "c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2",
      parsedBlocks: 260,
      entitiesDetected: 38,
      sheets: ["Financial Statements", "Notes to Accounts"],
    },
  },
];

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isHealthLive, setIsHealthLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DemoDocumentRecord[]>(DEMO_DOCUMENTS);
  const [inspectingDoc, setInspectingDoc] = useState<DemoDocumentRecord | null>(null);

  // Search & Role filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  // Global card view toggles
  const [globalCompact, setGlobalCompact] = useState(false);
  const [globalViewMode, setGlobalViewMode] = useState<"list" | "grid">("list");

  // Show extra telemetry section
  const [showTelemetry, setShowTelemetry] = useState(false);

  const loadHealthData = async () => {
    setLoading(true);
    const result = await api.checkHealth();
    setHealth(result.data);
    setIsHealthLive(result.live);
    setLoading(false);
  };

  useEffect(() => {
    loadHealthData();
  }, []);

  // Filter timeline entries based on search query and selected role
  const filteredTimeline = INITIAL_TIMELINE_ENTRIES.filter((entry) => {
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
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Data Timeline (2026/09/01 - 2026/09/15)
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                AI agent activity feed, declarative policy checkpoints, and verified privacy-preserved view generation.
              </p>
            </div>

            {/* Right actions: search input, telemetry toggle, new view button */}
            <div className="flex items-center gap-2.5">
              <div className="relative hidden md:block">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter timeline…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] w-52"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowTelemetry(!showTelemetry)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                  showTelemetry
                    ? "bg-[#f5f3ff] text-[#7c3aed] border-[#ddd6fe]"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showTelemetry ? "Hide System Health" : "System Health"}</span>
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

          {/* Active Filter Pill Bar (if role or search is active) */}
          {(roleFilter || searchQuery) && (
            <div className="flex items-center gap-2 text-xs bg-white p-2.5 rounded-xl border border-gray-200">
              <span className="text-gray-400 font-medium">Active filters:</span>
              {roleFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe]">
                  <span>Role: {roleFilter}</span>
                  <button
                    type="button"
                    onClick={() => setRoleFilter(null)}
                    className="hover:text-[#6d28d9] font-bold ml-1"
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
                  className="px-3 py-1.5 bg-[#f5f3ff] text-[#7c3aed] rounded-lg text-xs font-medium mt-2"
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
                  className="px-3 py-1.5 text-xs font-medium bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe] rounded-lg transition-colors"
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
                              className="px-2.5 py-1 text-xs font-medium bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe] hover:bg-[#ede9fe] rounded-md transition-colors"
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
      </AppShell>
    </ProtectedRoute>
  );
}

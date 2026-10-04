"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  List,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Clock,
  Sparkles,
  Lock,
  ArrowRight,
} from "lucide-react";
import { GuardedDocumentPreview } from "./GuardedDocumentPreview";

export interface TimelineEntryData {
  id: string;
  agentName: string;
  agentRole: string;
  agentAvatarUrl?: string;
  agentCategory: "Marketing" | "Developer" | "Designer" | "Partner" | "Security";
  timestamp: string;
  actionSentence: string;
  fileTarget: string;
  policyCheckRole: string;
  policyConfirmedText: string;
  policyBlockedItem?: string;
  policyGeneratedView?: string;
  reductionLatency?: string;
  initialTab?: "reason" | "rawData" | "guardedView";
  safetyStatus: "verified" | "review_required" | "blocked" | "allowed_with_reduction";
  reasonDetails?: {
    policyId: string;
    policyVersion: string;
    rulesTriggered: string[];
    explanation: string;
    failClosedGuarantees: string[];
  };
  rawDataDetails?: {
    filename: string;
    fileSize: string;
    sha256: string;
    parsedBlocks: number;
    entitiesDetected: number;
    sheets?: string[];
  };
}

interface TimelineCardProps {
  entry: TimelineEntryData;
  isCompactGlobal?: boolean;
  viewModeGlobal?: "list" | "grid";
  onCompactToggle?: () => void;
  onViewModeToggle?: () => void;
  onAddClick?: (entry: TimelineEntryData) => void;
  onInspectFile?: (filename: string) => void;
}

export function TimelineCard({
  entry,
  isCompactGlobal = false,
  viewModeGlobal = "list",
  onCompactToggle,
  onViewModeToggle,
  onAddClick,
  onInspectFile,
}: TimelineCardProps) {
  const [activeTab, setActiveTab] = useState<"reason" | "rawData" | "guardedView">(
    entry.initialTab || "reason"
  );
  const [localCompact, setLocalCompact] = useState(isCompactGlobal);
  const [localViewMode, setLocalViewMode] = useState<"list" | "grid">(viewModeGlobal);

  const isCompact = onCompactToggle ? isCompactGlobal : localCompact;
  const viewMode = onViewModeToggle ? viewModeGlobal : localViewMode;

  const handleCompactSwitch = () => {
    if (onCompactToggle) {
      onCompactToggle();
    } else {
      setLocalCompact(!localCompact);
    }
  };

  const handleViewModeSwitch = (mode: "list" | "grid") => {
    if (onViewModeToggle) {
      onViewModeToggle();
    } else {
      setLocalViewMode(mode);
    }
  };

  // Compact View Layout
  if (isCompact) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-4 transition-all hover:border-gray-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Agent Avatar */}
            <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              {entry.agentName.slice(0, 2).toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-sm">{entry.agentName}</span>
                <span className="text-xs text-gray-500 font-normal truncate">
                  {entry.agentRole}
                </span>
                <span className="text-[10px] text-gray-400 font-mono hidden md:inline">
                  {entry.timestamp}
                </span>
              </div>
              <p className="text-xs text-gray-700 truncate mt-0.5">
                {entry.actionSentence}{" "}
                <button
                  type="button"
                  onClick={() => onInspectFile?.(entry.fileTarget)}
                  className="text-argus-brand font-medium hover:underline inline"
                >
                  {entry.fileTarget}
                </button>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
            {entry.policyBlockedItem ? (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                <Lock className="w-3 h-3 text-red-600" />
                <span>Restricted</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Verified</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setActiveTab("guardedView");
                setLocalCompact(false);
              }}
              className="px-2.5 py-1 text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors"
            >
              Expand
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full Expanded Card Layout (matching UI_concept.png)
  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-5 sm:p-6 transition-all space-y-4">
      {/* 1. Card Header */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Agent Avatar & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs">
            {entry.agentName.slice(0, 3).toUpperCase()}
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-gray-900 text-base leading-none">
                {entry.agentName}
              </span>
              <span className="text-sm text-gray-500 font-normal leading-none">
                {entry.agentRole}
              </span>
            </div>
            <div className="text-[11px] text-gray-400 font-mono mt-1">
              Event #{entry.id} &middot; {entry.timestamp}
            </div>
          </div>
        </div>

        {/* Right: Small Search Action & Prominent Circular Green Add Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Inspect Agent Activity Logs"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onAddClick?.(entry)}
            className="w-8 h-8 rounded-full bg-[#10b981] hover:bg-[#059669] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95"
            title="Add directive or run new transformation"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 2. Segmented Tabs & View Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-gray-100">
        {/* Segmented Tab Container */}
        <div className="inline-flex p-1 bg-gray-100/90 rounded-lg text-xs font-medium text-gray-600 self-start">
          <button
            type="button"
            onClick={() => setActiveTab("reason")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "reason"
                ? "bg-white text-gray-900 shadow-xs font-semibold"
                : "hover:text-gray-900"
            }`}
          >
            Reason
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("rawData")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "rawData"
                ? "bg-white text-gray-900 shadow-xs font-semibold"
                : "hover:text-gray-900"
            }`}
          >
            Raw Data
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("guardedView")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "guardedView"
                ? "bg-white text-gray-900 shadow-xs font-semibold"
                : "hover:text-gray-900"
            }`}
          >
            Guarded View
          </button>
        </div>

        {/* Right side: Compact View Toggle + View Switcher */}
        <div className="flex items-center gap-3 self-end sm:self-center">
          {/* Compact View Switch */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-gray-500 font-medium">Compact View</span>
            <button
              type="button"
              role="switch"
              aria-checked={isCompact}
              onClick={handleCompactSwitch}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                isCompact ? "bg-argus-brand" : "bg-gray-200"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-transform ${
                  isCompact ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </label>

          {/* List / Grid view switcher */}
          <div className="inline-flex p-0.5 bg-gray-100 rounded-md text-gray-500 border border-gray-200/60">
            <button
              type="button"
              onClick={() => handleViewModeSwitch("list")}
              className={`p-1 rounded ${
                viewMode === "list"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "hover:text-gray-900"
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleViewModeSwitch("grid")}
              className={`p-1 rounded ${
                viewMode === "grid"
                  ? "bg-white text-gray-900 shadow-xs"
                  : "hover:text-gray-900"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Card Body: Activity Row */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-gray-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
            {entry.agentName.slice(0, 2).toUpperCase()}
          </div>
          <div className="text-xs text-gray-800 leading-relaxed">
            <span className="font-bold text-gray-900">{entry.agentName}</span>{" "}
            <span>{entry.actionSentence}</span>{" "}
            <button
              type="button"
              onClick={() => onInspectFile?.(entry.fileTarget)}
              className="text-argus-brand font-medium hover:underline inline-block"
            >
              {entry.fileTarget}
            </button>
          </div>
        </div>

        {/* Telemetry and Policy Check Logs */}
        <div className="pl-10 space-y-1 text-xs font-mono text-gray-500">
          <div>
            <span className="text-gray-400">[ARGUS Policy check]</span>{" "}
            <span>{entry.policyCheckRole}</span>
          </div>

          <div>
            <span className="text-gray-400">[ARGUS Policy confirmed]</span>{" "}
            <span>{entry.policyConfirmedText}</span>{" "}
            {entry.policyBlockedItem && (
              <span className="text-[#ef4444] font-semibold">
                {entry.policyBlockedItem}
              </span>
            )}
          </div>

          {entry.policyGeneratedView && (
            <div>
              <span className="text-gray-400">[ARGUS View Generate]</span>{" "}
              <span>Generates </span>
              <button
                type="button"
                onClick={() => setActiveTab("guardedView")}
                className="text-argus-brand font-medium hover:underline"
              >
                {entry.policyGeneratedView}
              </button>
              <span> with correct reduction ({entry.reductionLatency || "63ms"}).</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. Tab Dynamic Content */}
      <div className="pt-2">
        {/* TAB 1: REASON */}
        {activeTab === "reason" && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200/70 text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-gray-900">
                  Policy Evaluation Trace: {entry.reasonDetails?.policyId || "sales-quarterly"}
                </span>
              </div>
              <span className="text-[10px] font-mono text-gray-500 uppercase">
                VERSION {entry.reasonDetails?.policyVersion || "1.0.0"} &middot; DETERMINISTIC EVALUATION
              </span>
            </div>

            <p className="text-gray-700 leading-relaxed">
              {entry.reasonDetails?.explanation ||
                `The agent authenticated under the role "${entry.agentRole}". Access to high-level sales totals and aggregate transaction counts is permitted under policy "${entry.reasonDetails?.policyId || "sales-quarterly"}". However, granular customer identities (Name, Email, Phone Number) and full customer detail lists sheet are explicitly suppressed to prevent PII leakage to downstream LLMs.`}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 bg-white rounded border border-gray-200 text-[11px] space-y-1">
                <span className="font-semibold text-gray-900 block">Triggered Rules:</span>
                <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                  {(entry.reasonDetails?.rulesTriggered || [
                    "RULE-SAL-01: Redact CUSTOMER_NAME in spreadsheets",
                    "RULE-SAL-02: Suppress EMAIL_ADDRESS values",
                    "RULE-SAL-03: Mask PHONE_NUMBER values",
                    "RULE-SAL-04: Block raw customer detail lists sheet (fail-closed)",
                  ]).map((rule, idx) => (
                    <li key={idx} className="truncate">
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-2.5 bg-white rounded border border-gray-200 text-[11px] space-y-1">
                <span className="font-semibold text-gray-900 block">Fail-Closed Boundary:</span>
                <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                  {(entry.reasonDetails?.failClosedGuarantees || [
                    "Zero raw PII transmitted to agent/LLM context",
                    "Immutable source byte-identical SHA-256 match",
                    "Post-transform leak check passed (0 bytes leaked)",
                  ]).map((g, idx) => (
                    <li key={idx} className="truncate text-emerald-800">
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RAW DATA */}
        {activeTab === "rawData" && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200/70 text-xs space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
              <span className="font-semibold text-gray-900">
                Source Document Telemetry &amp; Normalized Digest
              </span>
              <span className="text-[10px] text-gray-500">
                ZERO-RAW-PII LEDGER
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="p-2 bg-white rounded border border-gray-200">
                <div className="text-gray-400 text-[10px]">SOURCE SHA-256</div>
                <div className="text-gray-800 truncate font-semibold" title={entry.rawDataDetails?.sha256}>
                  {entry.rawDataDetails?.sha256 || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
                </div>
              </div>

              <div className="p-2 bg-white rounded border border-gray-200">
                <div className="text-gray-400 text-[10px]">NORMALIZED PARSE</div>
                <div className="text-gray-800 font-semibold">
                  {entry.rawDataDetails?.parsedBlocks || 142} blocks &middot; 3 tables
                </div>
              </div>

              <div className="p-2 bg-white rounded border border-gray-200">
                <div className="text-gray-400 text-[10px]">DETECTED FINDINGS</div>
                <div className="text-gray-800 font-semibold">
                  {entry.rawDataDetails?.entitiesDetected || 24} entity candidates
                </div>
              </div>
            </div>

            <div className="text-[11px] text-gray-600 bg-white p-2.5 rounded border border-gray-200">
              <div className="font-semibold text-gray-800 mb-1">Detected Sheets &amp; Sections:</div>
              <div className="flex flex-wrap gap-1.5">
                {(entry.rawDataDetails?.sheets || [
                  "Sept 2026 Sales (32 rows)",
                  "August 2026 Summary (18 rows)",
                  "Customer Detail Lists (BLOCKED)",
                ]).map((sheet, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      sheet.includes("BLOCKED")
                        ? "bg-red-50 text-red-700 border border-red-200 font-bold"
                        : "bg-gray-100 text-gray-700 border border-gray-200"
                    }`}
                  >
                    {sheet}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GUARDED VIEW */}
        {activeTab === "guardedView" && (
          <GuardedDocumentPreview
            filename={entry.policyGeneratedView || "Sep_Sells_Marketing_AVA.xls"}
            sourceDigest={entry.rawDataDetails?.sha256}
            policyApplied={entry.reasonDetails?.policyId || "sales-quarterly"}
            reductionLatency={entry.reductionLatency || "63ms"}
          />
        )}
      </div>
    </div>
  );
}

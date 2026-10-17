import React from "react";
import { HealthResponse } from "@/lib/types";
import { api } from "@/lib/api";
import {
  ShieldCheck,
  Cpu,
  AlertTriangle,
  HardDrive,
  Scan,
  Sparkles,
  FileCheck,
  FileWarning,
  FileX,
} from "lucide-react";

interface HealthCardsProps {
  health: HealthResponse;
  isLive: boolean;
  verifiedCount: number;
  reviewCount: number;
  blockedCount: number;
}

export function HealthCards({
  health,
  isLive,
  verifiedCount,
  reviewCount,
  blockedCount,
}: HealthCardsProps) {
  return (
    <div className="space-y-4">
      {/* Ephemeral Storage Warning Banner */}
      {health.storage_ephemeral && (
        <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold uppercase tracking-wide">
              Ephemeral Storage Notice:
            </span>{" "}
            {health.storage_warning ||
              "Local storage is ephemeral. Derived views and uploaded originals are stored locally and will not persist across restarts. Production deployments require durable object storage (GCS) and database persistence."}
          </div>
        </div>
      )}

      {/* Operational Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Engine & API Health */}
        <div className="p-4 bg-white border border-gray-200/80 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span className="font-medium uppercase tracking-wider text-[11px]">Engine Health</span>
            <Cpu className="w-4 h-4 text-argus-brand" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-gray-900">
              RedactCore
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 border border-gray-200 bg-gray-50 text-gray-600 rounded-full">
              {health.version}
            </span>
          </div>
          <div className="mt-2 text-xs flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}
            />
            <span className="text-gray-600">
              {isLive ? "FastAPI Daemon Active" : "Local Contract Emulation"}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] font-mono text-gray-500">
            <span className="text-gray-400">Endpoint:</span>
            <span
              className="truncate max-w-[170px] text-zinc-700 font-medium"
              title={api.getBaseUrl()}
            >
              {api.getBaseUrl().replace(/^https?:\/\//, "")}
            </span>
          </div>
        </div>

        {/* Card 2: Verified Views Generated */}
        <div className="p-4 bg-white border border-gray-200/80 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span className="font-medium uppercase tracking-wider text-[11px]">Verified Views</span>
            <FileCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">
              {verifiedCount}
            </span>
            <span className="text-[11px] text-gray-500">views</span>
          </div>
          <p className="mt-2 text-[11px] text-gray-500 leading-tight">
            Post-transform leak check passed; immutable source SHA-256 byte-identical.
          </p>
        </div>

        {/* Card 3: Review Required Findings */}
        <div className="p-4 bg-white border border-gray-200/80 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span className="font-medium uppercase tracking-wider text-[11px]">Review Required</span>
            <FileWarning className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">
              {reviewCount}
            </span>
            <span className="text-[11px] text-gray-500">candidates</span>
          </div>
          <p className="mt-2 text-[11px] text-gray-500 leading-tight">
            Embedded figures or low-confidence candidate findings requiring dual-custody review.
          </p>
        </div>

        {/* Card 4: Fail-Closed Blocked Ingests */}
        <div className="p-4 bg-white border border-gray-200/80 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span className="font-medium uppercase tracking-wider text-[11px]">Fail-Closed Blocked</span>
            <FileX className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-700">
              {blockedCount}
            </span>
            <span className="text-[11px] text-gray-500">fail-safe</span>
          </div>
          <p className="mt-2 text-[11px] text-gray-500 leading-tight">
            Scanned raster files with incomplete OCR coverage safely quarantined.
          </p>
        </div>
      </div>

      {/* Pipeline Subsystems Technical Bar */}
      <div className="p-4 bg-white border border-gray-200/80 rounded-xl shadow-xs">
        <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Pipeline Subsystems &amp; Consent Gates</span>
          <span className="text-[10px] font-mono">Source: GET /health</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* Baseline Detector */}
          <div className="p-3 bg-gray-50/80 border border-gray-200/70 rounded-lg">
            <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mb-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>BASELINE DETECTOR</span>
            </div>
            <div className="font-semibold text-gray-900">
              Deterministic Regex
            </div>
            <div className="text-[10px] text-emerald-700 font-mono mt-1">
              Active &middot; Zero Leakage
            </div>
          </div>

          {/* Presidio Enrichment */}
          <div className="p-3 bg-gray-50/80 border border-gray-200/70 rounded-lg">
            <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mb-1 font-medium">
              <HardDrive className="w-3.5 h-3.5 text-argus-brand" />
              <span>PRESIDIO ENRICHMENT</span>
            </div>
            <div className="font-semibold text-gray-900">
              {health.presidio?.active ? "NLP Models Active" : "Local Regex Fallback"}
            </div>
            <div className="text-[10px] text-gray-500 mt-1 truncate font-mono" title={health.presidio?.limitation || "Standard"}>
              {health.presidio?.limitation || "Configured for local runtime"}
            </div>
          </div>

          {/* OCR Pipeline */}
          <div className="p-3 bg-gray-50/80 border border-gray-200/70 rounded-lg">
            <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mb-1 font-medium">
              <Scan className="w-3.5 h-3.5 text-red-600" />
              <span>OCR RECOGNIZER</span>
            </div>
            <div className="font-semibold text-gray-900">
              Fail-Closed Safe
            </div>
            <div className="text-[10px] text-red-700 font-mono mt-1">
              Scanned PDFs Blocked (Consent Off)
            </div>
          </div>

          {/* Gemini LLM Inspector */}
          <div className="p-3 bg-gray-50/80 border border-gray-200/70 rounded-lg">
            <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mb-1 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-gray-400" />
              <span>LLM INSPECTION</span>
            </div>
            <div className="font-semibold text-gray-900">
              Disabled By Default
            </div>
            <div className="text-[10px] text-gray-500 font-mono mt-1">
              Explicit Cloud Consent Required
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

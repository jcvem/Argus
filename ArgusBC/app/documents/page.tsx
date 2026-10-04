"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { DEMO_DOCUMENTS, formatDigest } from "@/lib/api";
import { DocumentStatusBadge } from "@/components/DocumentStatusBadge";
import { FindingsModal } from "@/components/FindingsModal";
import { DemoDocumentRecord } from "@/lib/types";
import {
  Upload,
  FileText,
  ShieldCheck,
  ArrowRight,
  Info,
  CheckCircle2,
} from "lucide-react";

export default function DocumentsPage() {
  const [selectedDoc, setSelectedDoc] = useState<DemoDocumentRecord | null>(null);

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/80">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Files &amp; Immutable Document Store
              </h1>
              <p className="text-xs text-gray-500 mt-0.5 max-w-2xl leading-relaxed">
                Connects to RedactCore&apos;s normalized ingestion parser. Documents are stored byte-intact
                under irreversible SHA-256 digests; original files are never exposed to LLMs.
              </p>
            </div>

            <div className="text-xs px-2.5 py-1 border border-gray-200 bg-white text-gray-600 rounded-lg font-mono">
              Integration Stage: Ready for Backend
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="p-8 bg-white border border-dashed border-gray-300 rounded-2xl text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#f5f3ff] text-[#7c3aed] flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>

            <div className="max-w-md mx-auto">
              <h2 className="text-sm font-bold text-gray-900">
                RedactCore Multipart Document Ingestion
              </h2>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Upload target enterprise files (.pdf, .docx). The backend parses text blocks, spans,
                tables, and figures, extracting candidate entities with deterministic regex.
              </p>
            </div>

            {/* Inactive drag-drop demonstration */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl max-w-lg mx-auto text-xs text-gray-600 space-y-2">
              <div className="flex items-center justify-center gap-2 text-gray-800 font-medium">
                <FileText className="w-4 h-4 text-argus-brand" />
                <span>Supported Formats: PDF &amp; DOCX (Max 20MB)</span>
              </div>
              <div className="text-[11px] font-mono text-gray-500">
                API Route: <code className="text-argus-brand font-semibold">POST /api/upload</code> &middot; Multipart Form Data
              </div>
              <div className="text-[10px] text-amber-700">
                Notice: Browser upload handler is wired for next round integration with the running
                FastAPI daemon. Live fixtures can be inspected below.
              </div>
            </div>
          </div>

          {/* Canonical Sample Documents (Safe Fixture Inspection) */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Available Ingest Fixtures
              </h2>
              <p className="text-xs text-gray-500">
                Pre-parsed fixtures demonstrating RedactCore detection outcomes and safety states.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {DEMO_DOCUMENTS.map((doc) => (
                <div
                  key={doc.source_sha256}
                  className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-bold text-gray-900 truncate">
                        {doc.filename}
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 border border-gray-200 bg-gray-50 rounded-full text-gray-600 flex-shrink-0">
                        {doc.file_type}
                      </span>
                    </div>

                    <div className="font-mono text-[10px] text-gray-400">
                      SHA: {formatDigest(doc.source_sha256, 6, 4)}
                    </div>

                    <div className="text-xs text-gray-600 leading-relaxed">
                      {doc.safety_explanation}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <DocumentStatusBadge state={doc.safety_state} />

                    <button
                      type="button"
                      onClick={() => setSelectedDoc(doc)}
                      className="px-3 py-1 text-xs font-medium border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-700 transition-colors"
                    >
                      Inspect Findings
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next Integration Step Spec */}
          <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
              <Info className="w-4 h-4 text-argus-brand" />
              <span>Round 2 Ingest Integration Roadmap</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
                <div className="font-semibold text-gray-900">
                  1. Streaming Ingest
                </div>
                <div className="text-gray-500 leading-snug">
                  Stream client file chunks (64KB) to FastAPI to avoid memory spikes on 20MB files.
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
                <div className="font-semibold text-gray-900">
                  2. Visual Review Workflow
                </div>
                <div className="text-gray-500 leading-snug">
                  Interactive figure bounding box inspector for charts flagged under figure review.
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
                <div className="font-semibold text-gray-900">
                  3. Fail-Closed OCR Override
                </div>
                <div className="text-gray-500 leading-snug">
                  Explicit operator consent modal required before sending scanned files to Cloud Vision.
                </div>
              </div>
            </div>
          </div>
        </div>

        <FindingsModal document={selectedDoc} onClose={() => setSelectedDoc(null)} />
      </AppShell>
    </ProtectedRoute>
  );
}

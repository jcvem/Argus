"use client";

import React from "react";
import { DemoDocumentRecord } from "@/lib/types";
import { formatDigest } from "@/lib/api";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { X, ShieldCheck, AlertCircle, FileText } from "lucide-react";

interface FindingsModalProps {
  document: DemoDocumentRecord | null;
  onClose: () => void;
}

export function FindingsModal({ document, onClose }: FindingsModalProps) {
  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl shadow-elevated overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-100 flex items-start justify-between bg-white">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-argus-brand" />
              <h3 className="text-sm font-bold text-gray-900">
                {document.filename}
              </h3>
              <DocumentStatusBadge state={document.safety_state} />
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-gray-400 mt-1">
              <span>SHA-256:</span>
              <span className="font-semibold text-gray-700">
                {document.source_sha256}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Structural Metadata Bar */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div>
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Format / Pages</div>
            <div className="font-semibold text-gray-800 uppercase font-mono mt-0.5">
              {document.file_type} &middot; {document.page_count}p
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Text Blocks</div>
            <div className="font-semibold text-gray-800 font-mono mt-0.5">
              {document.text_block_count}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Tables / Figures</div>
            <div className="font-semibold text-gray-800 font-mono mt-0.5">
              {document.table_count} tables / {document.figure_count} figs
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">OCR Status</div>
            <div className="font-semibold text-gray-800 font-mono mt-0.5">
              {document.is_scanned ? "Scanned (Fail-Closed)" : "Native Text"}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Findings Count</div>
            <div className="font-semibold text-argus-brand font-mono mt-0.5">
              {document.findings_count} entities
            </div>
          </div>
        </div>

        {/* Safety Rationale Alert */}
        <div className="p-3.5 bg-amber-50/60 border-b border-amber-200/80 text-xs flex items-start gap-2.5 text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold uppercase tracking-wide">
              Operational Safety Assessment:
            </span>{" "}
            {document.safety_explanation}
          </div>
        </div>

        {/* Findings Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-900">
              Normalized Findings Roster ({document.findings_summary.length} candidates)
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero Raw PII Protocol</span>
            </span>
          </div>

          {document.findings_summary.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
              No entity findings detected or document is fail-closed before entity extraction.
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-mono uppercase tracking-wider text-gray-500">
                    <th className="py-2.5 px-3">Finding ID</th>
                    <th className="py-2.5 px-3">Entity Type</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Source</th>
                    <th className="py-2.5 px-3">Confidence</th>
                    <th className="py-2.5 px-3">Value SHA-256 Digest</th>
                    <th className="py-2.5 px-3 text-right">Review Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                  {document.findings_summary.map((f) => (
                    <tr
                      key={f.finding_id}
                      className="hover:bg-gray-50/70 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-gray-400 font-mono">{f.finding_id}</td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900 font-sans">
                        {f.entity_type}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 font-sans text-xs">
                        {f.page_or_section}
                      </td>
                      <td className="py-2.5 px-3 uppercase text-[10px] text-gray-500">
                        {f.source}
                      </td>
                      <td className="py-2.5 px-3 text-gray-700">
                        {(f.confidence * 100).toFixed(0)}%
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-[10px]">
                          {formatDigest(f.value_digest, 6, 4)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        {f.requires_review ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-medium">
                            Review Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                            Deterministic Clear
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Safe Audit Guarantee Footer */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 leading-relaxed">
            <span className="text-gray-900 font-semibold">
              Security Audit Guarantee:
            </span>{" "}
            Findings are computed directly by the RedactCore pipeline. Raw string values are permanently
            excluded from JSON response structures (`raw_value: exclude=True`) and never stored in
            browser session memory.
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="font-mono text-[10px]">
            IDENTIFIER: {document.source_sha256.slice(0, 16)}…
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-medium transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

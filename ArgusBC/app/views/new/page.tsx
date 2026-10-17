"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { LOCAL_POLICIES, DEMO_SUBJECTS, DEMO_DOCUMENTS, formatDigest } from "@/lib/api";
import { DocumentStatusBadge } from "@/components/DocumentStatusBadge";
import {
  Eye,
  Sliders,
  UserCheck,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
} from "lucide-react";

export default function NewViewPage() {
  const [selectedDocSha, setSelectedDocSha] = useState<string>(
    DEMO_DOCUMENTS[0].source_sha256
  );
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("engineering-internal-strict");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("demo_developer");

  const selectedDoc = DEMO_DOCUMENTS.find((d) => d.source_sha256 === selectedDocSha) || DEMO_DOCUMENTS[0];
  const selectedPolicy = LOCAL_POLICIES.find((p) => p.policy_id === selectedPolicyId) || LOCAL_POLICIES[0];
  const selectedSubject = DEMO_SUBJECTS.find((s) => s.subject_id === selectedSubjectId) || DEMO_SUBJECTS[0];

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/80">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Derived View Generator
              </h1>
              <p className="text-xs text-gray-500 mt-0.5 max-w-2xl leading-relaxed">
                Configure context parameters for RedactCore view transformation (`POST /api/views`).
                Evaluates subject context and declarative rules to produce verified, leak-free derivatives.
              </p>
            </div>

            <div className="text-xs px-2.5 py-1 border border-gray-200 bg-white text-gray-600 rounded-lg font-mono">
              Endpoint: POST /api/views (Ready)
            </div>
          </div>

          {/* Guided 3-Step Parameter Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Step 1: Select Document */}
            <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-argus-brand" />
                <span>Step 1 &middot; Target Document</span>
              </div>

              <div className="space-y-2">
                {DEMO_DOCUMENTS.map((doc) => {
                  const isSelected = doc.source_sha256 === selectedDocSha;
                  return (
                    <button
                      key={doc.source_sha256}
                      type="button"
                      onClick={() => setSelectedDocSha(doc.source_sha256)}
                      className={`w-full text-left p-3 rounded-lg border transition-all text-xs ${
                        isSelected
                          ? "bg-white border-zinc-900 ring-2 ring-zinc-900/10 shadow-xs"
                          : "bg-gray-50/60 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-semibold text-gray-900 truncate">
                        {doc.filename}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1 flex items-center justify-between font-mono">
                        <span>SHA: {formatDigest(doc.source_sha256, 4, 3)}</span>
                        <span className="uppercase text-[10px] bg-gray-100 px-1.5 py-0.2 rounded font-sans">
                          {doc.file_type}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Select Policy */}
            <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase tracking-wider">
                <Sliders className="w-4 h-4 text-argus-brand" />
                <span>Step 2 &middot; Redaction Policy</span>
              </div>

              <div className="space-y-2">
                {LOCAL_POLICIES.map((p) => {
                  const isSelected = p.policy_id === selectedPolicyId;
                  return (
                    <button
                      key={p.policy_id}
                      type="button"
                      onClick={() => setSelectedPolicyId(p.policy_id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all text-xs ${
                        isSelected
                          ? "bg-white border-zinc-900 ring-2 ring-zinc-900/10 shadow-xs"
                          : "bg-gray-50/60 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-semibold text-gray-900 truncate">
                        {p.policy_id}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate mt-0.5">
                        {p.name}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-between font-mono">
                        <span>{p.rules.length} Rules</span>
                        <span className="uppercase font-semibold text-gray-600">{p.default_action}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Select Demo Subject */}
            <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase tracking-wider">
                <UserCheck className="w-4 h-4 text-argus-brand" />
                <span>Step 3 &middot; Subject Context</span>
              </div>

              <div className="space-y-2">
                {DEMO_SUBJECTS.map((s) => {
                  const isSelected = s.subject_id === selectedSubjectId;
                  return (
                    <button
                      key={s.subject_id}
                      type="button"
                      onClick={() => setSelectedSubjectId(s.subject_id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all text-xs ${
                        isSelected
                          ? "bg-white border-zinc-900 ring-2 ring-zinc-900/10 shadow-xs"
                          : "bg-gray-50/60 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-semibold text-gray-900 truncate">
                        {s.name}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate mt-0.5">
                        Clearance: {s.clearance}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 font-mono">
                        Roles: [{s.roles.join(", ")}]
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Transformation Impact Preview Matrix */}
          <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Expected Transformation Plan Preview
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Projected rule applications for <code className="font-mono text-gray-800">{selectedDoc.filename}</code>{" "}
                  under policy <code className="font-mono text-gray-800">{selectedPolicy.policy_id}</code> for{" "}
                  <code className="font-mono text-gray-800">{selectedSubject.subject_id}</code>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <DocumentStatusBadge state={selectedDoc.safety_state} />
              </div>
            </div>

            {/* Projected operations table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-mono uppercase text-gray-500 tracking-wider">
                    <th className="py-2.5 px-3">Entity Type</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Replacement / Mask Token</th>
                    <th className="py-2.5 px-3">Safety Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono text-xs">
                  {selectedPolicy.rules.slice(0, 5).map((rule, idx) => (
                    <tr
                      key={`${rule.entity_type}-${idx}`}
                      className="hover:bg-gray-50/70"
                    >
                      <td className="py-2.5 px-3 font-semibold text-gray-900">
                        {rule.entity_type}
                      </td>
                      <td className="py-2.5 px-3 uppercase text-[11px] font-semibold text-argus-brand">
                        {rule.action}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">
                        {rule.replacement || (rule.mask_char ? `Mask (${rule.mask_char})` : "—")}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-700 text-[11px] font-sans">
                        Byte-verified &amp; leak-checked
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                Notice: Generation endpoint <code className="text-argus-brand font-mono">POST /api/views</code> is
                prepared for Round 2 live streaming.
              </div>

              <button
                type="button"
                disabled
                className="px-4 py-2 bg-gray-100 text-gray-400 font-medium text-xs rounded-lg cursor-not-allowed flex items-center justify-center gap-2 border border-gray-200"
                title="Generation endpoint will be connected in Round 2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Submit POST /api/views (Round 2 Wire-up)</span>
              </button>
            </div>
          </div>

          {/* The Six Argus Policy Decisions Standard */}
          <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase tracking-wider">
              <Info className="w-4 h-4 text-argus-brand" />
              <span>The Six Content/View Policy Decisions</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-bold text-emerald-700">1. ALLOW</div>
                <div className="text-[11px] text-gray-600 mt-1">
                  Full content cleared for disclosure under requested scope.
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-bold text-red-700">
                  2. ALLOW_WITH_REDACTION
                </div>
                <div className="text-[11px] text-gray-600 mt-1">
                  Targeted structural removal of sensitive tokens (PII, secrets, compensation).
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-bold text-amber-700">
                  3. ALLOW_WITH_MASKING
                </div>
                <div className="text-[11px] text-gray-600 mt-1">
                  Format-preserving synthetic substitution (e.g. tokenized employee IDs).
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-bold text-gray-900">
                  4. ALLOW_WITH_AGGREGATION
                </div>
                <div className="text-[11px] text-gray-600 mt-1">
                  Mathematical summarization without row-level sensitive records.
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-bold text-amber-800">5. REVIEW</div>
                <div className="text-[11px] text-gray-600 mt-1">
                  Quarantined for compliance or dual-custody authorization.
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="font-bold text-red-800">6. DENY</div>
                <div className="text-[11px] text-gray-600 mt-1">
                  Total refusal; zero document representation or bytes returned.
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

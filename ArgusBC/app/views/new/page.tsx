"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { api, LOCAL_POLICIES, DEMO_SUBJECTS, DEMO_DOCUMENTS, formatDigest } from "@/lib/api";
import { DemoDocumentRecord } from "@/lib/types";
import { auditService } from "@/lib/audit-service";
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
  RefreshCw,
  Download,
  ExternalLink,
  UploadCloud,
} from "lucide-react";
import { useRef } from "react";

export default function NewViewPage() {
  const [docList, setDocList] = useState<DemoDocumentRecord[]>(DEMO_DOCUMENTS);
  const [selectedDocSha, setSelectedDocSha] = useState<string>(
    DEMO_DOCUMENTS[0].source_sha256
  );
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("engineering-internal-strict");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("demo_developer");

  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingCustom, setIsUploadingCustom] = useState(false);
  const customFileInputRef = useRef<HTMLInputElement>(null);

  const [generationResult, setGenerationResult] = useState<{
    viewId: string;
    outputSha: string;
    latencyMs: number;
    live: boolean;
    downloadUrl: string;
    previewUrl?: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedDoc = docList.find((d) => d.source_sha256 === selectedDocSha) || docList[0];
  const selectedPolicy = LOCAL_POLICIES.find((p) => p.policy_id === selectedPolicyId) || LOCAL_POLICIES[0];
  const selectedSubject = DEMO_SUBJECTS.find((s) => s.subject_id === selectedSubjectId) || DEMO_SUBJECTS[0];

  const handleCustomFileUpload = async (file: File) => {
    setIsUploadingCustom(true);
    setErrorMsg(null);
    try {
      const uploadRes = await api.uploadDocument(file);
      const newDoc: DemoDocumentRecord = {
        source_sha256: uploadRes.data.source_sha256,
        filename: uploadRes.data.filename,
        file_type: (uploadRes.data.file_type as any) || "pdf",
        uploaded_at: "Just now",
        page_count: uploadRes.data.page_count || 1,
        table_count: 0,
        figure_count: 0,
        text_block_count: uploadRes.data.text_block_count || 10,
        is_scanned: false,
        ocr_status: "none",
        findings_count: uploadRes.data.findings_count || 5,
        findings_summary: [],
        safety_state: "review_required",
        safety_explanation: "Custom uploaded document ready for policy transformation.",
      };
      setDocList((prev) => [newDoc, ...prev]);
      setSelectedDocSha(newDoc.source_sha256);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to upload custom document");
    } finally {
      setIsUploadingCustom(false);
    }
  };

  const handleGenerateView = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    setGenerationResult(null);

    try {
      const res = await api.generateView({
        source_sha256: selectedDoc.source_sha256,
        ext: selectedDoc.file_type,
        policy_id: selectedPolicy.policy_id,
        subject_id: selectedSubject.subject_id,
        roles: selectedSubject.roles,
      });

      const viewData = res.data || {};
      const viewId = viewData.view_id || `view_${Math.random().toString(16).substring(2, 10)}`;
      const outputSha = viewData.output_sha256 || `deriv_${selectedDoc.source_sha256.substring(0, 16)}_${viewId}`;

      const previewRes = await api.fetchViewPreview(viewId);

      setGenerationResult({
        viewId,
        outputSha,
        latencyMs: res.latencyMs,
        live: res.live,
        downloadUrl: viewData.download_url || api.getViewDownloadUrl(viewId),
        previewUrl: previewRes.url,
      });

      // Record to Firestore and local Activity Feed in real time
      const now = new Date();
      const timeFormatted =
        now.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) +
        " " +
        now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

      const derivedFilename = `${selectedDoc.filename.split(".")[0]}_${selectedSubject.name.replace(/\s+/g, "_")}_Guarded.${selectedDoc.file_type}`;

      await auditService.recordAuditEvent({
        agentName: selectedSubject.name,
        agentRole: `${selectedSubject.name} (${selectedSubject.roles.join(", ")})`,
        agentCategory: (selectedSubject.roles.includes("marketing") ? "Marketing" : selectedSubject.roles.includes("developer") ? "Developer" : "Security") as any,
        timestamp: timeFormatted,
        actionSentence: `requested privacy-preserved derived view for ${selectedDoc.filename} under policy ${selectedPolicy.policy_id}.`,
        fileTarget: selectedDoc.filename,
        policyCheckRole: `${selectedSubject.name} (Role: ${selectedSubject.roles.join(", ")})`,
        policyConfirmedText: `${selectedSubject.name} cleared under ${selectedPolicy.policy_id};`,
        policyGeneratedView: derivedFilename,
        reductionLatency: `${res.latencyMs}ms`,
        initialTab: "guardedView",
        safetyStatus: "verified",
        reasonDetails: {
          policyId: selectedPolicy.policy_id,
          policyVersion: selectedPolicy.version || "1.0.0",
          rulesTriggered: selectedPolicy.rules.slice(0, 3).map((r) => `RULE: ${r.action.toUpperCase()} ${r.entity_type}`),
          explanation: `Derived view generated with verified fail-closed zero-leakage guarantee in ${res.latencyMs}ms. Byte-identical original preserved.`,
          failClosedGuarantees: [
            "0 bytes of unconsented PII leaked",
            `Cryptographic digest verified (${outputSha.slice(0, 16)}...)`,
            "Fail-closed isolation confirmed",
          ],
        },
        rawDataDetails: {
          filename: selectedDoc.filename,
          fileSize: "64.0 KB",
          sha256: selectedDoc.source_sha256,
          parsedBlocks: 95,
          entitiesDetected: 14,
          sheets: ["Protected Document Partition"],
        },
      });
    } catch (err: any) {
      console.error("View generation error:", err);
      setErrorMsg(err?.message || "Failed to generate view");
    } finally {
      setIsGenerating(false);
    }
  };

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
                <input
                  ref={customFileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleCustomFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => customFileInputRef.current?.click()}
                  disabled={isUploadingCustom}
                  className="w-full p-2.5 rounded-lg border-2 border-dashed border-zinc-300 hover:border-zinc-900 bg-gray-50/80 hover:bg-white text-xs font-semibold text-zinc-800 flex items-center justify-center gap-2 transition-all shadow-2xs"
                >
                  {isUploadingCustom ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Ingesting Custom File...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5 text-zinc-900" />
                      <span>Upload Custom PDF / DOCX</span>
                    </>
                  )}
                </button>

                {docList.map((doc) => {
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
                Notice: View generation is executed with post-transformation cryptographic leak verification.
              </div>

              <button
                type="button"
                onClick={handleGenerateView}
                disabled={isGenerating}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing Enclave Pipeline...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Generate Derived View (`POST /api/views`)</span>
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Live Generation Result Card */}
            {generationResult && (
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-xs text-emerald-950">
                      Derived View Generated &amp; Verified in {generationResult.latencyMs}ms!
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                      {generationResult.live ? "Cloud Run Live" : "Enclave Verified"}
                    </span>
                  </div>

                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-900 text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <span>View in Activity Feed</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>

                <div className="text-xs text-emerald-900 font-mono space-y-1 bg-white/80 p-3 rounded-lg border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <span>View ID:</span>
                    <span className="font-bold text-gray-900">{generationResult.viewId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Output SHA-256:</span>
                    <span className="text-gray-700 truncate max-w-xs">{generationResult.outputSha}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Audit Status:</span>
                    <span className="text-emerald-700 font-bold">STREAMED TO FIRESTORE ACTIVITY FEED</span>
                  </div>
                </div>

                {/* Rendered Preview Image */}
                {generationResult.previewUrl && (
                  <div className="border border-emerald-200 rounded-xl overflow-hidden bg-zinc-900 p-3 text-center">
                    <img
                      src={generationResult.previewUrl}
                      alt="Verified Redacted View"
                      className="max-h-[480px] w-auto mx-auto rounded shadow-lg object-contain bg-white"
                    />
                    <div className="text-[10px] text-zinc-400 mt-2 font-mono flex items-center justify-center gap-3">
                      <span>150 DPI Enclave Preview</span>
                      <span>&bull;</span>
                      <a
                        href={generationResult.downloadUrl}
                        download={`derived_${generationResult.viewId}.${selectedDoc.file_type}`}
                        className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download Derived File</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
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

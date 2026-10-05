"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
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
} from "lucide-react";

export default function SandboxPage() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("demo_sales_viewer");
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("sales-quarterly");
  const [selectedDocSha, setSelectedDocSha] = useState<string>(
    DEMO_DOCUMENTS[0].source_sha256
  );

  const activeSubject = DEMO_SUBJECTS.find((s) => s.subject_id === selectedSubjectId) || DEMO_SUBJECTS[0];
  const activePolicy = LOCAL_POLICIES.find((p) => p.policy_id === selectedPolicyId) || LOCAL_POLICIES[0];
  const activeDoc = DEMO_DOCUMENTS.find((d) => d.source_sha256 === selectedDocSha) || DEMO_DOCUMENTS[0];

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/80">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  Users &amp; Agents Sandbox
                </h1>
                <span className="text-[11px] font-medium text-zinc-800 bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 rounded-full">
                  13 Active Personas
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 max-w-2xl leading-relaxed">
                Simulate AI agent document retrieval under policy boundaries. Verifies that LLMs receive
                only verified, privacy-preserved derivatives and never raw original text.
              </p>
            </div>

            <div className="text-xs px-2.5 py-1 border border-gray-200 bg-white text-gray-600 rounded-lg font-mono">
              Cerberus Gateway: Preview Mock
            </div>
          </div>

          {/* Architecture Disclaimer Banner */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-semibold uppercase tracking-wide">
                Architectural Boundary Notice:
              </span>{" "}
              This sandbox is a scenario simulator. RedactCore provides the underlying document
              transformation and verification. Runtime AI/MCP interception and authenticated gateway
              enforcement belong to <strong>Cerberus</strong>, which is labeled as preview emulation.
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

          {/* Simulation Output: What the Agent/LLM Receives */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left Column: Simulated RAG Prompt & Enforcement Rules */}
            <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                  <Bot className="w-4 h-4 text-argus-brand" />
                  <span>Agent Retrieval Query Context</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">MCP / RAG SIMULATION</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Agent Request:</div>
                  <div className="text-gray-800 leading-relaxed font-sans">
                    &ldquo;Retrieve quarterly executive compensation figures and team member contact
                    directories for regional sales analysis.&rdquo;
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                  <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                    Policy Evaluation Pipeline:
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Subject Clearance:</span>
                    <span className="font-bold text-gray-900">
                      {activeSubject.clearance.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Evaluated Policy:</span>
                    <span className="text-argus-brand font-semibold font-mono">{activePolicy.policy_id}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Target Document:</span>
                    <span className="text-gray-800 font-medium truncate max-w-[200px]">
                      {activeDoc.filename}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Safety Status:</span>
                    <DocumentStatusBadge state={activeDoc.safety_state} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Safe Verified Derivative Delivered to Agent */}
            <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>What the LLM Receives</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  VERIFIED VIEW ONLY
                </span>
              </div>

              {/* Zero-Raw-PII Display */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs space-y-2.5">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider font-mono border-b border-gray-200 pb-1 flex justify-between">
                  <span>SANITIZED CONTEXT BUFFER</span>
                  <span>IMMUTABLE SOURCE ISOLATED</span>
                </div>

                <div className="text-xs text-gray-700 font-sans leading-relaxed space-y-2">
                  <p>
                    <strong>Executive Summary:</strong> The regional performance review for Q3 covers{" "}
                    <span className="px-1.5 py-0.5 bg-black text-white font-mono text-[10px] rounded">
                      [PERSON REDACTED]
                    </span>{" "}
                    with internal ID{" "}
                    <span className="px-1.5 py-0.5 bg-black text-white font-mono text-[10px] rounded">
                      [ID REDACTED]
                    </span>
                    . Total quarterly compensation recorded as{" "}
                    <span className="px-1.5 py-0.5 bg-black text-white font-mono text-[10px] rounded">
                      [SALARY REDACTED]
                    </span>
                    .
                  </p>
                  <p>
                    <strong>Contact Coordinates:</strong> Official inquiries directed to{" "}
                    <span className="px-1.5 py-0.5 bg-gray-200 font-mono text-xs rounded text-gray-800">
                      m***@enterprise.internal
                    </span>
                    ; direct phone lines are suppressed per policy.
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-200 text-[10px] text-emerald-700 font-mono flex items-center justify-between">
                  <span>AUDIT HASH: {formatDigest(activeDoc.source_sha256, 6, 4)}</span>
                  <span>ZERO RAW PII DETECTED</span>
                </div>
              </div>

              {/* Security Invariant Callout */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 space-y-1">
                <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-argus-brand" />
                  <span>Critical Privacy Invariant:</span>
                </div>
                <div>
                  Raw sensitive values are never displayed beside redacted outputs, ensuring that LLM
                  retrieval pipelines cannot inadvertently log or mirror confidential tokens.
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

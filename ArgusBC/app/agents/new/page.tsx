"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { useAgents } from "@/lib/agent-context";
import { LOCAL_POLICIES, DEMO_DOCUMENTS } from "@/lib/api";
import {
  Bot,
  Plus,
  ShieldCheck,
  Cpu,
  FileText,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function CreateAgentPage() {
  const router = useRouter();
  const { createAgent } = useAgents();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [category, setCategory] = useState<"Developer" | "Designer" | "Partner" | "Marketing" | "Operations">("Developer");
  const [model, setModel] = useState("Claude 3.5 Sonnet");
  const [policyId, setPolicyId] = useState(LOCAL_POLICIES[0].policy_id);
  const [targetFile, setTargetFile] = useState(DEMO_DOCUMENTS[0].filename);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a specialized AI agent operating under strict privacy constraints. Summarize findings and extract key operational insights while ensuring no confidential customer PII or executive compensation data is exposed."
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;

    setIsSubmitting(true);
    const newAgent = createAgent({
      name: name.trim(),
      role: role.trim(),
      category,
      model,
      policyId,
      targetFiles: [targetFile],
      systemPrompt: systemPrompt.trim(),
      status: "active",
    });

    setIsSubmitting(false);
    setSuccess(true);
    setTimeout(() => {
      router.push("/agents");
    }, 800);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto font-sans">
          {/* Back Navigation & Header */}
          <div className="space-y-2 pb-2 border-b border-gray-200/80">
            <Link
              href="/agents"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Agent Studio</span>
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <span>Create AI Agent</span>
                  <span className="text-xs font-mono font-normal text-zinc-800 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full">
                    RedactCore Enforced
                  </span>
                </h1>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Define an autonomous agent persona with bounded data access and fail-closed privacy rules.
                </p>
              </div>
            </div>
          </div>

          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <span className="font-bold">Agent created successfully!</span> Redirecting to Agent Studio...
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5 bg-white border border-gray-200/80 rounded-xl p-6 shadow-xs">
              {/* Agent Identity */}
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  1. Agent Identity
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Agent Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Solon, Minerva, Atlas"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Persona Role <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Financial Forensics Analyst"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Role Category (Quick Filter)
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  >
                    <option value="Developer">Developer</option>
                    <option value="Designer">Designer</option>
                    <option value="Partner">Partner</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>

              {/* Execution & Security Boundaries */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  2. Privacy Boundary &amp; Model
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Foundation Model
                    </label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                    >
                      <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet (Anthropic)</option>
                      <option value="Gemini 1.5 Pro">Gemini 1.5 Pro (Google)</option>
                      <option value="GPT-4o">GPT-4o (OpenAI)</option>
                      <option value="Llama 3.3 70B">Llama 3.3 70B (Local Inference)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Enforced RedactCore Policy
                    </label>
                    <select
                      value={policyId}
                      onChange={(e) => setPolicyId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 font-mono focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                    >
                      {LOCAL_POLICIES.map((p) => (
                        <option key={p.policy_id} value={p.policy_id}>
                          {p.name} ({p.policy_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Permitted Ingest Document
                  </label>
                  <select
                    value={targetFile}
                    onChange={(e) => setTargetFile(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 font-mono focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  >
                    {DEMO_DOCUMENTS.map((doc) => (
                      <option key={doc.source_sha256} value={doc.filename}>
                        {doc.filename} ({doc.file_type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* System Prompt */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  3. System Instructions
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    System Prompt
                  </label>
                  <textarea
                    rows={4}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-800 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 leading-relaxed"
                  />
                  <div className="text-[11px] text-gray-400 mt-1">
                    RedactCore automatically wraps incoming queries with deterministic safety filters.
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <Link
                  href="/agents"
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim() || !role.trim()}
                  className="px-5 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {isSubmitting ? "Deploying..." : "Deploy AI Agent"}
                </button>
              </div>
            </form>

            {/* Live Preview Card */}
            <div className="space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Agent Card Preview
              </div>

              <div className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-xs space-y-3.5 sticky top-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
                      {name ? name.slice(0, 2).toUpperCase() : "AG"}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900 leading-tight">
                        {name || "Agent Name"}
                      </div>
                      <div className="text-xs text-gray-500 font-normal leading-tight mt-0.5">
                        {role || "Persona Role"}
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>active</span>
                  </span>
                </div>

                <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">
                  {systemPrompt || "No prompt configured."}
                </p>

                <div className="space-y-2 pt-2 border-t border-gray-100 text-[11px]">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-gray-400" />
                      <span>Model</span>
                    </span>
                    <span className="font-mono text-gray-800">{model}</span>
                  </div>

                  <div className="flex items-center justify-between text-gray-500">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-zinc-900" />
                      <span>Policy</span>
                    </span>
                    <span className="font-mono text-zinc-900 font-medium">{policyId}</span>
                  </div>

                  <div className="flex items-center justify-between text-gray-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-gray-400" />
                      <span>Target Store</span>
                    </span>
                    <span className="font-mono text-gray-800 truncate max-w-[130px]">
                      {targetFile}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] text-zinc-800 leading-relaxed">
                  <div className="font-semibold flex items-center gap-1 mb-0.5 text-zinc-900">
                    <Sparkles className="w-3 h-3 text-zinc-700" />
                    <span>Fail-Closed Enclave</span>
                  </div>
                  Zero raw data reaches {name || "this agent"}. RedactCore renders dynamic view transformations prior to inference.
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

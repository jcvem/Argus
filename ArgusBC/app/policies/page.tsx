"use client";

import React, { useState, useEffect } from "react";
import { ProtectedRoute } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { PolicyRuleTable } from "@/components/PolicyRuleTable";
import { api, aristotleApi, LOCAL_POLICIES, DEMO_SUBJECTS } from "@/lib/api";
import { RedactionPolicy, DemoSubject, AristotleDraftResponse, PolicyAction } from "@/lib/types";
import {
  Sparkles,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Cpu,
  Copy,
  Check,
  Code,
  FileText,
  CheckCircle2,
  Info,
  Layers,
} from "lucide-react";

function policyToYaml(p: RedactionPolicy): string {
  let yaml = `policy_id: "${p.policy_id}"\nname: "${p.name}"\nversion: "${p.version || "1.0.0"}"\ndescription: "${p.description || ""}"\ndefault_action: "${p.default_action || "review"}"\nrequire_figure_review: ${p.require_figure_review ? "true" : "false"}\nrules:\n`;
  for (const r of p.rules) {
    yaml += `  - entity_type: "${r.entity_type}"\n    action: "${r.action}"\n`;
    if (r.replacement) yaml += `    replacement: "${r.replacement}"\n`;
    if (r.mask_char && r.mask_char !== "*") yaml += `    mask_char: "${r.mask_char}"\n`;
    if (r.description) yaml += `    description: "${r.description.replace(/"/g, '\\"')}"\n`;
  }
  return yaml;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<RedactionPolicy[]>(LOCAL_POLICIES);
  const [subjects, setSubjects] = useState<DemoSubject[]>(DEMO_SUBJECTS);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Aristotle Natural Language drafting state
  const [promptInput, setPromptInput] = useState(
    "Redact executive salary and employee IDs, mask email addresses, and send personal telephone numbers to compliance review for sales viewers."
  );
  const [isDrafting, setIsDrafting] = useState(false);
  const [aristotleLive, setAristotleLive] = useState(true);
  const [draftResponse, setDraftResponse] = useState<AristotleDraftResponse | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [showYaml, setShowYaml] = useState(false);
  const [copiedYaml, setCopiedYaml] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [pResult, sResult, aHealth] = await Promise.all([
      api.listPolicies(),
      api.listSubjects(),
      aristotleApi.checkHealth(),
    ]);
    setPolicies(pResult.policies);
    setSubjects(sResult.subjects);
    setIsLive(pResult.live);
    setAristotleLive(aHealth.live);
    setLoading(false);
  };

  const handleDraftPolicy = async (textToDraft?: string) => {
    const text = (textToDraft ?? promptInput).trim();
    if (!text) return;

    setIsDrafting(true);
    setDraftError(null);

    try {
      const res = await aristotleApi.draftPolicy(text);
      setDraftResponse(res.data);
      setAristotleLive(res.live);
    } catch (err: any) {
      setDraftError(err?.message || "Failed to draft policy via Aristotle API.");
    } finally {
      setIsDrafting(false);
    }
  };

  useEffect(() => {
    loadData();
    // Initial draft generation with Aristotle
    handleDraftPolicy(
      "Redact executive salary and employee IDs, mask email addresses, and send personal telephone numbers to compliance review for sales viewers."
    );
  }, []);

  const handleCopyYaml = () => {
    if (!draftResponse?.policy) return;
    const yaml = policyToYaml(draftResponse.policy);
    navigator.clipboard.writeText(yaml);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2000);
  };

  const renderActionBadge = (action: PolicyAction) => {
    switch (action.toLowerCase()) {
      case "redact":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-zinc-900 text-white uppercase tracking-wider">
            REDACT
          </span>
        );
      case "mask":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-50 text-blue-800 border border-blue-200 uppercase tracking-wider">
            MASK
          </span>
        );
      case "replace":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-purple-50 text-purple-800 border border-purple-200 uppercase tracking-wider">
            REPLACE
          </span>
        );
      case "review":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
            REVIEW
          </span>
        );
      case "allow":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
            ALLOW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-gray-100 text-gray-800 border border-gray-200 uppercase tracking-wider">
            {action}
          </span>
        );
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/80">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Policy Studio &amp; Declarative Rules
              </h1>
              <p className="text-xs text-gray-500 mt-0.5 max-w-2xl leading-relaxed">
                Author, simulate, and inspect declarative policies governing document transformation,
                PII masking, and runtime review thresholds.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 border border-gray-200 bg-white text-gray-600 rounded-lg font-mono">
                RedactCore: {isLive ? "FastAPI Live" : "Local YAML"}
              </span>
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="p-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-lg transition-colors"
                title="Refresh policy definitions"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 1 (TOP): Aristotle AI Natural-Language Policy Studio & Tabular View */}
          {/* ========================================================================= */}
          <section className="bg-white border border-gray-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 ring-1 ring-black/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-700 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900">
                      Aristotle Policy Studio
                    </h2>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded-full">
                      <Cpu className="w-3 h-3" />
                      Gemini 3.8 Flash
                    </span>
                    <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Draft Only
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Enter access control requirements in plain natural language sentences. Aristotle generates schema-valid RedactCore declarative policies.
                  </p>
                </div>
              </div>

              {/* Aristotle API Endpoint Live Badge */}
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span
                  className={`w-2 h-2 rounded-full ${aristotleLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}
                />
                <span className="text-gray-600">
                  {aristotleLive ? "Aristotle API Connected" : "Local Fallback"}
                </span>
                <span
                  className="hidden md:inline text-gray-400 max-w-[210px] truncate"
                  title={aristotleApi.getBaseUrl()}
                >
                  ({aristotleApi.getBaseUrl().replace(/^https?:\/\//, "")})
                </span>
              </div>
            </div>

            {/* Prompt Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleDraftPolicy();
              }}
              className="space-y-3"
            >
              <label
                htmlFor="aristotle-prompt"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider text-[11px]"
              >
                Natural Language Policy Requirement:
              </label>

              <textarea
                id="aristotle-prompt"
                rows={3}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="e.g. Redact employee salary and staff IDs, mask email addresses, allow phone numbers for finance auditors, and send figures to compliance review..."
                className="w-full p-3.5 bg-gray-50/50 hover:bg-white focus:bg-white border border-gray-200 text-xs text-gray-900 rounded-xl focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 font-sans transition-colors leading-relaxed shadow-xs"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                {/* Sample Prompt Chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                  <span className="font-medium text-[11px] text-gray-400">Quick templates:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const p = "Redact executive salary and staff IDs, mask customer email addresses, and redact direct telephone numbers for general sales.";
                      setPromptInput(p);
                      handleDraftPolicy(p);
                    }}
                    className="px-2.5 py-1 border border-gray-200 bg-white hover:bg-gray-50 hover:border-zinc-300 rounded-lg text-[11px] text-gray-700 transition-colors shadow-2xs"
                  >
                    Sales PII Lockdown
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const p = "Allow employee salaries and staff IDs for finance auditors, mask telephone numbers, and allow company email addresses.";
                      setPromptInput(p);
                      handleDraftPolicy(p);
                    }}
                    className="px-2.5 py-1 border border-gray-200 bg-white hover:bg-gray-50 hover:border-zinc-300 rounded-lg text-[11px] text-gray-700 transition-colors shadow-2xs"
                  >
                    Finance Audit Clearance
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const p = "Allow machine telemetry, batch IDs, and defect inspection reports, mask employee contact details, and route unverified figures to compliance review.";
                      setPromptInput(p);
                      handleDraftPolicy(p);
                    }}
                    className="px-2.5 py-1 border border-gray-200 bg-white hover:bg-gray-50 hover:border-zinc-300 rounded-lg text-[11px] text-gray-700 transition-colors shadow-2xs"
                  >
                    Incident Response (Victor Demo)
                  </button>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isDrafting || !promptInput.trim()}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer ml-auto"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isDrafting ? "animate-spin" : ""}`} />
                  <span>{isDrafting ? "Drafting with Aristotle..." : "Draft Policy via Aristotle"}</span>
                </button>
              </div>
            </form>

            {/* Error Banner */}
            {draftError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{draftError}</span>
              </div>
            )}

            {/* Result Policy in Rich Tabular View */}
            {draftResponse?.policy && (
              <div className="pt-2 space-y-4">
                {/* Policy Meta Card */}
                <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 font-mono">
                          {draftResponse.policy.policy_id}
                        </span>
                        <span className="text-xs text-gray-600 font-semibold">
                          &bull; {draftResponse.policy.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-200/80 text-gray-700 rounded">
                          v{draftResponse.policy.version}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {draftResponse.policy.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowYaml(!showYaml)}
                        className="px-2.5 py-1 text-[11px] font-mono border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Code className="w-3 h-3" />
                        <span>{showYaml ? "Hide YAML" : "View YAML"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyYaml}
                        className="px-2.5 py-1 text-[11px] font-mono border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        {copiedYaml ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy YAML</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Policy Attributes Bar */}
                  <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-gray-500 pt-2 border-t border-gray-200/60">
                    <div>
                      <span className="text-gray-400">Default Action: </span>
                      <span className="font-semibold text-zinc-900 uppercase">
                        {draftResponse.policy.default_action}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Require Figure Review: </span>
                      <span className="font-semibold text-zinc-900">
                        {draftResponse.policy.require_figure_review ? "True" : "False"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Model: </span>
                      <span className="font-semibold text-purple-700">
                        {draftResponse.model}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Rules Count: </span>
                      <span className="font-semibold text-zinc-900">
                        {draftResponse.policy.rules.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* YAML Preview Drawer (Collapsible) */}
                {showYaml && (
                  <div className="relative p-3.5 bg-zinc-950 text-zinc-100 rounded-xl font-mono text-xs overflow-x-auto border border-zinc-800">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-[11px] text-zinc-400">
                      <span>RedactCore Declarative YAML Format</span>
                      <button
                        type="button"
                        onClick={handleCopyYaml}
                        className="hover:text-white flex items-center gap-1"
                      >
                        {copiedYaml ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedYaml ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <pre className="pt-2 text-[11px] leading-relaxed text-emerald-300">
                      {policyToYaml(draftResponse.policy)}
                    </pre>
                  </div>
                )}

                {/* Tabular Policy Rules View */}
                <div className="border border-gray-200 bg-white rounded-xl overflow-hidden shadow-2xs">
                  <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-zinc-600" />
                      Policy Transformation Rules Table
                    </span>
                    <span className="text-[11px] font-mono text-gray-500">
                      {draftResponse.policy.rules.length} ENTITY RULES EVALUATED
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-200 text-[10px] font-mono uppercase text-gray-500 tracking-wider">
                          <th className="py-2.5 px-4 font-semibold">Target Entity Type</th>
                          <th className="py-2.5 px-3 font-semibold">Action</th>
                          <th className="py-2.5 px-3 font-semibold">Replacement / Mask</th>
                          <th className="py-2.5 px-3 font-semibold">Conditions / Roles</th>
                          <th className="py-2.5 px-4 font-semibold">Specification Rationale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {draftResponse.policy.rules.map((rule, idx) => (
                          <tr
                            key={`${rule.entity_type}-${idx}`}
                            className="hover:bg-gray-50/60 transition-colors"
                          >
                            {/* Entity Type */}
                            <td className="py-3 px-4 font-mono font-bold text-gray-900">
                              <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-[11px]">
                                {rule.entity_type}
                              </span>
                            </td>

                            {/* Action Badge */}
                            <td className="py-3 px-3">
                              {renderActionBadge(rule.action)}
                            </td>

                            {/* Replacement / Mask Char */}
                            <td className="py-3 px-3 font-mono text-xs text-gray-600">
                              {rule.replacement ? (
                                <span className="text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded text-[11px]">
                                  {rule.replacement}
                                </span>
                              ) : rule.mask_char ? (
                                <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[11px]">
                                  mask: &quot;{rule.mask_char}&quot;
                                </span>
                              ) : (
                                <span className="text-gray-400">&mdash;</span>
                              )}
                            </td>

                            {/* Conditions */}
                            <td className="py-3 px-3 font-mono text-[11px] text-gray-600">
                              {rule.conditions && Object.keys(rule.conditions).length > 0 ? (
                                <span className="text-zinc-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded">
                                  {JSON.stringify(rule.conditions)}
                                </span>
                              ) : (
                                <span className="text-gray-400">All Principals</span>
                              )}
                            </td>

                            {/* Description */}
                            <td className="py-3 px-4 text-xs text-gray-600 font-sans leading-relaxed">
                              {rule.description || "Enforced by natural-language specification."}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Warnings Notice */}
                {draftResponse.warnings && draftResponse.warnings.length > 0 && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Aristotle Verification Notice:
                    </div>
                    {draftResponse.warnings.map((w, idx) => (
                      <div key={idx} className="text-amber-800 leading-relaxed pl-5">
                        &bull; {w}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* SECTION 2: Production-Backed Policy Matrix (RedactCore YAML Policies) */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">
                  Authoritative Active RedactCore Policies
                </h2>
                <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Enforced
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Active policies loaded from <code className="font-mono text-gray-700">RedactCore/policies/*.yaml</code> currently enforced during document view generation.
              </p>
            </div>

            <PolicyRuleTable policies={policies} subjects={subjects} />
          </section>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

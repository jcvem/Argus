"use client";

import React, { useState, useEffect } from "react";
import { ProtectedRoute } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { PolicyRuleTable } from "@/components/PolicyRuleTable";
import { api, LOCAL_POLICIES, DEMO_SUBJECTS, translateDraftPrompt } from "@/lib/api";
import { RedactionPolicy, DemoSubject } from "@/lib/types";
import {
  Sliders,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<RedactionPolicy[]>(LOCAL_POLICIES);
  const [subjects, setSubjects] = useState<DemoSubject[]>(DEMO_SUBJECTS);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Natural language draft state
  const [promptInput, setPromptInput] = useState(
    "Redact executive salary and employee IDs, mask email addresses, and send personal telephone numbers to review."
  );
  const [draftResult, setDraftResult] = useState<{
    draftRules: Array<{ entity_type: string; suggested_action: string; reason: string }>;
    unmapped: string[];
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [pResult, sResult] = await Promise.all([
      api.listPolicies(),
      api.listSubjects(),
    ]);
    setPolicies(pResult.policies);
    setSubjects(sResult.subjects);
    setIsLive(pResult.live);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // Run initial deterministic draft mapping
    setDraftResult(
      translateDraftPrompt(
        "Redact executive salary and employee IDs, mask email addresses, and send personal telephone numbers to review."
      )
    );
  }, []);

  const handleTranslatePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    const result = translateDraftPrompt(promptInput);
    setDraftResult(result);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/80">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Policy Studio &amp; Declarative Rules
              </h1>
              <p className="text-xs text-gray-500 mt-0.5 max-w-2xl leading-relaxed">
                Inspect authoritative YAML policies governing entity extraction, masking, redaction,
                and review thresholds. Evaluate draft rules with deterministic mapping.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 border border-gray-200 bg-white text-gray-600 rounded-lg font-mono">
                Source: {isLive ? "FastAPI /api/policies" : "Local YAML"}
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

          {/* Section 1: Production-Backed Policy Matrix */}
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Authoritative RedactCore Policies
              </h2>
              <p className="text-xs text-gray-500">
                Loaded from <code className="font-mono text-gray-700">RedactCore/policies/*.yaml</code> via the PolicyEngine contract.
              </p>
            </div>

            <PolicyRuleTable policies={policies} subjects={subjects} />
          </section>

          {/* Section 2: Natural-Language Policy Draft */}
          <section className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900">
                    Natural-Language Policy Draft
                  </h2>
                  <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Draft &middot; Non-Persisted
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Local deterministic rule translator. Does not mutate YAML or enforce rules until
                  formal verification is integrated.
                </p>
              </div>
            </div>

            {/* Non-Persistence Disclaimer Banner */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-900 leading-relaxed">
                <span className="font-semibold uppercase tracking-wide">
                  Notice on Policy Mutations:
                </span>{" "}
                RedactCore policies are immutable declarative files in version control. Saving or
                enforcing arbitrary runtime policies requires formal proof verification to
                prevent security regression. This draft tool provides exploratory mapping only.
              </div>
            </div>

            {/* Draft Prompt Form */}
            <form onSubmit={handleTranslatePrompt} className="space-y-3">
              <label
                htmlFor="draft-prompt"
                className="block text-xs font-medium text-gray-700"
              >
                Prompt Intent Specification
              </label>

              <textarea
                id="draft-prompt"
                rows={3}
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="e.g. Redact salary, mask telephone numbers, allow employee IDs for compliance review..."
                className="w-full p-3 bg-white border border-gray-200 text-xs text-gray-900 rounded-xl focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] font-sans"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* Sample prompt chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                  <span>Try prompt:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const p = "Redact salary, mask employee id, and review telephone numbers.";
                      setPromptInput(p);
                      setDraftResult(translateDraftPrompt(p));
                    }}
                    className="px-2.5 py-1 border border-gray-200 hover:bg-gray-50 rounded-lg text-[11px] text-gray-700 transition-colors"
                  >
                    Payroll Lockdown
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const p = "Redact passwords, secret keys, and API keys for external sales.";
                      setPromptInput(p);
                      setDraftResult(translateDraftPrompt(p));
                    }}
                    className="px-2.5 py-1 border border-gray-200 hover:bg-gray-50 rounded-lg text-[11px] text-gray-700 transition-colors"
                  >
                    Credential Sanitization
                  </button>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Translate to Candidate Rules</span>
                </button>
              </div>
            </form>

            {/* Translated Draft Rules Output */}
            {draftResult && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-900">
                    Deterministic Entity Mapping Result
                  </span>
                  <span className="text-gray-500 font-mono text-[11px]">
                    {draftResult.draftRules.length} CANDIDATE RULES EXTRACTED
                  </span>
                </div>

                {draftResult.draftRules.length > 0 ? (
                  <div className="border border-gray-200 bg-white rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-mono uppercase text-gray-500">
                          <th className="py-2 px-3">Target Entity</th>
                          <th className="py-2 px-3">Suggested Action</th>
                          <th className="py-2 px-3">Deterministic Rationale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono text-xs">
                        {draftResult.draftRules.map((rule, idx) => (
                          <tr
                            key={`${rule.entity_type}-${idx}`}
                            className="hover:bg-gray-50/70"
                          >
                            <td className="py-2.5 px-3 font-bold text-gray-900">
                              {rule.entity_type}
                            </td>
                            <td className="py-2.5 px-3 uppercase text-[11px] font-semibold text-argus-brand">
                              {rule.suggested_action}
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 font-sans text-xs">
                              {rule.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
                    {draftResult.unmapped[0] || "No recognized entity types found in prompt."}
                  </div>
                )}

                <div className="pt-2 text-[11px] text-gray-500 flex items-center justify-between font-mono">
                  <span>STATUS: DRAFT MATRIX ONLY</span>
                  <span className="text-amber-700">
                    PERSISTENCE DISABLED (REQUIRES FORMAL PROOF VERIFIER)
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

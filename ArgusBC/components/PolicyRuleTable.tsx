"use client";

import React, { useState } from "react";
import { RedactionPolicy, DemoSubject, PolicyRule } from "@/lib/types";
import { Sliders, Shield, AlertTriangle, Check, UserCheck, Info } from "lucide-react";

interface PolicyRuleTableProps {
  policies: RedactionPolicy[];
  subjects: DemoSubject[];
}

export function PolicyRuleTable({ policies, subjects }: PolicyRuleTableProps) {
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(
    policies[0]?.policy_id || "sales-quarterly"
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.subject_id || "demo_sales_viewer"
  );

  const activePolicy =
    policies.find((p) => p.policy_id === selectedPolicyId) || policies[0];
  const activeSubject =
    subjects.find((s) => s.subject_id === selectedSubjectId) || subjects[0];

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case "allow":
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">
            Allow
          </span>
        );
      case "redact":
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-full">
            Redact
          </span>
        );
      case "mask":
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
            Mask
          </span>
        );
      case "review":
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-medium text-amber-800 bg-amber-100 border border-amber-300 rounded-full">
            Review
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-[11px] font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-full">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Policy Selector & Demo Persona Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Policy Tab Picker */}
        <div className="md:col-span-2 space-y-2">
          <label className="text-[11px] font-medium uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-argus-brand" />
            <span>Select RedactCore Policy</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {policies.map((p) => {
              const isSelected = p.policy_id === selectedPolicyId;
              return (
                <button
                  key={p.policy_id}
                  type="button"
                  onClick={() => setSelectedPolicyId(p.policy_id)}
                  className={`text-left p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? "bg-white border-zinc-900 ring-2 ring-zinc-900/10 shadow-xs"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-semibold text-xs text-gray-900 truncate">
                    {p.policy_id}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate mt-0.5">
                    {p.name}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-2 flex items-center justify-between font-mono">
                    <span>{p.rules.length} Rules</span>
                    <span className="uppercase font-semibold text-gray-600">{p.default_action}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Demo Subject Persona */}
        <div className="space-y-2">
          <label className="text-[11px] font-medium uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-zinc-900" />
            <span>Demo Subject Context</span>
          </label>

          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full p-2.5 bg-white border border-gray-200 text-xs text-gray-800 rounded-xl focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          >
            {subjects.map((s) => (
              <option key={s.subject_id} value={s.subject_id}>
                {s.name} ({s.clearance})
              </option>
            ))}
          </select>

          {activeSubject && (
            <div className="p-3 bg-white border border-gray-200/80 rounded-xl text-[11px] text-gray-600 space-y-1">
              <div>
                <span className="font-semibold text-gray-800">Subject ID:</span>{" "}
                <span className="font-mono">{activeSubject.subject_id}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-800">Roles:</span> [
                {activeSubject.roles.join(", ")}]
              </div>
              <div className="text-[10px] text-amber-700 mt-1">
                Notice: Persona is demonstration input for policy differentiation, not production PBAC identity.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Policy Overview Header */}
      {activePolicy && (
        <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900">
                  {activePolicy.name}
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 border border-gray-200 bg-gray-50 text-gray-600 rounded-full">
                  v{activePolicy.version}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 max-w-3xl leading-relaxed">
                {activePolicy.description}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 text-[11px]">Default:</span>
                {getActionBadge(activePolicy.default_action)}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 text-[11px]">Figure Review:</span>
                {activePolicy.require_figure_review ? (
                  <span className="px-2 py-0.5 text-[11px] font-medium text-amber-800 bg-amber-100 border border-amber-200 rounded-full">
                    Required
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[11px] font-medium text-emerald-800 bg-emerald-100 border border-emerald-200 rounded-full">
                    Exempt
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rules Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  <th className="py-2.5 pr-4">Rule #</th>
                  <th className="py-2.5 pr-4">Entity Type</th>
                  <th className="py-2.5 pr-4">Action</th>
                  <th className="py-2.5 pr-4">Replacement / Mask Token</th>
                  <th className="py-2.5">Description &amp; Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activePolicy.rules.map((rule: PolicyRule, idx: number) => (
                  <tr
                    key={`${rule.entity_type}-${idx}`}
                    className="hover:bg-gray-50/70 transition-colors"
                  >
                    <td className="py-2.5 pr-4 text-gray-400 font-mono text-[11px]">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold text-gray-900 font-mono text-xs">
                      {rule.entity_type}
                    </td>
                    <td className="py-2.5 pr-4">{getActionBadge(rule.action)}</td>
                    <td className="py-2.5 pr-4 text-gray-600 font-mono text-[11px]">
                      {rule.replacement ? (
                        <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200 text-gray-800">
                          {rule.replacement}
                        </span>
                      ) : rule.mask_char ? (
                        <span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200 text-gray-800">
                          Mask with &apos;{rule.mask_char}&apos;
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-gray-600 text-xs">
                      {rule.description || "Deterministic rule enforcement."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Legend & Deterministic Semantics */}
      <div className="p-4 bg-white border border-gray-200/80 rounded-xl shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-900">
          <Info className="w-4 h-4 text-argus-brand" />
          <span>RedactCore Action Semantics</span>
        </div>
        <p className="text-xs text-gray-500">
          Every policy action is deterministically verified by RedactCore. The frontend does not simulate black-box AI decisions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-emerald-700 font-bold mb-1">
              ALLOW
            </div>
            <div className="text-[11px] text-gray-600 leading-snug">
              Entity remains intact in derived view; cleared for disclosure under requested scope.
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-red-700 font-bold mb-1">
              REDACT
            </div>
            <div className="text-[11px] text-gray-600 leading-snug">
              True binary removal from PDF/DOCX structures. Bounding boxes replaced with sanitized tokens.
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-amber-700 font-bold mb-1">
              MASK
            </div>
            <div className="text-[11px] text-gray-600 leading-snug">
              Format-preserving cryptographic mask substitution (e.g. j***@company.com).
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-amber-800 font-bold mb-1">
              REVIEW
            </div>
            <div className="text-[11px] text-gray-600 leading-snug">
              Quarantines view until compliance human reviewer explicitly signs off on candidate findings.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

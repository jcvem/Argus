"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { useAgents, CustomAgent } from "@/lib/agent-context";
import {
  Bot,
  Plus,
  ShieldCheck,
  Cpu,
  FileText,
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Terminal,
} from "lucide-react";

export default function AgentsStudioPage() {
  const { agents, deleteAgent } = useAgents();
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<CustomAgent | null>(agents[0] || null);

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      a.role.toLowerCase().includes(searchFilter.toLowerCase()) ||
      a.model.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200/80">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  AI Agents Studio
                </h1>
                <span className="text-[11px] font-medium text-zinc-800 bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 rounded-full">
                  {agents.length} Custom Agents
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 max-w-2xl leading-relaxed">
                Configure, deploy, and inspect custom AI agents operating under RedactCore deterministic
                privacy boundaries. Agents receive only verified, policy-governed derived views.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/agents/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create AI Agent</span>
              </Link>
            </div>
          </div>

          {/* Search & Overview toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter agents by name, role, model..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>RedactCore Gateway: Live Enforcing</span>
            </div>
          </div>

          {/* Agent Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => {
              const isSelected = selectedAgent?.id === agent.id;
              return (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`cursor-pointer bg-white border rounded-xl p-5 transition-all shadow-xs space-y-3.5 ${
                    isSelected
                      ? "border-zinc-900 ring-1 ring-zinc-900/20"
                      : "border-gray-200/80 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {agent.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 leading-tight">
                          {agent.name}
                        </div>
                        <div className="text-xs text-gray-500 font-normal leading-tight mt-0.5">
                          {agent.role}
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>{agent.status}</span>
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {agent.systemPrompt}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-gray-100 text-[11px]">
                    <div className="flex items-center justify-between text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="w-3 h-3 text-gray-400" />
                        <span>Model</span>
                      </span>
                      <span className="font-mono text-gray-800">{agent.model}</span>
                    </div>

                    <div className="flex items-center justify-between text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-zinc-900" />
                        <span>Policy</span>
                      </span>
                      <span className="font-mono text-zinc-900 font-medium">{agent.policyId}</span>
                    </div>

                    <div className="flex items-center justify-between text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-gray-400" />
                        <span>Target Store</span>
                      </span>
                      <span className="font-mono text-gray-800 truncate max-w-[140px]">
                        {agent.targetFiles.join(", ")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Create New Agent Placeholder Card */}
            <Link
              href="/agents/new"
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-zinc-900 hover:bg-zinc-50 transition-all group min-h-[200px]"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-zinc-100 text-gray-400 group-hover:text-zinc-900 flex items-center justify-center mb-2 transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-gray-900 group-hover:text-zinc-900 transition-colors">
                Create New AI Agent
              </div>
              <p className="text-[11px] text-gray-500 mt-1 max-w-[200px]">
                Define persona, assign RedactCore boundary policy, and connect enterprise files.
              </p>
            </Link>
          </div>

          {/* Active Agent Detail Panel */}
          {selectedAgent && (
            <div className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <Bot className="w-5 h-5 text-zinc-900" />
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">
                      Agent Configuration &middot; {selectedAgent.name}
                    </h2>
                    <p className="text-xs text-gray-500">
                      Created {selectedAgent.createdAt} &middot; Role Category: {selectedAgent.category}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/sandbox`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
                  >
                    <span>Test in Sandbox</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>

                  {agents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        deleteAgent(selectedAgent.id);
                        setSelectedAgent(agents.find((a) => a.id !== selectedAgent.id) || null);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Delete Agent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <div className="font-semibold text-gray-800">System Instruction Prompt</div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg font-mono text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedAgent.systemPrompt}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="font-semibold text-gray-800 mb-1">Enforced Policy Boundary</div>
                    <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-between">
                      <span className="font-mono text-zinc-900 font-medium">
                        {selectedAgent.policyId}
                      </span>
                      <Link
                        href="/policies"
                        className="text-[11px] text-zinc-900 font-medium hover:underline flex items-center gap-0.5"
                      >
                        <span>View Rules</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-800 mb-1">Target Document Ingest</div>
                    <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                      <span className="font-mono text-gray-700">
                        {selectedAgent.targetFiles.join(", ")}
                      </span>
                      <Link
                        href="/documents"
                        className="text-[11px] text-gray-500 hover:text-gray-900 flex items-center gap-0.5"
                      >
                        <span>Ledger</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

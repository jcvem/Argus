"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ProtectedRoute, useAuth } from "@/lib/auth-context";
import { AppShell } from "@/components/AppShell";
import { useAgents, CustomAgent } from "@/lib/agent-context";
import { useWorkspace } from "@/lib/workspace-context";
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
  ShieldAlert,
  ArrowUpRight,
  Send,
  UserCheck,
  Lock,
} from "lucide-react";

export default function AgentsStudioPage() {
  const { user } = useAuth();
  const {
    agents,
    deleteAgent,
    transferAgentToWorkspace,
    testUserExecution,
    testAgentToAgentQuery,
  } = useAgents();
  const { workspaces, selectedWorkspace, selectWorkspace } = useWorkspace();

  const [searchFilter, setSearchFilter] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<CustomAgent | null>(agents[0] || null);

  // Transfer action status
  const [transferNotice, setTransferNotice] = useState<string | null>(null);

  // Cerberus Verification Console state
  const [testMode, setTestMode] = useState<"confused_deputy" | "agent_to_agent">("confused_deputy");
  const [simulatedUserId, setSimulatedUserId] = useState("user-intern-guest");
  const [callerAgentId, setCallerAgentId] = useState(agents[0]?.id || "");
  const [targetAgentId, setTargetAgentId] = useState(agents[1]?.id || "");
  const [testOutput, setTestOutput] = useState<{
    allowed?: boolean;
    reason?: string;
    output?: string;
    response?: string;
  } | null>(null);

  const isDemoWorkspace = selectedWorkspace.type.toLowerCase().includes("demo") || selectedWorkspace.type.toLowerCase().includes("sandbox");
  const prodWorkspace = workspaces.find((w) => w.id === "ws-prod-hukurou") || workspaces[1] || workspaces[0];

  const filteredAgents = agents.filter(
    (a) =>
      a.workspaceId === selectedWorkspace.id &&
      (a.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        a.role.toLowerCase().includes(searchFilter.toLowerCase()) ||
        a.model.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const handleTransferToProd = (agentId: string) => {
    if (!prodWorkspace) return;
    const res = transferAgentToWorkspace(agentId, prodWorkspace.id);
    if (res.success && res.transferredAgent) {
      setTransferNotice(
        `Agent "${res.transferredAgent.name}" promoted successfully to production workspace "${prodWorkspace.name}".`
      );
      setTimeout(() => setTransferNotice(null), 5000);
    } else {
      setTransferNotice(res.error || "Failed to transfer agent.");
    }
  };

  const runConfusedDeputyTest = () => {
    if (!selectedAgent) return;
    const res = testUserExecution(selectedAgent.id, simulatedUserId);
    setTestOutput(res);
  };

  const runAgentToAgentTest = () => {
    if (!callerAgentId || !targetAgentId) return;
    const res = testAgentToAgentQuery(
      callerAgentId,
      targetAgentId,
      "Requesting sensitive balance ledger and payroll digests."
    );
    setTestOutput(res);
  };

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
                  {selectedWorkspace.name} ({filteredAgents.length} Agents)
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 max-w-2xl leading-relaxed">
                Autonomous AI agents scoped strictly to this workspace. Cerberus ensures least privilege,
                blocks Admin escalation, prevents confused deputy execution, and verifies agent-to-agent queries.
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

          {transferNotice && (
            <div className="p-3 bg-zinc-100 border border-zinc-300 rounded-xl text-xs text-zinc-900 flex items-center justify-between">
              <span>{transferNotice}</span>
              <button
                onClick={() => setTransferNotice(null)}
                className="text-zinc-500 hover:text-zinc-800 text-[11px] font-mono"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Workspace Switcher & Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200/80">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Workspace:</span>
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => selectWorkspace(ws.id)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      selectedWorkspace.id === ws.id
                        ? "bg-white text-gray-900 shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {ws.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter agents..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
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
                          {agent.role} (Rank: {agent.privilegeRank || 50})
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

                  {/* Transfer to Production Button for Demo Workspace */}
                  {isDemoWorkspace && (
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTransferToProd(agent.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg transition-colors"
                        title="Promote agent to production workspace"
                      >
                        <ArrowUpRight className="w-3 h-3 text-zinc-600" />
                        <span>Transfer to Production</span>
                      </button>
                    </div>
                  )}
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
                Deploy to {selectedWorkspace.name}. Admin role is blocked; strictly bounded by Cerberus.
              </p>
            </Link>
          </div>

          {/* Cerberus Gateway & Security Verification Console */}
          <div className="bg-white border border-gray-200/80 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-zinc-900" />
                <h2 className="text-sm font-bold text-gray-900">
                  Cerberus Gateway &amp; Invariant Verification Console
                </h2>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setTestMode("confused_deputy");
                    setTestOutput(null);
                  }}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    testMode === "confused_deputy"
                      ? "bg-zinc-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Confused Deputy Guard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTestMode("agent_to_agent");
                    setTestOutput(null);
                  }}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                    testMode === "agent_to_agent"
                      ? "bg-zinc-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Agent-to-Agent Hierarchy
                </button>
              </div>
            </div>

            {testMode === "confused_deputy" ? (
              <div className="space-y-3 text-xs">
                <p className="text-gray-600">
                  <strong>Invariant:</strong> User B cannot use an agent created by User A. Users must instantiate their own agents.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-gray-500 text-[11px] mb-1">Target Agent</label>
                    <div className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-mono">
                      {selectedAgent?.name || "Select an agent above"} (Owner: {selectedAgent?.createdByUserId || "user-admin-1"})
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-500 text-[11px] mb-1">Simulated Requesting User</label>
                    <select
                      value={simulatedUserId}
                      onChange={(e) => setSimulatedUserId(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-gray-800 font-mono focus:outline-none focus:border-zinc-900"
                    >
                      <option value="user-intern-guest">user-intern-guest (Unauthorized)</option>
                      <option value={selectedAgent?.createdByUserId || "user-admin-1"}>
                        {selectedAgent?.createdByUserId || "user-admin-1"} (Creator/Authorized)
                      </option>
                    </select>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={runConfusedDeputyTest}
                      className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold transition-colors"
                    >
                      Execute via Cerberus
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="text-gray-600">
                  <strong>Invariant:</strong> In agent-to-agent queries, ONLY an agent with larger or equal access rights can query an agent with less rights.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-gray-500 text-[11px] mb-1">Caller Agent</label>
                    <select
                      value={callerAgentId}
                      onChange={(e) => setCallerAgentId(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-gray-800 font-mono focus:outline-none focus:border-zinc-900"
                    >
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} (Rank: {a.privilegeRank || 50})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-500 text-[11px] mb-1">Target Agent</label>
                    <select
                      value={targetAgentId}
                      onChange={(e) => setTargetAgentId(e.target.value)}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg text-gray-800 font-mono focus:outline-none focus:border-zinc-900"
                    >
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} (Rank: {a.privilegeRank || 50})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={runAgentToAgentTest}
                      className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-semibold transition-colors"
                    >
                      Test Query Boundary
                    </button>
                  </div>
                </div>
              </div>
            )}

            {testOutput && (
              <div
                className={`p-3 rounded-lg border text-xs font-mono leading-relaxed ${
                  testOutput.allowed
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-900"
                }`}
              >
                <div className="font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  {testOutput.allowed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                  )}
                  <span>
                    CERBERUS PDP DECISION: {testOutput.allowed ? "ACCESS_GRANTED" : "ACCESS_DENIED"}
                  </span>
                </div>
                <div>{testOutput.reason || testOutput.output || testOutput.response}</div>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface CustomAgent {
  id: string;
  name: string;
  role: string;
  category: "Developer" | "Designer" | "Partner" | "Marketing" | "Operations";
  model: string;
  policyId: string;
  targetFiles: string[];
  systemPrompt: string;
  status: "active" | "draft" | "paused";
  createdAt: string;
}

export const INITIAL_CUSTOM_AGENTS: CustomAgent[] = [
  {
    id: "agent-ava",
    name: "AVA",
    role: "Marketing AI Agent",
    category: "Marketing",
    model: "Claude 3.5 Sonnet",
    policyId: "sales-quarterly",
    targetFiles: ["Sep_Sells.xls"],
    systemPrompt:
      "Analyze monthly performance metrics and draft campaign assets under strict fail-closed PII boundaries.",
    status: "active",
    createdAt: "2026/09/14",
  },
  {
    id: "agent-hermes",
    name: "Hermes",
    role: "Compliance Audit Agent",
    category: "Developer",
    model: "Gemini 1.5 Pro",
    policyId: "hr-strict",
    targetFiles: ["Executive_Comp.pdf"],
    systemPrompt:
      "Audit quarterly access ledgers and verify deterministic redaction compliance against HR confidentiality rules.",
    status: "active",
    createdAt: "2026/09/15",
  },
  {
    id: "agent-atlas",
    name: "Atlas",
    role: "Financial Analyst",
    category: "Partner",
    model: "GPT-4o",
    policyId: "sales-quarterly",
    targetFiles: ["Sep_Sells.xls"],
    systemPrompt:
      "Synthesize balance statements and variance summaries while enforcing complete customer identity masking.",
    status: "active",
    createdAt: "2026/09/20",
  },
];

interface AgentContextType {
  agents: CustomAgent[];
  createAgent: (agent: Omit<CustomAgent, "id" | "createdAt">) => CustomAgent;
  deleteAgent: (id: string) => void;
  getAgent: (id: string) => CustomAgent | undefined;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<CustomAgent[]>(INITIAL_CUSTOM_AGENTS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("argus_custom_agents");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAgents(parsed);
        }
      }
    } catch {
      // LocalStorage access fallback
    }
  }, []);

  const createAgent = (newAgentData: Omit<CustomAgent, "id" | "createdAt">) => {
    const newAgent: CustomAgent = {
      ...newAgentData,
      id: `agent-${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0].replace(/-/g, "/"),
    };
    const updated = [newAgent, ...agents];
    setAgents(updated);
    try {
      localStorage.setItem("argus_custom_agents", JSON.stringify(updated));
    } catch {
      // Ignore
    }
    return newAgent;
  };

  const deleteAgent = (id: string) => {
    const updated = agents.filter((a) => a.id !== id);
    setAgents(updated);
    try {
      localStorage.setItem("argus_custom_agents", JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  const getAgent = (id: string) => agents.find((a) => a.id === id);

  return (
    <AgentContext.Provider value={{ agents, createAgent, deleteAgent, getAgent }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgents() {
  const context = useContext(AgentContext);
  if (!context) {
    return {
      agents: INITIAL_CUSTOM_AGENTS,
      createAgent: () => INITIAL_CUSTOM_AGENTS[0],
      deleteAgent: () => {},
      getAgent: (id: string) => INITIAL_CUSTOM_AGENTS.find((a) => a.id === id),
    };
  }
  return context;
}

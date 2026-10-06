"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  WorkspaceAgent,
  AgentToAgentQueryResult,
  UserAgentExecutionResult,
} from "./organization-types";
import { orgService, INITIAL_WORKSPACE_AGENTS, SYSTEM_ROLES } from "./org-service";
import { useAuth } from "./auth-context";
import { useWorkspace } from "./workspace-context";

export interface CustomAgent {
  id: string;
  name: string;
  role: string;
  roleId?: string;
  privilegeRank?: number;
  category: "Developer" | "Designer" | "Partner" | "Marketing" | "Operations";
  model: string;
  policyId: string;
  targetFiles: string[];
  systemPrompt: string;
  status: "active" | "draft" | "paused" | "quarantined";
  createdAt: string;
  workspaceId: string;
  createdByUserId: string;
  createdByEmail?: string;
  transferredFromWorkspaceId?: string;
}

// Convert from service agents
export const INITIAL_CUSTOM_AGENTS: CustomAgent[] = INITIAL_WORKSPACE_AGENTS.map((a) => ({
  id: a.id,
  name: a.name,
  role: a.roleName,
  roleId: a.roleId,
  privilegeRank: a.privilegeRank,
  category: a.category,
  model: a.model,
  policyId: a.policyId,
  targetFiles: a.targetFiles,
  systemPrompt: a.systemPrompt,
  status: a.status === "active" ? "active" : "paused",
  createdAt: a.createdAt.split("T")[0].replace(/-/g, "/"),
  workspaceId: a.workspaceId,
  createdByUserId: a.createdByUserId,
  createdByEmail: a.createdByEmail,
}));

interface AgentContextType {
  agents: CustomAgent[];
  activeWorkspaceAgents: CustomAgent[];
  createAgent: (
    agent: Omit<CustomAgent, "id" | "createdAt" | "workspaceId" | "createdByUserId"> & {
      workspaceId?: string;
      roleId?: string;
    }
  ) => { success: boolean; agent?: CustomAgent; error?: string };
  deleteAgent: (id: string) => void;
  getAgent: (id: string) => CustomAgent | undefined;
  transferAgentToWorkspace: (
    agentId: string,
    targetWorkspaceId: string
  ) => { success: boolean; transferredAgent?: CustomAgent; error?: string };
  testUserExecution: (agentId: string, simulatedUserId?: string) => UserAgentExecutionResult;
  testAgentToAgentQuery: (
    callerAgentId: string,
    targetAgentId: string,
    message: string
  ) => AgentToAgentQueryResult;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { selectedWorkspace } = useWorkspace();
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

  const currentUserId = user?.uid || "user-admin-1";
  const currentUserEmail = user?.email || "admin@hukurou.internal";

  // Filter agents by the currently selected workspace
  const activeWorkspaceAgents = agents.filter(
    (a) => a.workspaceId === selectedWorkspace.id
  );

  const createAgent = (
    newAgentData: Omit<CustomAgent, "id" | "createdAt" | "workspaceId" | "createdByUserId"> & {
      workspaceId?: string;
      roleId?: string;
    }
  ) => {
    const wsId = newAgentData.workspaceId || selectedWorkspace.id;
    const roleId = newAgentData.roleId || "role-member";
    const selectedRole =
      orgService.getRole(roleId) ||
      SYSTEM_ROLES.find((r) => r.name.toLowerCase() === newAgentData.role.toLowerCase()) ||
      SYSTEM_ROLES[2]; // Member

    // CERBERUS INVARIANT: Agent CANNOT be Admin!
    if (selectedRole.isAdmin || selectedRole.name.toLowerCase() === "admin") {
      return {
        success: false,
        error: "Security Policy Invariant: AI Agents cannot be assigned the Admin role.",
      };
    }

    const res = orgService.createAgent(currentUserId, wsId, {
      name: newAgentData.name,
      roleId: selectedRole.id,
      category: newAgentData.category,
      model: newAgentData.model,
      policyId: newAgentData.policyId,
      targetFiles: newAgentData.targetFiles,
      systemPrompt: newAgentData.systemPrompt,
    });

    if (!res.success || !res.agent) {
      return { success: false, error: res.error || "Failed to create agent" };
    }

    const created: CustomAgent = {
      id: res.agent.id,
      name: res.agent.name,
      role: res.agent.roleName,
      roleId: res.agent.roleId,
      privilegeRank: res.agent.privilegeRank,
      category: res.agent.category,
      model: res.agent.model,
      policyId: res.agent.policyId,
      targetFiles: res.agent.targetFiles,
      systemPrompt: res.agent.systemPrompt,
      status: "active",
      createdAt: new Date().toISOString().split("T")[0].replace(/-/g, "/"),
      workspaceId: wsId,
      createdByUserId: currentUserId,
      createdByEmail: currentUserEmail,
    };

    const updated = [created, ...agents];
    setAgents(updated);
    try {
      localStorage.setItem("argus_custom_agents", JSON.stringify(updated));
    } catch {
      // Ignore
    }

    return { success: true, agent: created };
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

  /**
   * Quick transfer/promotion from Demo to Production workspace
   */
  const transferAgentToWorkspace = (agentId: string, targetWorkspaceId: string) => {
    const agent = getAgent(agentId);
    if (!agent) {
      return { success: false, error: "Agent not found" };
    }

    const res = orgService.transferAgentToWorkspace(
      agentId,
      agent.workspaceId,
      targetWorkspaceId,
      currentUserId
    );

    if (!res.success || !res.transferredAgent) {
      return { success: false, error: res.error || "Transfer failed" };
    }

    const promoted: CustomAgent = {
      ...agent,
      id: res.transferredAgent.id,
      workspaceId: targetWorkspaceId,
      transferredFromWorkspaceId: agent.workspaceId,
      createdAt: new Date().toISOString().split("T")[0].replace(/-/g, "/"),
    };

    const updated = [promoted, ...agents];
    setAgents(updated);
    try {
      localStorage.setItem("argus_custom_agents", JSON.stringify(updated));
    } catch {
      // Ignore
    }

    return { success: true, transferredAgent: promoted };
  };

  /**
   * Cerberus Confused Deputy test runner
   */
  const testUserExecution = (agentId: string, simulatedUserId?: string) => {
    const targetUserId = simulatedUserId || currentUserId;
    return orgService.executeAgent(targetUserId, agentId, "Simulated prompt test");
  };

  /**
   * Cerberus Agent-to-Agent Query test runner
   */
  const testAgentToAgentQuery = (
    callerAgentId: string,
    targetAgentId: string,
    message: string
  ) => {
    return orgService.executeAgentToAgentQuery(callerAgentId, targetAgentId, message);
  };

  return (
    <AgentContext.Provider
      value={{
        agents,
        activeWorkspaceAgents,
        createAgent,
        deleteAgent,
        getAgent,
        transferAgentToWorkspace,
        testUserExecution,
        testAgentToAgentQuery,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgents() {
  const context = useContext(AgentContext);
  if (!context) {
    return {
      agents: INITIAL_CUSTOM_AGENTS,
      activeWorkspaceAgents: INITIAL_CUSTOM_AGENTS,
      createAgent: (): { success: boolean; agent?: CustomAgent; error?: string } => ({ success: false, error: "No provider" }),
      deleteAgent: () => {},
      getAgent: (id: string) => INITIAL_CUSTOM_AGENTS.find((a) => a.id === id),
      transferAgentToWorkspace: (): { success: boolean; transferredAgent?: CustomAgent; error?: string } => ({ success: false, error: "No provider" }),
      testUserExecution: () => ({
        allowed: false,
        reason: "No context",
        timestamp: new Date().toISOString(),
      }),
      testAgentToAgentQuery: () => ({
        allowed: false,
        callerRank: 0,
        targetRank: 0,
        reason: "No context",
        timestamp: new Date().toISOString(),
      }),
    };
  }
  return context;
}

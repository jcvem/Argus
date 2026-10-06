/**
 * Cerberus Runtime AI Gateway & Authorization Engine
 * 
 * Enforces key security invariants:
 * 1. Agent Role Constraint: Agents CANNOT have the Admin role, and their privilege rank
 *    must be less than or equal to their creator's role rank.
 * 2. Confused Deputy Guard: User B cannot invoke or prompt an agent created by User A.
 *    Users must create their own agents with their own access privileges.
 * 3. Agent-to-Agent Hierarchy: Only an agent with higher or equal privilege rights can query
 *    an agent with less rights. Downward delegation is permitted; upward privilege escalation is blocked.
 * 4. Workspace Isolation: Agents run strictly within their designated workspace.
 * 5. Cerberus RAG Retrieval Gateway: Queries are resolved exclusively against RedactCore-derived
 *    documents in the organization's cloud storage bucket partition (workspaces/{ws}/derived/),
 *    never against unredacted raw originals.
 */

import {
  OrganizationRole,
  WorkspaceAgent,
  CerberusRagSettings,
  AgentToAgentQueryResult,
  UserAgentExecutionResult,
} from "./organization-types";

export class CerberusGatewayError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "CerberusGatewayError";
  }
}

/**
 * Validates role assignment for an AI Agent during creation or update.
 * Invariants:
 * - Agent CANNOT have an Admin role.
 * - Agent's role rank must be <= creator's role rank.
 */
export function validateAgentRoleAssignment(
  creatorRole: OrganizationRole,
  targetRole: OrganizationRole
): { valid: boolean; error?: string } {
  // Invariant 1: Agent CANNOT have Admin role
  if (targetRole.isAdmin || targetRole.name.toLowerCase() === "admin") {
    return {
      valid: false,
      error: "Security Policy Violation: AI Agents cannot be granted the Admin role.",
    };
  }

  // Invariant 2: Privilege ceiling (agent rank <= creator rank)
  if (targetRole.rank > creatorRole.rank) {
    return {
      valid: false,
      error: `Privilege Ceiling Violation: Agent role rank (${targetRole.rank}) cannot exceed creator's role rank (${creatorRole.rank}).`,
    };
  }

  return { valid: true };
}

/**
 * Confused Deputy Guard:
 * Prevents User B from invoking an agent created by User A.
 * Each user must create and operate agents scoped strictly to their own permissions.
 */
export function authorizeAgentExecution(
  requestingUserId: string,
  agent: WorkspaceAgent
): UserAgentExecutionResult {
  const timestamp = new Date().toISOString();

  if (agent.status !== "active") {
    return {
      allowed: false,
      reason: `Execution Blocked: Agent "${agent.name}" is currently ${agent.status}.`,
      timestamp,
    };
  }

  // Strict ownership check to prevent confused deputy attacks
  if (agent.createdByUserId !== requestingUserId) {
    return {
      allowed: false,
      reason: `Confused Deputy Violation: User "${requestingUserId}" is not authorized to use agent "${agent.name}" created by "${agent.createdByUserId}". Users must instantiate their own scoped agents.`,
      timestamp,
    };
  }

  return {
    allowed: true,
    output: `Cerberus Gateway: Request authorized for ${agent.name} (Role: ${agent.roleName}, Rank: ${agent.privilegeRank}). Access restricted to workspace ${agent.workspaceId}.`,
    timestamp,
  };
}

/**
 * Agent-to-Agent Query Authorization:
 * In case of agent-to-agent queries, ONLY an agent with LARGER or EQUAL access rights
 * can query an agent with LESS rights.
 * 
 * Example:
 * Hermes (Developer, Rank 80) querying Ava (Marketing, Rank 30) -> ALLOWED (Rank 80 >= 30)
 * Ava (Marketing, Rank 30) querying Hermes (Developer, Rank 80) -> BLOCKED (Rank 30 < 80)
 */
export function authorizeAgentToAgentQuery(
  callerAgent: WorkspaceAgent,
  targetAgent: WorkspaceAgent,
  message: string
): AgentToAgentQueryResult {
  const timestamp = new Date().toISOString();

  // Invariant: Both agents must reside in the same workspace
  if (callerAgent.workspaceId !== targetAgent.workspaceId) {
    return {
      allowed: false,
      callerRank: callerAgent.privilegeRank,
      targetRank: targetAgent.privilegeRank,
      reason: `Workspace Boundary Violation: Agent ${callerAgent.name} (Workspace: ${callerAgent.workspaceId}) cannot cross-query Agent ${targetAgent.name} in Workspace ${targetAgent.workspaceId}.`,
      timestamp,
    };
  }

  // Invariant: Privilege comparison (Caller Rank must be >= Target Rank)
  if (callerAgent.privilegeRank < targetAgent.privilegeRank) {
    return {
      allowed: false,
      callerRank: callerAgent.privilegeRank,
      targetRank: targetAgent.privilegeRank,
      reason: `Privilege Escalation Blocked: Caller Agent "${callerAgent.name}" (Privilege Rank ${callerAgent.privilegeRank}) does not possess sufficient authority to query Target Agent "${targetAgent.name}" (Privilege Rank ${targetAgent.privilegeRank}). Only agents with higher or equal rights can query agents with less rights.`,
      timestamp,
    };
  }

  return {
    allowed: true,
    callerRank: callerAgent.privilegeRank,
    targetRank: targetAgent.privilegeRank,
    response: `Cerberus Gateway: Downward agent query authorized from ${callerAgent.name} (Rank ${callerAgent.privilegeRank}) to ${targetAgent.name} (Rank ${targetAgent.privilegeRank}). Message processed: "${message.slice(0, 50)}${message.length > 50 ? "..." : ""}"`,
    timestamp,
  };
}

/**
 * Cerberus RAG Retrieval Gateway:
 * Authorizes RAG chunk retrieval against Cloud Storage.
 * Restricts queries strictly to RedactCore-derived partitioned paths,
 * ensuring raw sensitive documents in the bucket are never queried by RAG agents.
 */
export function authorizeRagRetrieval(
  agent: WorkspaceAgent,
  storagePath: string
): { allowed: boolean; reason?: string; verifiedPath?: string } {
  const allowedPrefix = `workspaces/${agent.workspaceId}/derived/`;

  if (!agent.ragSettings.retrievalAllowed) {
    return {
      allowed: false,
      reason: `RAG Retrieval Disabled: Agent "${agent.name}" does not have RAG retrieval enabled.`,
    };
  }

  // Reject access to raw/ unredacted originals
  if (storagePath.includes("/raw/") || !storagePath.startsWith(allowedPrefix)) {
    return {
      allowed: false,
      reason: `Cerberus Security Invariant: RAG gateway access to raw unredacted storage path "${storagePath}" is forbidden. Retrieval is strictly bounded to "${allowedPrefix}".`,
    };
  }

  return {
    allowed: true,
    verifiedPath: storagePath,
  };
}

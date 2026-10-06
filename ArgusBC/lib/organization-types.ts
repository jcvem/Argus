/**
 * Comprehensive Data Hierarchy and Tenancy Contracts for Argus.
 * 
 * Hierarchy:
 * Organization (Top-level tenant)
 *  ├── Subscription (Duration, Seat Count Limit, Tier)
 *  ├── Cloud Storage Bucket (1 dedicated bucket per Org: gs://argus-tenant-{orgId})
 *  ├── Workspaces (Default: Demo-{Org} [Sandbox] & {Org} [Production])
 *  │    ├── Storage Partition: workspaces/{workspaceId}/raw/ & derived/
 *  │    └── AI Agents (Agent Studio: runs strictly within this workspace)
 *  ├── Roles (Default system-reserved: Admin [Rank 100], SecurityAnalyst [80], Member [50], Viewer [20])
 *  ├── Members & Invitations (Enforced within seat count limit)
 *  └── Policies (Org-level guardrails & workspace-level operational rules)
 */

export type SubscriptionStatus = "active" | "trial" | "past_due" | "canceled";
export type SubscriptionTier = "starter" | "growth" | "enterprise";

export interface OrganizationSubscription {
  status: SubscriptionStatus;
  tier: SubscriptionTier;
  seatLimit: number;
  seatsAllocated: number;
  startDate: string; // ISO-8601
  currentPeriodEnd: string; // ISO-8601
  autoRenew: boolean;
}

export interface Organization {
  id: string; // e.g. "org-hukurou"
  name: string; // e.g. "HUKUROU"
  slug: string; // e.g. "hukurou"
  storageBucketName: string; // e.g. "argus-tenant-org-hukurou"
  subscription: OrganizationSubscription;
  defaultAdminRoleId: string;
  createdAt: string;
  updatedAt: string;
}

export type WorkspaceType = "demo" | "production";

export interface Workspace {
  id: string; // e.g. "ws-demo-hukurou" or "ws-prod-hukurou"
  orgId: string;
  name: string; // e.g. "Demo-HUKUROU" or "HUKUROU"
  type: WorkspaceType;
  isDefault: boolean;
  storagePrefix: string; // e.g. "workspaces/ws-demo-hukurou/"
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationRole {
  id: string;
  orgId: string;
  name: string; // e.g. "Admin", "SecurityAnalyst", "Member", "Viewer"
  description: string;
  isSystemReserved: boolean;
  isAdmin: boolean;
  rank: number; // 1-100. Admin=100. AI Agents CANNOT be Admin, and agent rank <= creator rank.
  permissions: string[];
}

export type MemberStatus = "active" | "suspended" | "pending";

export interface OrganizationMember {
  userId: string; // Firebase Auth UID
  orgId: string;
  email: string;
  displayName?: string;
  roleId: string;
  status: MemberStatus;
  joinedAt: string;
}

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export interface UserInvitation {
  id: string;
  orgId: string;
  email: string;
  roleId: string;
  invitedByUserId: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
}

export interface CerberusRagSettings {
  retrievalAllowed: boolean;
  targetFolderPrefix: string; // workspaces/{workspaceId}/derived/
  maxClearanceLevel: "public" | "internal" | "confidential" | "restricted";
  enforceZeroLeakage: boolean;
}

export type AgentStatus = "active" | "quarantined" | "disabled";

export interface WorkspaceAgent {
  id: string;
  orgId: string;
  workspaceId: string; // Strictly bounded to this workspace
  createdByUserId: string; // Creator's UID
  createdByEmail?: string;
  name: string;
  roleId: string; // CANNOT be Admin role
  roleName: string;
  privilegeRank: number; // Inherited rank <= creator rank
  category: "Developer" | "Designer" | "Partner" | "Marketing" | "Operations";
  model: string;
  policyId: string;
  targetFiles: string[];
  systemPrompt: string;
  status: AgentStatus;
  ragSettings: CerberusRagSettings;
  createdAt: string;
  updatedAt: string;
  transferredFromWorkspaceId?: string; // Track provenance when promoted from Demo to Production
}

export interface AgentToAgentQueryRequest {
  callerAgentId: string;
  targetAgentId: string;
  message: string;
}

export interface AgentToAgentQueryResult {
  allowed: boolean;
  callerRank: number;
  targetRank: number;
  reason?: string;
  response?: string;
  timestamp: string;
}

export interface UserAgentExecutionRequest {
  userId: string;
  agentId: string;
  input: string;
}

export interface UserAgentExecutionResult {
  allowed: boolean;
  reason?: string;
  output?: string;
  timestamp: string;
}

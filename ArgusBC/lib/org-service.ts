/**
 * Organization, Workspace, Role, Subscription, and Agent Management Service.
 * 
 * Supports both live Firestore (GCP project) and local simulated storage.
 * Implements:
 * 1. Organization top-level structure with Cloud Storage bucket (1 per org).
 * 2. Two default workspaces: Demo-{Org} and {Org}.
 * 3. Subscription with duration and seat limit.
 * 4. System Admin role and custom roles.
 * 5. Invitations constrained by seat limit.
 * 6. Policy authoring rights.
 * 7. Agent Studio with Cerberus Gateway invariants:
 *    - Agent CANNOT be Admin.
 *    - Agent rank <= Creator rank.
 *    - Strict workspace scoping.
 *    - Quick transfer from Demo to Production.
 *    - Confused Deputy protection (User B cannot use User A's agent).
 *    - Agent-to-Agent hierarchy (Higher rank querying lower rank).
 */

import {
  Organization,
  Workspace,
  OrganizationRole,
  OrganizationMember,
  UserInvitation,
  WorkspaceAgent,
  CerberusRagSettings,
} from "./organization-types";
import {
  validateAgentRoleAssignment,
  authorizeAgentExecution,
  authorizeAgentToAgentQuery,
  authorizeRagRetrieval,
} from "./cerberus-gateway";
import { getFirebaseFirestore, getFirebaseAuth } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

// Canonical Default System Roles
export const SYSTEM_ROLES: OrganizationRole[] = [
  {
    id: "role-admin",
    orgId: "org-hukurou",
    name: "Admin",
    description: "Full control-plane administrative authority. Cannot be assigned to AI Agents.",
    isSystemReserved: true,
    isAdmin: true,
    rank: 100,
    permissions: [
      "org:manage",
      "billing:manage",
      "user:invite",
      "role:create",
      "policy:create",
      "policy:edit",
      "workspace:manage",
      "agent:create",
      "agent:transfer",
      "audit:read",
    ],
  },
  {
    id: "role-sec-analyst",
    orgId: "org-hukurou",
    name: "SecurityAnalyst",
    description: "Security and compliance analyst. Can audit redaction logs and simulate policies.",
    isSystemReserved: true,
    isAdmin: false,
    rank: 80,
    permissions: [
      "policy:read",
      "policy:simulate",
      "audit:read",
      "agent:create",
      "document:read",
    ],
  },
  {
    id: "role-member",
    orgId: "org-hukurou",
    name: "Member",
    description: "Standard organization team member with operational agent access.",
    isSystemReserved: true,
    isAdmin: false,
    rank: 50,
    permissions: ["agent:create", "document:read", "view:generate"],
  },
  {
    id: "role-viewer",
    orgId: "org-hukurou",
    name: "Viewer",
    description: "Read-only auditor with restricted view privileges.",
    isSystemReserved: true,
    isAdmin: false,
    rank: 20,
    permissions: ["document:read"],
  },
];

// Initial default Organization structure (HUKUROU)
export const DEFAULT_ORGANIZATION: Organization = {
  id: "org-hukurou",
  name: "HUKUROU",
  slug: "hukurou",
  storageBucketName: "argus-tenant-org-hukurou",
  subscription: {
    status: "active",
    tier: "enterprise",
    seatLimit: 10,
    seatsAllocated: 3,
    startDate: "2026-01-01T00:00:00Z",
    currentPeriodEnd: "2027-01-01T00:00:00Z", // 1-year duration
    autoRenew: true,
  },
  defaultAdminRoleId: "role-admin",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-10-06T00:00:00Z",
};

// Two default workspaces per organization
export const DEFAULT_ORG_WORKSPACES: Workspace[] = [
  {
    id: "ws-demo-hukurou",
    orgId: "org-hukurou",
    name: "Demo-HUKUROU",
    type: "demo",
    isDefault: true,
    storagePrefix: "workspaces/ws-demo-hukurou/",
    description: "Isolated sandbox environment for testing policies and prototyping AI agents with fixture data.",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-10-06T00:00:00Z",
  },
  {
    id: "ws-prod-hukurou",
    orgId: "org-hukurou",
    name: "HUKUROU",
    type: "production",
    isDefault: true,
    storagePrefix: "workspaces/ws-prod-hukurou/",
    description: "Production data operations workspace with live regulatory privacy controls and enterprise retention.",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-10-06T00:00:00Z",
  },
];

export const INITIAL_MEMBERS: OrganizationMember[] = [
  {
    userId: "user-admin-jc",
    orgId: "org-hukurou",
    email: "jc@vem-studio.com",
    displayName: "JC (Lead Admin)",
    roleId: "role-admin",
    status: "active",
    joinedAt: "2026-01-01T00:00:00Z",
  },
  {
    userId: "user-sec-1",
    orgId: "org-hukurou",
    email: "analyst@hukurou.internal",
    displayName: "Security Specialist",
    roleId: "role-sec-analyst",
    status: "active",
    joinedAt: "2026-02-15T00:00:00Z",
  },
  {
    userId: "user-dev-1",
    orgId: "org-hukurou",
    email: "developer@hukurou.internal",
    displayName: "Lead Developer",
    roleId: "role-member",
    status: "active",
    joinedAt: "2026-03-01T00:00:00Z",
  },
];

export const INITIAL_INVITATIONS: UserInvitation[] = [
  {
    id: "inv-001",
    orgId: "org-hukurou",
    email: "contractor@partner.internal",
    roleId: "role-viewer",
    invitedByUserId: "user-admin-1",
    status: "pending",
    createdAt: "2026-10-01T00:00:00Z",
    expiresAt: "2026-10-15T00:00:00Z",
  },
];

export const INITIAL_WORKSPACE_AGENTS: WorkspaceAgent[] = [
  {
    id: "agent-hermes",
    orgId: "org-hukurou",
    workspaceId: "ws-demo-hukurou", // In Demo workspace
    createdByUserId: "user-admin-1",
    createdByEmail: "admin@hukurou.internal",
    name: "Hermes",
    roleId: "role-sec-analyst", // Not Admin!
    roleName: "SecurityAnalyst",
    privilegeRank: 80,
    category: "Developer",
    model: "Gemini 1.5 Pro",
    policyId: "hr-strict",
    targetFiles: ["Executive_Comp.pdf"],
    systemPrompt: "Audit access ledgers and verify zero-leakage redaction compliance.",
    status: "active",
    ragSettings: {
      retrievalAllowed: true,
      targetFolderPrefix: "workspaces/ws-demo-hukurou/derived/",
      maxClearanceLevel: "confidential",
      enforceZeroLeakage: true,
    },
    createdAt: "2026-09-15T00:00:00Z",
    updatedAt: "2026-09-15T00:00:00Z",
  },
  {
    id: "agent-ava",
    orgId: "org-hukurou",
    workspaceId: "ws-demo-hukurou", // In Demo workspace
    createdByUserId: "user-dev-1",
    createdByEmail: "developer@hukurou.internal",
    name: "AVA",
    roleId: "role-member", // Rank 50
    roleName: "Member",
    privilegeRank: 50,
    category: "Marketing",
    model: "Claude 3.5 Sonnet",
    policyId: "sales-quarterly",
    targetFiles: ["Sep_Sells.xls"],
    systemPrompt: "Synthesize quarterly sales summaries without leaking consumer PII.",
    status: "active",
    ragSettings: {
      retrievalAllowed: true,
      targetFolderPrefix: "workspaces/ws-demo-hukurou/derived/",
      maxClearanceLevel: "internal",
      enforceZeroLeakage: true,
    },
    createdAt: "2026-09-14T00:00:00Z",
    updatedAt: "2026-09-14T00:00:00Z",
  },
  {
    id: "agent-atlas-prod",
    orgId: "org-hukurou",
    workspaceId: "ws-prod-hukurou", // In Production workspace
    createdByUserId: "user-admin-1",
    createdByEmail: "admin@hukurou.internal",
    name: "Atlas",
    roleId: "role-sec-analyst",
    roleName: "SecurityAnalyst",
    privilegeRank: 80,
    category: "Partner",
    model: "GPT-4o",
    policyId: "sales-quarterly",
    targetFiles: ["Sep_Sells.xls"],
    systemPrompt: "Synthesize balance statements and variance summaries under production vault rules.",
    status: "active",
    ragSettings: {
      retrievalAllowed: true,
      targetFolderPrefix: "workspaces/ws-prod-hukurou/derived/",
      maxClearanceLevel: "confidential",
      enforceZeroLeakage: true,
    },
    createdAt: "2026-09-20T00:00:00Z",
    updatedAt: "2026-09-20T00:00:00Z",
  },
];

class OrgService {
  private organizations: Organization[] = [DEFAULT_ORGANIZATION];
  private currentOrgId: string = DEFAULT_ORGANIZATION.id;
  private organization: Organization = DEFAULT_ORGANIZATION;
  private workspaces: Workspace[] = DEFAULT_ORG_WORKSPACES;
  private roles: OrganizationRole[] = SYSTEM_ROLES;
  private members: OrganizationMember[] = INITIAL_MEMBERS;
  private invitations: UserInvitation[] = INITIAL_INVITATIONS;
  private agents: WorkspaceAgent[] = INITIAL_WORKSPACE_AGENTS;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === "undefined") return;
    try {
      const savedAllOrgs = localStorage.getItem("argus_all_orgs");
      if (savedAllOrgs) this.organizations = JSON.parse(savedAllOrgs);

      const savedCurOrgId = localStorage.getItem("argus_current_org_id");
      if (savedCurOrgId) {
        this.currentOrgId = savedCurOrgId;
        const current = this.organizations.find((o) => o.id === savedCurOrgId);
        if (current) this.organization = current;
      } else {
        const savedOrg = localStorage.getItem("argus_org");
        if (savedOrg) this.organization = JSON.parse(savedOrg);
      }

      const savedWs = localStorage.getItem("argus_org_workspaces");
      if (savedWs) this.workspaces = JSON.parse(savedWs);

      const savedRoles = localStorage.getItem("argus_org_roles");
      if (savedRoles) this.roles = JSON.parse(savedRoles);

      const savedMembers = localStorage.getItem("argus_org_members");
      if (savedMembers) {
        this.members = JSON.parse(savedMembers);
      }

      // Reconcile: ensure jc@vem-studio.com is registered as Lead Admin
      const hasJc = this.members.find((m) => m.email?.toLowerCase() === "jc@vem-studio.com");
      if (!hasJc) {
        this.members.unshift({
          userId: "user-admin-jc",
          orgId: this.organization.id,
          email: "jc@vem-studio.com",
          displayName: "JC (Lead Admin)",
          roleId: "role-admin",
          status: "active",
          joinedAt: "2026-01-01T00:00:00Z",
        });
        this.saveToStorage();
      } else if (hasJc.roleId !== "role-admin") {
        hasJc.roleId = "role-admin";
        this.saveToStorage();
      }

      const savedInvs = localStorage.getItem("argus_org_invitations");
      if (savedInvs) this.invitations = JSON.parse(savedInvs);

      const savedAgents = localStorage.getItem("argus_workspace_agents");
      if (savedAgents) this.agents = JSON.parse(savedAgents);
    } catch {
      // LocalStorage error fallback
    }
  }

  public getMemberByIdOrEmail(userId?: string, email?: string): OrganizationMember | undefined {
    const cleanId = userId?.toLowerCase();
    const cleanEmail = email?.toLowerCase();

    // Universal Lead Admin check for jc@vem-studio.com
    if (cleanEmail === "jc@vem-studio.com" || cleanId === "jc@vem-studio.com") {
      let jcMember = this.members.find((m) => m.email?.toLowerCase() === "jc@vem-studio.com");
      if (!jcMember) {
        jcMember = {
          userId: userId || "user-admin-jc",
          orgId: this.organization.id,
          email: "jc@vem-studio.com",
          displayName: "JC (Lead Admin)",
          roleId: "role-admin",
          status: "active",
          joinedAt: "2026-01-01T00:00:00Z",
        };
        this.members.unshift(jcMember);
        this.saveToStorage();
      }
      if (userId && jcMember.userId !== userId) {
        jcMember.userId = userId;
        this.saveToStorage();
      }
      return jcMember;
    }

    if (userId) {
      const match = this.members.find((m) => m.userId === userId || m.email?.toLowerCase() === cleanId);
      if (match) return match;
    }

    if (email) {
      const match = this.members.find((m) => m.email?.toLowerCase() === cleanEmail);
      if (match) return match;
    }

    return undefined;
  }

  private saveToStorage() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("argus_all_orgs", JSON.stringify(this.organizations));
      localStorage.setItem("argus_current_org_id", this.currentOrgId);
      localStorage.setItem("argus_org", JSON.stringify(this.organization));
      localStorage.setItem("argus_org_workspaces", JSON.stringify(this.workspaces));
      localStorage.setItem("argus_org_roles", JSON.stringify(this.roles));
      localStorage.setItem("argus_org_members", JSON.stringify(this.members));
      localStorage.setItem("argus_org_invitations", JSON.stringify(this.invitations));
      localStorage.setItem("argus_workspace_agents", JSON.stringify(this.agents));
    } catch {
      // LocalStorage error fallback
    }
  }

  // 1. Organization & Tenancy
  public getOrganization(): Organization {
    return this.organization;
  }

  public getAllOrganizations(): Organization[] {
    return this.organizations;
  }

  public getUserOrganizations(userId?: string, email?: string): Organization[] {
    const cleanId = userId?.toLowerCase();
    const cleanEmail = email?.toLowerCase();

    // Lead Admin jc@vem-studio.com always belongs to HUKUROU
    const isJc = cleanEmail === "jc@vem-studio.com" || cleanId === "jc@vem-studio.com";

    const userOrgIds = new Set<string>();
    if (isJc) {
      userOrgIds.add(DEFAULT_ORGANIZATION.id);
    }

    for (const member of this.members) {
      if (
        (cleanId && member.userId?.toLowerCase() === cleanId) ||
        (cleanEmail && member.email?.toLowerCase() === cleanEmail)
      ) {
        userOrgIds.add(member.orgId);
      }
    }

    return this.organizations.filter((org) => userOrgIds.has(org.id));
  }

  public getUserPendingInvitations(email?: string): UserInvitation[] {
    if (!email) return [];
    const cleanEmail = email.toLowerCase().trim();
    return this.invitations.filter(
      (inv) => inv.status === "pending" && inv.email?.toLowerCase() === cleanEmail
    );
  }

  public switchOrganization(orgId: string): Organization | undefined {
    const found = this.organizations.find((o) => o.id === orgId);
    if (found) {
      this.currentOrgId = orgId;
      this.organization = found;
      this.saveToStorage();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("argus-org-changed", { detail: { orgId } }));
      }
      return found;
    }
    return undefined;
  }

  public createOrganization(
    name: string,
    adminUserId: string,
    adminEmail: string,
    adminDisplayName?: string
  ): {
    success: boolean;
    organization: Organization;
    workspaces: Workspace[];
    roles: OrganizationRole[];
    member: OrganizationMember;
  } {
    const trimmedName = name.trim();
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "org";
    const orgId = `org-${slug}-${Date.now().toString(36)}`;
    const bucketName = `argus-tenant-${slug}`;

    const newOrg: Organization = {
      id: orgId,
      name: trimmedName,
      slug,
      storageBucketName: bucketName,
      subscription: {
        status: "active",
        tier: "starter",
        seatLimit: 10,
        seatsAllocated: 1,
        startDate: new Date().toISOString(),
        currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenew: true,
      },
      defaultAdminRoleId: `role-admin-${orgId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const demoWs: Workspace = {
      id: `ws-demo-${slug}-${Date.now().toString(36)}`,
      orgId,
      name: `Demo-${trimmedName}`,
      type: "demo",
      isDefault: true,
      storagePrefix: `workspaces/ws-demo-${slug}/`,
      description: `Isolated sandbox environment for prototyping AI agents and testing policies for ${trimmedName}.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const prodWs: Workspace = {
      id: `ws-prod-${slug}-${Date.now().toString(36)}`,
      orgId,
      name: trimmedName,
      type: "production",
      isDefault: true,
      storagePrefix: `workspaces/ws-prod-${slug}/`,
      description: `Production data operations workspace with live regulatory privacy controls for ${trimmedName}.`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const orgRoles: OrganizationRole[] = [
      {
        id: `role-admin-${orgId}`,
        orgId,
        name: "Admin",
        description: "Full control-plane administrative authority. Cannot be assigned to AI Agents.",
        isSystemReserved: true,
        isAdmin: true,
        rank: 100,
        permissions: [
          "org:manage",
          "billing:manage",
          "user:invite",
          "role:create",
          "policy:create",
          "policy:edit",
          "workspace:manage",
          "agent:create",
          "agent:transfer",
          "audit:read",
        ],
      },
      {
        id: `role-sec-${orgId}`,
        orgId,
        name: "SecurityAnalyst",
        description: "Security and compliance analyst. Can audit redaction logs and simulate policies.",
        isSystemReserved: true,
        isAdmin: false,
        rank: 80,
        permissions: [
          "policy:read",
          "policy:simulate",
          "audit:read",
          "agent:create",
          "document:read",
        ],
      },
      {
        id: `role-member-${orgId}`,
        orgId,
        name: "Member",
        description: "Standard organization team member with operational agent access.",
        isSystemReserved: true,
        isAdmin: false,
        rank: 50,
        permissions: ["agent:create", "document:read", "view:generate"],
      },
      {
        id: `role-viewer-${orgId}`,
        orgId,
        name: "Viewer",
        description: "Read-only auditor with restricted view privileges.",
        isSystemReserved: true,
        isAdmin: false,
        rank: 20,
        permissions: ["document:read"],
      },
    ];

    const adminMember: OrganizationMember = {
      userId: adminUserId,
      orgId,
      email: adminEmail,
      displayName: adminDisplayName || adminEmail.split("@")[0] || "Admin",
      roleId: `role-admin-${orgId}`,
      status: "active",
      joinedAt: new Date().toISOString(),
    };

    this.organizations.push(newOrg);
    this.workspaces.push(demoWs, prodWs);
    this.roles.push(...orgRoles);
    this.members.push(adminMember);

    this.currentOrgId = orgId;
    this.organization = newOrg;

    this.saveToStorage();

    const db = getFirebaseFirestore();
    if (db) {
      setDoc(doc(db, "organizations", orgId), newOrg, { merge: true }).catch(() => {});
      setDoc(doc(db, "organizations", orgId, "workspaces", demoWs.id), demoWs, { merge: true }).catch(() => {});
      setDoc(doc(db, "organizations", orgId, "workspaces", prodWs.id), prodWs, { merge: true }).catch(() => {});
      for (const r of orgRoles) {
        setDoc(doc(db, "organizations", orgId, "roles", r.id), r, { merge: true }).catch(() => {});
      }
      setDoc(doc(db, "organizations", orgId, "members", adminMember.userId), adminMember, { merge: true }).catch(() => {});
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("argus-org-changed", { detail: { orgId } }));
    }

    return {
      success: true,
      organization: newOrg,
      workspaces: [demoWs, prodWs],
      roles: orgRoles,
      member: adminMember,
    };
  }

  public getWorkspaces(orgId?: string): Workspace[] {
    const targetOrgId = orgId || this.organization.id;
    const scoped = this.workspaces.filter((w) => w.orgId === targetOrgId);
    return scoped.length > 0 ? scoped : this.workspaces;
  }

  public getWorkspace(workspaceId: string): Workspace | undefined {
    return this.workspaces.find((w) => w.id === workspaceId);
  }

  // 2. Roles & Permissions
  public getRoles(): OrganizationRole[] {
    return this.roles;
  }

  public getRole(roleId: string): OrganizationRole | undefined {
    return this.roles.find((r) => r.id === roleId);
  }

  public createCustomRole(
    adminUserId: string,
    roleData: { name: string; description: string; rank: number; permissions: string[] },
    adminEmail?: string
  ): OrganizationRole {
    const adminMember = this.getMemberByIdOrEmail(adminUserId, adminEmail);
    const adminRole = this.getRole(adminMember?.roleId || "");
    if (!adminRole || !adminRole.isAdmin) {
      throw new Error("Unauthorized: Only an Admin can create roles.");
    }

    if (roleData.name.toLowerCase() === "admin") {
      throw new Error("Invalid Role Name: 'Admin' is a reserved system role.");
    }

    // Custom roles cannot exceed rank 80
    const clampedRank = Math.min(Math.max(roleData.rank, 10), 80);

    const newRole: OrganizationRole = {
      id: `role-custom-${Date.now()}`,
      orgId: this.organization.id,
      name: roleData.name,
      description: roleData.description,
      isSystemReserved: false,
      isAdmin: false,
      rank: clampedRank,
      permissions: roleData.permissions,
    };

    this.roles.push(newRole);
    this.saveToStorage();
    return newRole;
  }

  // 3. Subscription & Invitations (Seat limit enforcement)
  public getSubscription() {
    return this.organization.subscription;
  }

  public getMembers(): OrganizationMember[] {
    return this.members;
  }

  public getInvitations(): UserInvitation[] {
    return this.invitations;
  }

  public inviteUser(
    adminUserId: string,
    email: string,
    roleId: string,
    adminEmail?: string
  ): { success: boolean; invitation?: UserInvitation; error?: string } {
    const adminMember = this.getMemberByIdOrEmail(adminUserId, adminEmail);
    const adminRole = this.getRole(adminMember?.roleId || "");
    if (!adminRole || !adminRole.isAdmin) {
      return { success: false, error: "Unauthorized: Only an Admin can send invitations." };
    }

    const { seatLimit, seatsAllocated } = this.organization.subscription;
    if (seatsAllocated >= seatLimit) {
      return {
        success: false,
        error: `Seat Limit Exceeded: Organization has reached its limit of ${seatLimit} seats. Upgrade subscription duration or seat count to invite more users.`,
      };
    }

    const targetRole = this.getRole(roleId);
    if (!targetRole) {
      return { success: false, error: "Invalid role specified for invitation." };
    }

    const newInvitation: UserInvitation = {
      id: `inv-${Date.now()}`,
      orgId: this.organization.id,
      email: email.trim().toLowerCase(),
      roleId,
      invitedByUserId: adminUserId,
      status: "pending",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14-day expiry
    };

    this.invitations.push(newInvitation);
    this.organization.subscription.seatsAllocated += 1;
    this.saveToStorage();

    const db = getFirebaseFirestore();
    if (db) {
      setDoc(doc(db, "organizations", this.organization.id, "invitations", newInvitation.id), newInvitation, { merge: true }).catch(() => {});
    }

    return { success: true, invitation: newInvitation };
  }

  public revokeInvitation(invitationId: string): boolean {
    const inv = this.invitations.find((i) => i.id === invitationId);
    if (inv && inv.status === "pending") {
      inv.status = "revoked";
      this.organization.subscription.seatsAllocated = Math.max(1, this.organization.subscription.seatsAllocated - 1);
      this.saveToStorage();
      const db = getFirebaseFirestore();
      if (db) {
        setDoc(doc(db, "organizations", this.organization.id, "invitations", invitationId), inv, { merge: true }).catch(() => {});
      }
      return true;
    }
    return false;
  }

  /**
   * Accepts and activates a pending invitation.
   * Converts the invitee into an Active Member with the assigned role,
   * transitioning the seat from Reserved to Occupied.
   */
  public acceptInvitation(
    invitationId: string,
    newUserId?: string,
    displayName?: string
  ): { success: boolean; member?: OrganizationMember; error?: string } {
    const inv = this.invitations.find((i) => i.id === invitationId);
    if (!inv) {
      return { success: false, error: "Invitation not found." };
    }

    if (inv.status !== "pending") {
      return { success: false, error: `Invitation is already ${inv.status}.` };
    }

    if (new Date(inv.expiresAt) < new Date()) {
      inv.status = "expired";
      this.saveToStorage();
      return { success: false, error: "Invitation has expired." };
    }

    // Mark invitation accepted
    inv.status = "accepted";

    // Switch active organization to the invited organization
    const targetOrgId = inv.orgId || this.organization.id;
    this.switchOrganization(targetOrgId);

    // Create Active Member
    const targetUserId = newUserId || `user-${Date.now()}`;
    const newMember: OrganizationMember = {
      userId: targetUserId,
      orgId: targetOrgId,
      email: inv.email,
      displayName: displayName || inv.email.split("@")[0],
      roleId: inv.roleId,
      status: "active",
      joinedAt: new Date().toISOString(),
    };

    // Remove existing member with same email in target org if present, then add
    this.members = this.members.filter(
      (m) => !(m.orgId === targetOrgId && m.email.toLowerCase() === inv.email.toLowerCase())
    );
    this.members.push(newMember);
    this.saveToStorage();

    const db = getFirebaseFirestore();
    if (db) {
      setDoc(doc(db, "organizations", targetOrgId, "invitations", inv.id), inv, { merge: true }).catch(() => {});
      setDoc(doc(db, "organizations", targetOrgId, "members", newMember.userId), newMember, { merge: true }).catch(() => {});
    }

    return { success: true, member: newMember };
  }

  // 4. Agents (Agent Studio & Cerberus Invariants)
  public getAgentsByWorkspace(workspaceId: string): WorkspaceAgent[] {
    return this.agents.filter((a) => a.workspaceId === workspaceId);
  }

  public getAgent(agentId: string): WorkspaceAgent | undefined {
    return this.agents.find((a) => a.id === agentId);
  }

  public createAgent(
    creatorUserId: string,
    workspaceId: string,
    agentInput: {
      name: string;
      roleId: string;
      category: "Developer" | "Designer" | "Partner" | "Marketing" | "Operations";
      model: string;
      policyId: string;
      targetFiles: string[];
      systemPrompt: string;
    }
  ): { success: boolean; agent?: WorkspaceAgent; error?: string } {
    const creatorMember = this.members.find((m) => m.userId === creatorUserId);
    const creatorRole = this.getRole(creatorMember?.roleId || "role-member") || SYSTEM_ROLES[2];
    const targetRole = this.getRole(agentInput.roleId);

    if (!targetRole) {
      return { success: false, error: "Selected role does not exist." };
    }

    // CERBERUS INVARIANT 1: Agent CANNOT be Admin, and Agent Rank <= Creator Rank
    const validation = validateAgentRoleAssignment(creatorRole, targetRole);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const ws = this.getWorkspace(workspaceId);
    if (!ws) {
      return { success: false, error: "Specified workspace does not exist." };
    }

    const ragSettings: CerberusRagSettings = {
      retrievalAllowed: true,
      targetFolderPrefix: `${ws.storagePrefix}derived/`,
      maxClearanceLevel: targetRole.rank > 50 ? "confidential" : "internal",
      enforceZeroLeakage: true,
    };

    const newAgent: WorkspaceAgent = {
      id: `agent-${Date.now()}`,
      orgId: this.organization.id,
      workspaceId,
      createdByUserId: creatorUserId,
      createdByEmail: creatorMember?.email || "user@hukurou.internal",
      name: agentInput.name,
      roleId: targetRole.id,
      roleName: targetRole.name,
      privilegeRank: targetRole.rank,
      category: agentInput.category,
      model: agentInput.model,
      policyId: agentInput.policyId,
      targetFiles: agentInput.targetFiles,
      systemPrompt: agentInput.systemPrompt,
      status: "active",
      ragSettings,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.agents.push(newAgent);
    this.saveToStorage();

    return { success: true, agent: newAgent };
  }

  /**
   * Quick transfer/promotion of an agent from Demo workspace to Production workspace.
   * Creates an auditable production instance while retaining provenance.
   */
  public transferAgentToWorkspace(
    agentId: string,
    sourceWorkspaceId: string,
    targetWorkspaceId: string,
    requestingUserId: string
  ): { success: boolean; transferredAgent?: WorkspaceAgent; error?: string } {
    const agent = this.getAgent(agentId);
    if (!agent) {
      return { success: false, error: "Agent not found." };
    }

    if (agent.workspaceId !== sourceWorkspaceId) {
      return { success: false, error: "Agent does not reside in the specified source workspace." };
    }

    const targetWs = this.getWorkspace(targetWorkspaceId);
    if (!targetWs) {
      return { success: false, error: "Target workspace does not exist." };
    }

    // Only the creator or an Admin can promote an agent
    const userMember = this.members.find((m) => m.userId === requestingUserId);
    const userRole = this.getRole(userMember?.roleId || "");
    const isAdmin = userRole?.isAdmin || false;
    const isCreator = agent.createdByUserId === requestingUserId;

    if (!isAdmin && !isCreator) {
      return {
        success: false,
        error: "Unauthorized: Only the agent creator or an Admin can transfer agents between workspaces.",
      };
    }

    // Create the promoted agent in the target workspace with updated RAG partition prefix
    const transferredAgent: WorkspaceAgent = {
      ...agent,
      id: `agent-prod-${Date.now()}`,
      workspaceId: targetWorkspaceId,
      transferredFromWorkspaceId: sourceWorkspaceId,
      ragSettings: {
        ...agent.ragSettings,
        targetFolderPrefix: `${targetWs.storagePrefix}derived/`,
      },
      updatedAt: new Date().toISOString(),
    };

    this.agents.push(transferredAgent);
    this.saveToStorage();

    return { success: true, transferredAgent };
  }

  // 5. Cerberus Runtime Gateway Execution
  public executeAgent(requestingUserId: string, agentId: string, input: string) {
    const agent = this.getAgent(agentId);
    if (!agent) {
      return {
        allowed: false,
        reason: "Agent not found.",
        timestamp: new Date().toISOString(),
      };
    }
    return authorizeAgentExecution(requestingUserId, agent);
  }

  public executeAgentToAgentQuery(
    callerAgentId: string,
    targetAgentId: string,
    message: string
  ) {
    const caller = this.getAgent(callerAgentId);
    const target = this.getAgent(targetAgentId);

    if (!caller || !target) {
      return {
        allowed: false,
        callerRank: 0,
        targetRank: 0,
        reason: "One or both agents could not be found.",
        timestamp: new Date().toISOString(),
      };
    }

    return authorizeAgentToAgentQuery(caller, target, message);
  }

  public testRagRetrieval(agentId: string, storagePath: string) {
    const agent = this.getAgent(agentId);
    if (!agent) {
      return { allowed: false, reason: "Agent not found." };
    }
    return authorizeRagRetrieval(agent, storagePath);
  }

  /**
   * Provisions HUKUROU organization and all corresponding hierarchy records to live Firestore
   * with jc@vem-studio.com as Admin.
   */
  public async provisionHukurouToFirestore(
    adminUserId: string = "user-admin-jc",
    adminEmail: string = "jc@vem-studio.com"
  ): Promise<{ success: boolean; organizationId: string; recordsCreated: number; error?: string }> {
    const db = getFirebaseFirestore();
    if (!db) {
      return {
        success: false,
        organizationId: this.organization.id,
        recordsCreated: 0,
        error: "Firestore client is not configured or unavailable in current environment.",
      };
    }

    const auth = getFirebaseAuth();
    if (auth && !auth.currentUser) {
      return {
        success: false,
        organizationId: this.organization.id,
        recordsCreated: 0,
        error: "Unauthenticated Session: You are currently in Demo Shell mode. Please visit /signin and click 'Sign in with Google' (using jc@vem-studio.com) to establish a live authenticated session with Firebase before provisioning to Firestore.",
      };
    }

    const effectiveUid = auth?.currentUser?.uid || adminUserId;
    const effectiveEmail = auth?.currentUser?.email || adminEmail;

    try {
      let count = 0;

      // 1. Organization top-level document
      await setDoc(doc(db, "organizations", this.organization.id), this.organization, { merge: true });
      count++;

      // 2. Default Workspaces: Demo-HUKUROU & HUKUROU
      for (const ws of this.workspaces) {
        await setDoc(doc(db, "organizations", this.organization.id, "workspaces", ws.id), ws, { merge: true });
        count++;
      }

      // 3. System Roles: Admin, SecurityAnalyst, Member, Viewer
      for (const r of this.roles) {
        await setDoc(doc(db, "organizations", this.organization.id, "roles", r.id), r, { merge: true });
        count++;
      }

      // 4. Admin Membership: jc@vem-studio.com
      const adminMember: OrganizationMember = {
        userId: effectiveUid,
        orgId: this.organization.id,
        email: effectiveEmail,
        displayName: "JC (Lead Admin)",
        roleId: "role-admin",
        status: "active",
        joinedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "organizations", this.organization.id, "members", effectiveUid), adminMember, { merge: true });
      count++;

      // 5. Default Workspace Agents
      for (const agent of this.agents) {
        await setDoc(
          doc(db, "organizations", this.organization.id, "workspaces", agent.workspaceId, "agents", agent.id),
          agent,
          { merge: true }
        );
        count++;
      }

      return {
        success: true,
        organizationId: this.organization.id,
        recordsCreated: count,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to write records to Firestore";
      return {
        success: false,
        organizationId: this.organization.id,
        recordsCreated: 0,
        error: message,
      };
    }
  }
}

export const orgService = new OrgService();

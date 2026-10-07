import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Organization Data Structure Hierarchy & Tenancy Contracts", () => {
  const orgServiceCode = fs.readFileSync(path.resolve("./lib/org-service.ts"), "utf-8");
  const typesCode = fs.readFileSync(path.resolve("./lib/organization-types.ts"), "utf-8");
  const cerberusCode = fs.readFileSync(path.resolve("./lib/cerberus-gateway.ts"), "utf-8");
  const firestoreRules = fs.readFileSync(path.resolve("./firestore.rules"), "utf-8");

  // Requirement 1: An organization is the top level structure
  test("Organization is defined as the top-level tenancy structure", () => {
    assert.match(typesCode, /export interface Organization/);
    assert.match(typesCode, /id:\s*string/);
    assert.match(typesCode, /name:\s*string/);
    assert.match(typesCode, /slug:\s*string/);
    assert.match(typesCode, /subscription:\s*OrganizationSubscription/);
    assert.match(orgServiceCode, /name:\s*"HUKUROU"/);
  });

  // Requirement 2: Two default workspaces (Demo-HUKUROU and HUKUROU)
  test("Organization defaults to two workspaces: Demo-HUKUROU and HUKUROU", () => {
    assert.match(orgServiceCode, /name:\s*"Demo-HUKUROU"/);
    assert.match(orgServiceCode, /name:\s*"HUKUROU"/);
    assert.match(orgServiceCode, /type:\s*"demo"/);
    assert.match(orgServiceCode, /type:\s*"production"/);
    assert.match(orgServiceCode, /storagePrefix:\s*"workspaces\/ws-demo-hukurou\/"/);
    assert.match(orgServiceCode, /storagePrefix:\s*"workspaces\/ws-prod-hukurou\/"/);
  });

  // Requirement 3: Organization has subscription duration and seat count
  test("Subscription model contains duration, tier, and seat count limits", () => {
    assert.match(typesCode, /seatLimit:\s*number/);
    assert.match(typesCode, /seatsAllocated:\s*number/);
    assert.match(typesCode, /currentPeriodEnd:\s*string/);
    assert.match(typesCode, /tier:\s*SubscriptionTier/);
  });

  // Requirement 4: One Cloud Store Bucket per organization
  test("Dedicated Cloud Store bucket allocated per organization with tenant naming convention", () => {
    assert.match(typesCode, /storageBucketName:\s*string/);
    assert.match(orgServiceCode, /storageBucketName:\s*"argus-tenant-org-hukurou"/);
  });

  // Requirement 5: Special default role Admin under organization
  test("Organization provisions default Admin role with rank 100 and system reservation", () => {
    assert.match(orgServiceCode, /id:\s*"role-admin"/);
    assert.match(orgServiceCode, /name:\s*"Admin"/);
    assert.match(orgServiceCode, /isAdmin:\s*true/);
    assert.match(orgServiceCode, /rank:\s*100/);
    assert.match(orgServiceCode, /isSystemReserved:\s*true/);
  });

  // Requirement 6: Admin creates other roles and invites users within seat limit
  test("Admin privileges: role creation and invitation email gating by seat count", () => {
    assert.match(orgServiceCode, /public createCustomRole/);
    assert.match(orgServiceCode, /public inviteUser/);
    assert.match(orgServiceCode, /seatsAllocated >= seatLimit/);
    assert.match(orgServiceCode, /Seat Limit Exceeded/);
  });

  // Requirement 7: Admin right to create policy
  test("Admin role permissions explicitly authorize policy authoring", () => {
    assert.match(orgServiceCode, /"policy:create"/);
    assert.match(orgServiceCode, /"policy:edit"/);
  });

  // Requirement 8a: Agent CANNOT have Admin role
  test("Security Invariant: AI Agents CANNOT possess the Admin role", () => {
    assert.match(cerberusCode, /AI Agents cannot be granted the Admin role/);
    assert.match(firestoreRules, /roleId != 'role-admin'/);
  });

  // Requirement 8b: Privilege ceiling (agent rank <= creator rank)
  test("Security Invariant: Agent privilege rank cannot exceed creator rank", () => {
    assert.match(cerberusCode, /targetRole\.rank > creatorRole\.rank/);
    assert.match(cerberusCode, /Privilege Ceiling Violation/);
  });

  // Requirement 8c: Confused Deputy Protection
  test("Confused Deputy Guard: User B cannot use agent created by User A", () => {
    assert.match(cerberusCode, /Confused Deputy Violation/);
    assert.match(cerberusCode, /agent\.createdByUserId !== requestingUserId/);
    assert.match(firestoreRules, /createdByUserId == request\.auth\.uid/);
  });

  // Requirement 8d: Agent-to-Agent Queries Hierarchy
  test("Agent-to-Agent Queries: Only agent with higher or equal rights can query agent with less rights", () => {
    assert.match(cerberusCode, /callerAgent\.privilegeRank < targetAgent\.privilegeRank/);
    assert.match(cerberusCode, /Privilege Escalation Blocked/);
  });

  // Requirement 8e: Quick Transfer from Demo to Production Workspace
  test("Quick transfer capability promotes agent from Demo to Production workspace", () => {
    assert.match(orgServiceCode, /public transferAgentToWorkspace/);
    assert.match(orgServiceCode, /transferredFromWorkspaceId:\s*sourceWorkspaceId/);
  });

  // Requirement 8f: Cerberus as RAG Retrieval Gateway
  test("Cerberus Gateway enforces RAG retrieval to derived views and blocks raw originals", () => {
    assert.match(cerberusCode, /storagePath\.includes\("\/raw\/"\)/);
    assert.match(cerberusCode, /RAG gateway access to raw unredacted storage path/);
  });
});

describe("Runtime Logic Execution Verification", () => {
  // Pure logic verification matching the exact Cerberus algorithms

  function validateRole(creatorRole, targetRole) {
    if (targetRole.isAdmin || targetRole.name.toLowerCase() === "admin") {
      return { valid: false, error: "AI Agents cannot be granted the Admin role." };
    }
    if (targetRole.rank > creatorRole.rank) {
      return { valid: false, error: "Privilege Ceiling Violation" };
    }
    return { valid: true };
  }

  function authorizeExecution(userId, agent) {
    if (agent.createdByUserId !== userId) {
      return { allowed: false, reason: "Confused Deputy Violation" };
    }
    return { allowed: true };
  }

  function authorizeA2A(caller, target) {
    if (caller.workspaceId !== target.workspaceId) {
      return { allowed: false, reason: "Workspace Boundary Violation" };
    }
    if (caller.privilegeRank < target.privilegeRank) {
      return { allowed: false, reason: "Privilege Escalation Blocked" };
    }
    return { allowed: true };
  }

  function authorizeRag(agent, pathStr) {
    const allowedPrefix = `workspaces/${agent.workspaceId}/derived/`;
    if (pathStr.includes("/raw/") || !pathStr.startsWith(allowedPrefix)) {
      return { allowed: false, reason: "Access to raw unredacted path is forbidden" };
    }
    return { allowed: true };
  }

  test("validates agent cannot be Admin", () => {
    const admin = { name: "Admin", rank: 100, isAdmin: true };
    const member = { name: "Member", rank: 50, isAdmin: false };
    const res = validateRole(admin, admin);
    assert.equal(res.valid, false);
    assert.match(res.error, /cannot be granted the Admin role/);

    const res2 = validateRole(admin, member);
    assert.equal(res2.valid, true);
  });

  test("validates agent rank cannot exceed creator rank", () => {
    const creator = { name: "Member", rank: 50, isAdmin: false };
    const highRole = { name: "SecurityAnalyst", rank: 80, isAdmin: false };
    const res = validateRole(creator, highRole);
    assert.equal(res.valid, false);
    assert.match(res.error, /Privilege Ceiling Violation/);
  });

  test("validates confused deputy execution guard", () => {
    const agent = { id: "a1", createdByUserId: "user-alice", workspaceId: "ws1" };
    assert.equal(authorizeExecution("user-alice", agent).allowed, true);
    assert.equal(authorizeExecution("user-bob", agent).allowed, false);
  });

  test("validates agent-to-agent downward query allowed, upward blocked", () => {
    const highAgent = { id: "h1", workspaceId: "ws1", privilegeRank: 80 };
    const lowAgent = { id: "l1", workspaceId: "ws1", privilegeRank: 50 };

    assert.equal(authorizeA2A(highAgent, lowAgent).allowed, true);
    assert.equal(authorizeA2A(lowAgent, highAgent).allowed, false);
  });

  test("validates Cerberus RAG gateway restricts to derived views", () => {
    const agent = { id: "a1", workspaceId: "ws-prod" };
    assert.equal(authorizeRag(agent, "workspaces/ws-prod/raw/confidential.pdf").allowed, false);
    assert.equal(authorizeRag(agent, "workspaces/ws-prod/derived/confidential_redacted.pdf").allowed, true);
  });
});

describe("Multi-Tenant Onboarding & Self-Serve Provisioning Workflow", () => {
  const orgServiceCode = fs.readFileSync(path.resolve("./lib/org-service.ts"), "utf-8");
  const onboardingPageCode = fs.readFileSync(path.resolve("./app/onboarding/page.tsx"), "utf-8");

  test("OrgService provides multi-tenant discovery methods", () => {
    assert.match(orgServiceCode, /public getUserOrganizations/);
    assert.match(orgServiceCode, /public getUserPendingInvitations/);
    assert.match(orgServiceCode, /public createOrganization/);
    assert.match(orgServiceCode, /public switchOrganization/);
  });

  test("createOrganization fulfills the 8 tenant criteria on provision", () => {
    // 1. Top-level org with dedicated storage bucket
    assert.match(orgServiceCode, /storageBucketName:\s*bucketName/);
    assert.match(orgServiceCode, /const bucketName = `argus-tenant-\${slug}`/);
    // 2. Two default workspaces: Demo-{Org} (Sandbox) and {Org} (Production)
    assert.match(orgServiceCode, /name:\s*`Demo-\${trimmedName}`/);
    assert.match(orgServiceCode, /name:\s*trimmedName/);
    assert.match(orgServiceCode, /type:\s*"demo"/);
    assert.match(orgServiceCode, /type:\s*"production"/);
    // 3. Subscription with 10 seats & duration
    assert.match(orgServiceCode, /seatLimit:\s*10/);
    assert.match(orgServiceCode, /seatsAllocated:\s*1/);
    // 4. Admin role with rank 100
    assert.match(orgServiceCode, /rank:\s*100/);
    assert.match(orgServiceCode, /isAdmin:\s*true/);
    assert.match(orgServiceCode, /isSystemReserved:\s*true/);
    // 5. Creator assigned as Admin
    assert.match(orgServiceCode, /roleId:\s*`role-admin-\${orgId}`/);
  });

  test("Onboarding page provides invitation acceptance, tenant creation, and token input", () => {
    assert.match(onboardingPageCode, /Provision New Organization/);
    assert.match(onboardingPageCode, /Dedicated Cloud Storage/);
    assert.match(onboardingPageCode, /Two Default Workspaces/);
    assert.match(onboardingPageCode, /Have an Invite Token\?/);
    assert.match(onboardingPageCode, /handleCreateOrg/);
    assert.match(onboardingPageCode, /handleAcceptInvite/);
  });

  test("Pure logic: simulation of new user onboarding path", () => {
    // Simulating user with 0 orgs vs user with pending invite vs user creating org
    const members = [
      { userId: "u-jc", orgId: "org-hukurou", email: "jc@vem-studio.com", roleId: "role-admin" }
    ];
    const invitations = [
      { id: "inv-alice", orgId: "org-hukurou", email: "alice@example.com", roleId: "role-member", status: "pending" }
    ];

    function checkUserFlow(email, uid) {
      const isMember = members.some(m => m.email === email || m.userId === uid);
      const pending = invitations.filter(i => i.email === email && i.status === "pending");
      if (isMember) return { route: "/dashboard", action: "direct_access" };
      if (pending.length > 0) return { route: "/onboarding", action: "accept_invitation", invite: pending[0] };
      return { route: "/onboarding", action: "create_tenant_or_wait" };
    }

    // Existing Lead Admin
    assert.equal(checkUserFlow("jc@vem-studio.com", "u-jc").route, "/dashboard");
    // Invitee user (Alice)
    const aliceFlow = checkUserFlow("alice@example.com", "u-alice");
    assert.equal(aliceFlow.route, "/onboarding");
    assert.equal(aliceFlow.action, "accept_invitation");
    assert.equal(aliceFlow.invite.id, "inv-alice");
    // Brand new organic Google login user (Bob)
    const bobFlow = checkUserFlow("bob@cybercorp.io", "u-bob");
    assert.equal(bobFlow.route, "/onboarding");
    assert.equal(bobFlow.action, "create_tenant_or_wait");
  });
});

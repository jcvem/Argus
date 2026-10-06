/**
 * Seed HUKUROU Organization and all hierarchy records to Firestore in GCP (argus-guardian).
 * 
 * Usage:
 * 1. Via Email/Password (if configured in Firebase Auth):
 *    node scripts/seed-firestore.mjs --email jc@vem-studio.com --password <password>
 * 
 * 2. Or using Google Cloud Access Token:
 *    ACCESS_TOKEN=$(gcloud auth print-access-token) node scripts/seed-firestore.mjs
 */

import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBPJgOfJk4gWRmMeEbJbLS1XQMIilzRmO8",
  authDomain: "argus-guardian.firebaseapp.com",
  projectId: "argus-guardian",
  storageBucket: "argus-guardian.firebasestorage.app",
  messagingSenderId: "774324846823",
  appId: "1:774324846823:web:d89a422f70969d4664a242",
};

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
const auth = getAuth(app);

// Data Records to Seed
const HUKUROU_ORG = {
  id: "org-hukurou",
  name: "HUKUROU",
  slug: "hukurou",
  storageBucketName: "argus-tenant-org-hukurou",
  subscription: {
    status: "active",
    tier: "enterprise",
    seatLimit: 10,
    seatsAllocated: 1,
    startDate: "2026-01-01T00:00:00Z",
    currentPeriodEnd: "2027-01-01T00:00:00Z",
    autoRenew: true,
  },
  defaultAdminRoleId: "role-admin",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: new Date().toISOString(),
};

const WORKSPACES = [
  {
    id: "ws-demo-hukurou",
    orgId: "org-hukurou",
    name: "Demo-HUKUROU",
    type: "demo",
    isDefault: true,
    storagePrefix: "workspaces/ws-demo-hukurou/",
    description: "Isolated sandbox environment for testing policies and prototyping AI agents with fixture data.",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: new Date().toISOString(),
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
    updatedAt: new Date().toISOString(),
  },
];

const ROLES = [
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
    permissions: ["policy:read", "policy:simulate", "audit:read", "agent:create", "document:read"],
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

const AGENTS = [
  {
    id: "agent-hermes",
    orgId: "org-hukurou",
    workspaceId: "ws-demo-hukurou",
    createdByUserId: "user-admin-jc",
    createdByEmail: "jc@vem-studio.com",
    name: "Hermes",
    roleId: "role-sec-analyst",
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
    updatedAt: new Date().toISOString(),
  },
  {
    id: "agent-ava",
    orgId: "org-hukurou",
    workspaceId: "ws-demo-hukurou",
    createdByUserId: "user-admin-jc",
    createdByEmail: "jc@vem-studio.com",
    name: "AVA",
    roleId: "role-member",
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
    updatedAt: new Date().toISOString(),
  },
  {
    id: "agent-atlas-prod",
    orgId: "org-hukurou",
    workspaceId: "ws-prod-hukurou",
    createdByUserId: "user-admin-jc",
    createdByEmail: "jc@vem-studio.com",
    name: "Atlas",
    roleId: "role-sec-analyst",
    roleName: "SecurityAnalyst",
    privilegeRank: 80,
    category: "Partner",
    model: "GPT-4o",
    policyId: "sales-quarterly",
    targetFiles: ["Sep_Sells.xls"],
    systemPrompt: "Synthesize balance statements under production vault rules.",
    status: "active",
    ragSettings: {
      retrievalAllowed: true,
      targetFolderPrefix: "workspaces/ws-prod-hukurou/derived/",
      maxClearanceLevel: "confidential",
      enforceZeroLeakage: true,
    },
    createdAt: "2026-09-20T00:00:00Z",
    updatedAt: new Date().toISOString(),
  },
];

async function seedRecords(adminUserId = "user-admin-jc", adminEmail = "jc@vem-studio.com") {
  console.log("==> Provisioning HUKUROU Organization to Firestore (argus-guardian)...");

  // 1. Organization
  await setDoc(doc(db, "organizations", HUKUROU_ORG.id), HUKUROU_ORG, { merge: true });
  console.log(`[OK] Organization document created: organizations/${HUKUROU_ORG.id}`);

  // 2. Workspaces
  for (const ws of WORKSPACES) {
    await setDoc(doc(db, "organizations", HUKUROU_ORG.id, "workspaces", ws.id), ws, { merge: true });
    console.log(`[OK] Workspace created: organizations/${HUKUROU_ORG.id}/workspaces/${ws.id}`);
  }

  // 3. Roles
  for (const r of ROLES) {
    await setDoc(doc(db, "organizations", HUKUROU_ORG.id, "roles", r.id), r, { merge: true });
    console.log(`[OK] Role created: organizations/${HUKUROU_ORG.id}/roles/${r.id} (${r.name}, Rank ${r.rank})`);
  }

  // 4. Admin Member
  const adminMember = {
    userId: adminUserId,
    orgId: HUKUROU_ORG.id,
    email: adminEmail,
    displayName: "JC (Lead Admin)",
    roleId: "role-admin",
    status: "active",
    joinedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, "organizations", HUKUROU_ORG.id, "members", adminUserId), adminMember, { merge: true });
  console.log(`[OK] Admin Member assigned: organizations/${HUKUROU_ORG.id}/members/${adminUserId} (${adminEmail})`);

  // 5. Default Agents
  for (const agent of AGENTS) {
    await setDoc(
      doc(db, "organizations", HUKUROU_ORG.id, "workspaces", agent.workspaceId, "agents", agent.id),
      agent,
      { merge: true }
    );
    console.log(`[OK] Agent created: ${agent.name} in workspace ${agent.workspaceId}`);
  }

  console.log("\n[SUCCESS] HUKUROU organization and all corresponding records provisioned successfully!");
}

async function main() {
  const args = process.argv.slice(2);
  const emailIdx = args.indexOf("--email");
  const passIdx = args.indexOf("--password");

  if (emailIdx !== -1 && passIdx !== -1) {
    const email = args[emailIdx + 1];
    const password = args[passIdx + 1];
    console.log(`[Auth] Signing in as ${email}...`);
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      console.log(`[Auth] Authenticated UID: ${userCred.user.uid}`);
      await seedRecords(userCred.user.uid, userCred.user.email);
      process.exit(0);
    } catch (err) {
      console.error("[Auth Error]", err.message);
      process.exit(1);
    }
  } else {
    // Attempting direct execution (relies on current session or open rules)
    try {
      await seedRecords("user-admin-jc", "jc@vem-studio.com");
      process.exit(0);
    } catch (err) {
      console.error("\n[Notice] Firestore direct write returned:", err.message);
      console.log(`
To authenticate the provisioning script:
1. Provide credentials:
   node scripts/seed-firestore.mjs --email jc@vem-studio.com --password <your-password>

2. Or open http://localhost:3000/dashboard in your browser, sign in with Google (jc@vem-studio.com),
   and click 'Provision HUKUROU to Firestore' on the Provisioning Card.
      `);
      process.exit(1);
    }
  }
}

main();

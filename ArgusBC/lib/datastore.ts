import { DemoDocumentRecord, DocumentSafetyState } from "./types";
import { DEMO_DOCUMENTS } from "./api";

export interface GoogleDriveConsentedArea {
  id: string;
  name: string;
  path: string;
  fileCount: number;
  grantScope: string;
  lastSyncTime: string;
}

export interface GoogleDriveConsentedItem {
  id: string;
  name: string;
  folderPath: string;
  fileType: "pdf" | "docx" | "csv" | "xlsx";
  size: string;
  lastModified: string;
  consentScope: string;
  enclaveSyncStatus: "synced" | "pending" | "syncing";
  driveFileId: string;
  sourceSha256: string;
  targetCloudPath: string;
  demoDocRef?: DemoDocumentRecord;
}

export interface WorkspaceImmutableFile {
  id: string;
  path: string;
  filename: string;
  fileType: "pdf" | "docx" | "csv" | "xlsx";
  sourceSha256: string;
  size: string;
  uploadedAt: string;
  retentionLocked: boolean;
  retentionHoldUntil: string;
  safetyState: DocumentSafetyState;
  safetyExplanation: string;
  demoDocRef: DemoDocumentRecord;
}

export interface WorkspaceDatastoreBucket {
  workspaceId: string;
  datastoreDocPath: string;
  bucketName: string;
  bucketUri: string;
  region: string;
  storageClass: string;
  kmsKeyName: string;
  lastSyncedAt: string;
  syncedFromDatastore: boolean;
  totalFiles: number;
  totalSizeBytes: string;
  files: WorkspaceImmutableFile[];
}

export interface RoleGuardedFile {
  id: string;
  filename: string;
  guardedKey: string;
  originalSha256: string;
  guardedSha256: string;
  originalSize: string;
  guardedSize: string;
  appliedAction: string;
  redactionMetrics: string;
  verificationStatus: "VERIFIED_ZERO_LEAKAGE" | "COMPLIANT";
  demoDocRef: DemoDocumentRecord;
}

export interface RoleCloudBucketView {
  roleId: "Developer" | "Designer" | "Partner" | "Marketing";
  roleLabel: string;
  roleColor: string;
  roleBgBadge: string;
  bucketUri: string;
  boundPolicyId: string;
  policyName: string;
  isolationGuarantee: string;
  transformSummary: string;
  totalGuardedFiles: number;
  entitiesRedactedCount: number;
  zeroLeakagePassed: boolean;
  lastRecompiled: string;
  guardedFiles: RoleGuardedFile[];
}

export const GOOGLE_DRIVE_CONSENTED_AREAS: GoogleDriveConsentedArea[] = [
  {
    id: "gdrive-ops",
    name: "Operations & Financials",
    path: "/Shared Drives/Argus Corp/Operations & Financials",
    fileCount: 4,
    grantScope: "drive.readonly.selected",
    lastSyncTime: "12 mins ago",
  },
  {
    id: "gdrive-eng",
    name: "Engineering & Architecture",
    path: "/Shared Drives/Argus Corp/Engineering & Architecture",
    fileCount: 5,
    grantScope: "drive.readonly.selected",
    lastSyncTime: "24 mins ago",
  },
  {
    id: "gdrive-gov",
    name: "Executive & Governance",
    path: "/Shared Drives/Argus Corp/Executive & Governance",
    fileCount: 3,
    grantScope: "drive.readonly.selected",
    lastSyncTime: "1 hour ago",
  },
  {
    id: "gdrive-mkt",
    name: "Marketing & Campaigns",
    path: "/Shared Drives/Argus Corp/Marketing & Campaigns",
    fileCount: 3,
    grantScope: "drive.readonly.selected",
    lastSyncTime: "2 hours ago",
  },
];

export const GOOGLE_DRIVE_CONSENTED_ITEMS: GoogleDriveConsentedItem[] = [
  {
    id: "gitem-1",
    name: "sample_executive_payroll_2026.pdf",
    folderPath: "/Operations & Financials",
    fileType: "pdf",
    size: "4.8 MB",
    lastModified: "2026-10-04 10:14 UTC",
    consentScope: "Explicit Enclave Consent Granted",
    enclaveSyncStatus: "synced",
    driveFileId: "1Z4pQe98Klm0...9vY",
    sourceSha256: DEMO_DOCUMENTS[0].source_sha256,
    targetCloudPath: "raw/2026/10/sample_executive_payroll_2026.pdf",
    demoDocRef: DEMO_DOCUMENTS[0],
  },
  {
    id: "gitem-2",
    name: "legacy_acquisition_nda_scanned.pdf",
    folderPath: "/Executive & Governance",
    fileType: "pdf",
    size: "1.2 MB",
    lastModified: "2026-10-04 09:45 UTC",
    consentScope: "Explicit Enclave Consent Granted",
    enclaveSyncStatus: "synced",
    driveFileId: "1Y7tXm34Wab2...4kL",
    sourceSha256: DEMO_DOCUMENTS[1].source_sha256,
    targetCloudPath: "raw/2026/10/legacy_acquisition_nda_scanned.pdf",
    demoDocRef: DEMO_DOCUMENTS[1],
  },
  {
    id: "gitem-3",
    name: "q3_field_performance_audit.docx",
    folderPath: "/Engineering & Architecture",
    fileType: "docx",
    size: "820 KB",
    lastModified: "2026-10-04 08:30 UTC",
    consentScope: "Explicit Enclave Consent Granted",
    enclaveSyncStatus: "synced",
    driveFileId: "1B9aVc67Zop8...1qP",
    sourceSha256: DEMO_DOCUMENTS[2].source_sha256,
    targetCloudPath: "raw/2026/10/q3_field_performance_audit.docx",
    demoDocRef: DEMO_DOCUMENTS[2],
  },
  {
    id: "gitem-4",
    name: "infrastructure_vpc_peering_spec.docx",
    folderPath: "/Engineering & Architecture",
    fileType: "docx",
    size: "1.4 MB",
    lastModified: "2026-10-04 07:15 UTC",
    consentScope: "Explicit Enclave Consent Granted",
    enclaveSyncStatus: "pending",
    driveFileId: "1M2kLo99Uyt5...8wE",
    sourceSha256: "c18a994ef00b52d9b23114529f7cf471169a9bba14502d6b3cb9118e9a117032",
    targetCloudPath: "raw/2026/10/infrastructure_vpc_peering_spec.docx",
    demoDocRef: {
      ...DEMO_DOCUMENTS[2],
      filename: "infrastructure_vpc_peering_spec.docx",
      source_sha256: "c18a994ef00b52d9b23114529f7cf471169a9bba14502d6b3cb9118e9a117032",
      safety_state: "ready",
      safety_explanation: "Normalized document parsed; awaits policy evaluation.",
    },
  },
  {
    id: "gitem-5",
    name: "q4_partner_tiering_framework.pdf",
    folderPath: "/Marketing & Campaigns",
    fileType: "pdf",
    size: "3.1 MB",
    lastModified: "2026-10-03 16:50 UTC",
    consentScope: "Explicit Enclave Consent Granted",
    enclaveSyncStatus: "synced",
    driveFileId: "1K8oPq22Zxc4...7rT",
    sourceSha256: "74bf9121ec78b0d2354c00492ec844b20a321db8e7044f56fca55490bc1e9411",
    targetCloudPath: "raw/2026/10/q4_partner_tiering_framework.pdf",
    demoDocRef: DEMO_DOCUMENTS[0],
  },
];

export function getWorkspaceDatastoreBucket(workspaceId: string): WorkspaceDatastoreBucket {
  switch (workspaceId) {
    case "redactcore-local":
      return {
        workspaceId: "redactcore-local",
        datastoreDocPath: "/workspaces/redactcore-local/buckets/immutable-source",
        bucketName: "redactcore-local-daemon",
        bucketUri: "gs://redactcore-local-daemon/source",
        region: "local-daemon (127.0.0.1:8000)",
        storageClass: "LOCAL_EMULATED · WORM Enforced",
        kmsKeyName: "local-dev-keys/software-aes256",
        lastSyncedAt: "3 mins ago",
        syncedFromDatastore: true,
        totalFiles: 3,
        totalSizeBytes: "6.8 MB",
        files: [
          {
            id: "rc-file-1",
            path: "source/sample_executive_payroll_2026.pdf",
            filename: "sample_executive_payroll_2026.pdf",
            fileType: "pdf",
            sourceSha256: DEMO_DOCUMENTS[0].source_sha256,
            size: "4.8 MB",
            uploadedAt: "2026-10-04 10:14 UTC",
            retentionLocked: true,
            retentionHoldUntil: "2033-10-04 (7yr WORM)",
            safetyState: DEMO_DOCUMENTS[0].safety_state,
            safetyExplanation: DEMO_DOCUMENTS[0].safety_explanation,
            demoDocRef: DEMO_DOCUMENTS[0],
          },
          {
            id: "rc-file-2",
            path: "source/legacy_acquisition_nda_scanned.pdf",
            filename: "legacy_acquisition_nda_scanned.pdf",
            fileType: "pdf",
            sourceSha256: DEMO_DOCUMENTS[1].source_sha256,
            size: "1.2 MB",
            uploadedAt: "2026-10-04 09:45 UTC",
            retentionLocked: true,
            retentionHoldUntil: "2033-10-04 (7yr WORM)",
            safetyState: DEMO_DOCUMENTS[1].safety_state,
            safetyExplanation: DEMO_DOCUMENTS[1].safety_explanation,
            demoDocRef: DEMO_DOCUMENTS[1],
          },
          {
            id: "rc-file-3",
            path: "source/q3_field_performance_audit.docx",
            filename: "q3_field_performance_audit.docx",
            fileType: "docx",
            sourceSha256: DEMO_DOCUMENTS[2].source_sha256,
            size: "820 KB",
            uploadedAt: "2026-10-04 08:30 UTC",
            retentionLocked: true,
            retentionHoldUntil: "2033-10-04 (7yr WORM)",
            safetyState: DEMO_DOCUMENTS[2].safety_state,
            safetyExplanation: DEMO_DOCUMENTS[2].safety_explanation,
            demoDocRef: DEMO_DOCUMENTS[2],
          },
        ],
      };

    case "enterprise-vault":
      return {
        workspaceId: "enterprise-vault",
        datastoreDocPath: "/workspaces/enterprise-vault/buckets/immutable-source",
        bucketName: "argus-enterprise-enclave-vault",
        bucketUri: "gs://argus-enterprise-enclave-vault/raw",
        region: "us-east4 (Ashburn Enclave)",
        storageClass: "STANDARD / REGIONAL · Hardware WORM",
        kmsKeyName: "projects/argus-sec/locations/us-east4/keyRings/hsm/cryptoKeys/vault-master",
        lastSyncedAt: "1 min ago",
        syncedFromDatastore: true,
        totalFiles: 4,
        totalSizeBytes: "10.2 MB",
        files: [
          {
            id: "ev-file-1",
            path: "raw/2026/10/sample_executive_payroll_2026.pdf",
            filename: "sample_executive_payroll_2026.pdf",
            fileType: "pdf",
            sourceSha256: DEMO_DOCUMENTS[0].source_sha256,
            size: "4.8 MB",
            uploadedAt: "2026-10-04 10:14 UTC",
            retentionLocked: true,
            retentionHoldUntil: "2036-10-04 (10yr WORM)",
            safetyState: DEMO_DOCUMENTS[0].safety_state,
            safetyExplanation: DEMO_DOCUMENTS[0].safety_explanation,
            demoDocRef: DEMO_DOCUMENTS[0],
          },
          {
            id: "ev-file-2",
            path: "raw/2026/10/q3_field_performance_audit.docx",
            filename: "q3_field_performance_audit.docx",
            fileType: "docx",
            sourceSha256: DEMO_DOCUMENTS[2].source_sha256,
            size: "820 KB",
            uploadedAt: "2026-10-04 08:30 UTC",
            retentionLocked: true,
            retentionHoldUntil: "2036-10-04 (10yr WORM)",
            safetyState: DEMO_DOCUMENTS[2].safety_state,
            safetyExplanation: DEMO_DOCUMENTS[2].safety_explanation,
            demoDocRef: DEMO_DOCUMENTS[2],
          },
          {
            id: "ev-file-3",
            path: "raw/2026/10/q4_partner_tiering_framework.pdf",
            filename: "q4_partner_tiering_framework.pdf",
            fileType: "pdf",
            sourceSha256: "74bf9121ec78b0d2354c00492ec844b20a321db8e7044f56fca55490bc1e9411",
            size: "3.1 MB",
            uploadedAt: "2026-10-03 16:50 UTC",
            retentionLocked: true,
            retentionHoldUntil: "2036-10-04 (10yr WORM)",
            safetyState: "ready",
            safetyExplanation: "Enterprise enclave verified. Byte integrity validated against GCS object lock.",
            demoDocRef: DEMO_DOCUMENTS[0],
          },
          {
            id: "ev-file-4",
            path: "raw/2026/10/infrastructure_vpc_peering_spec.docx",
            filename: "infrastructure_vpc_peering_spec.docx",
            fileType: "docx",
            sourceSha256: "c18a994ef00b52d9b23114529f7cf471169a9bba14502d6b3cb9118e9a117032",
            size: "1.4 MB",
            uploadedAt: "2026-10-04 07:15 UTC",
            retentionLocked: true,
            retentionHoldUntil: "2036-10-04 (10yr WORM)",
            safetyState: "verified",
            safetyExplanation: "Zero leakage verified on VPC peering network architecture specs.",
            demoDocRef: DEMO_DOCUMENTS[2],
          },
        ],
      };

    case "argus-core":
    default:
      return {
        workspaceId: workspaceId || "argus-core",
        datastoreDocPath: `/workspaces/${workspaceId || "argus-core"}/buckets/immutable-source`,
        bucketName: "argus-tenant-org-hukurou",
        bucketUri: "gs://argus-tenant-org-hukurou/originals",
        region: "asia-east1 (Taiwan Enclave · argus-guardian)",
        storageClass: "STANDARD / REGIONAL · Object Retention WORM Enforced",
        kmsKeyName: "projects/argus-guardian/locations/asia-east1/keyRings/enclave/cryptoKeys/tenant-hukurou",
        lastSyncedAt: "Just now",
        syncedFromDatastore: true,
        totalFiles: 4,
        totalSizeBytes: "9.9 MB",
        files: [
          {
            id: "core-file-1",
            path: "originals/sample_executive_payroll_2026.pdf",
            filename: "sample_executive_payroll_2026.pdf",
            fileType: "pdf",
            sourceSha256: DEMO_DOCUMENTS[0].source_sha256,
            size: "4.8 MB",
            uploadedAt: "2026-10-17 10:14 UTC",
            retentionLocked: true,
            retentionHoldUntil: "2027-10-17 (365d WORM Compliance)",
            safetyState: DEMO_DOCUMENTS[0].safety_state,
            safetyExplanation: DEMO_DOCUMENTS[0].safety_explanation,
            demoDocRef: DEMO_DOCUMENTS[0],
          },
          {
            id: "core-file-2",
            path: "originals/legacy_acquisition_nda_scanned.pdf",
            filename: "legacy_acquisition_nda_scanned.pdf",
            fileType: "pdf",
            sourceSha256: DEMO_DOCUMENTS[1].source_sha256,
            size: "1.2 MB",
            uploadedAt: "2026-10-17 09:45 UTC",
            retentionLocked: true,
            retentionHoldUntil: "2027-10-17 (365d WORM Compliance)",
            safetyState: DEMO_DOCUMENTS[1].safety_state,
            safetyExplanation: DEMO_DOCUMENTS[1].safety_explanation,
            demoDocRef: DEMO_DOCUMENTS[1],
          },
          {
            id: "core-file-3",
            path: "originals/q3_field_performance_audit.docx",
            filename: "q3_field_performance_audit.docx",
            fileType: "docx",
            sourceSha256: DEMO_DOCUMENTS[2].source_sha256,
            size: "820 KB",
            uploadedAt: "2026-10-17 08:30 UTC",
            retentionLocked: true,
            retentionHoldUntil: "2027-10-17 (365d WORM Compliance)",
            safetyState: DEMO_DOCUMENTS[2].safety_state,
            safetyExplanation: DEMO_DOCUMENTS[2].safety_explanation,
            demoDocRef: DEMO_DOCUMENTS[2],
          },
          {
            id: "core-file-4",
            path: "originals/q4_partner_tiering_framework.pdf",
            filename: "q4_partner_tiering_framework.pdf",
            fileType: "pdf",
            sourceSha256: "74bf9121ec78b0d2354c00492ec844b20a321db8e7044f56fca55490bc1e9411",
            size: "3.1 MB",
            uploadedAt: "2026-10-17 06:50 UTC",
            retentionLocked: true,
            retentionHoldUntil: "2027-10-17 (365d WORM Compliance)",
            safetyState: "ready",
            safetyExplanation: "Original document stored byte-intact under SHA-256 digest in WORM enclave.",
            demoDocRef: DEMO_DOCUMENTS[0],
          },
        ],
      };
  }
}

export const ROLE_BUCKET_VIEWS: Record<
  "Developer" | "Designer" | "Partner" | "Marketing",
  RoleCloudBucketView
> = {
  Developer: {
    roleId: "Developer",
    roleLabel: "Developer",
    roleColor: "bg-[#10b981]",
    roleBgBadge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    bucketUri: "gs://argus-tenant-org-hukurou/views/role_developer/",
    boundPolicyId: "engineering-internal-strict",
    policyName: "Engineering Internal Strict Access",
    isolationGuarantee: "Restricted to Developer IAM credentials with mTLS enclave attestation",
    transformSummary: "API keys masked, employee PII pseudonymized with salted HMAC, internal IP CIDRs retained.",
    totalGuardedFiles: 3,
    entitiesRedactedCount: 22,
    zeroLeakagePassed: true,
    lastRecompiled: "4 mins ago",
    guardedFiles: [
      {
        id: "dev-view-1",
        filename: "sample_executive_payroll_2026.developer.pdf",
        guardedKey: "views/role_developer/sample_executive_payroll_2026.developer.pdf",
        originalSha256: DEMO_DOCUMENTS[0].source_sha256,
        guardedSha256: "03074ef14ac95387375e6541227355802d48fb302b519b0eee83564aee4b8b96",
        originalSize: "4.8 MB",
        guardedSize: "4.6 MB",
        appliedAction: "14 entities masked: Compensation masked with [SALARY_REDACTED], Staff IDs masked with [ID_REDACTED]",
        redactionMetrics: "14 entities masked · 0 leaks detected",
        verificationStatus: "VERIFIED_ZERO_LEAKAGE",
        demoDocRef: DEMO_DOCUMENTS[0],
      },
      {
        id: "dev-view-2",
        filename: "q3_field_performance_audit.developer.docx",
        guardedKey: "views/role_developer/q3_field_performance_audit.developer.docx",
        originalSha256: DEMO_DOCUMENTS[2].source_sha256,
        guardedSha256: "614be7721a990dbb9911e3b204128f4410aa6712398bb1eec4098aa908b1a233",
        originalSize: "820 KB",
        guardedSize: "804 KB",
        appliedAction: "Emails and personal phone numbers pseudonymized; technical specs and trace logs intact",
        redactionMetrics: "8 entities pseudonymized · verified byte structure",
        verificationStatus: "VERIFIED_ZERO_LEAKAGE",
        demoDocRef: DEMO_DOCUMENTS[2],
      },
      {
        id: "dev-view-3",
        filename: "infrastructure_vpc_peering_spec.developer.docx",
        guardedKey: "views/role_developer/infrastructure_vpc_peering_spec.developer.docx",
        originalSha256: "c18a994ef00b52d9b23114529f7cf471169a9bba14502d6b3cb9118e9a117032",
        guardedSha256: "a310bb4e921c56889410efca22198beea4410901235bb71109440ac198ba2904",
        originalSize: "1.4 MB",
        guardedSize: "1.38 MB",
        appliedAction: "AWS/GCP production secrets redacted; internal staging endpoints allowed",
        redactionMetrics: "6 secret keys redacted · verified byte structure",
        verificationStatus: "VERIFIED_ZERO_LEAKAGE",
        demoDocRef: DEMO_DOCUMENTS[2],
      },
    ],
  },
  Designer: {
    roleId: "Designer",
    roleLabel: "Designer",
    roleColor: "bg-[#f59e0b]",
    roleBgBadge: "bg-amber-50 text-amber-800 border-amber-200",
    bucketUri: "gs://argus-tenant-org-hukurou/views/role_designer/",
    boundPolicyId: "creative-partner-minimal",
    policyName: "Creative UI / Layout Inspection View",
    isolationGuarantee: "Restricted to Product & Design IAM group; visual geometry preserved without PII",
    transformSummary: "Financial balances and compensation stripped, raster images watermarked, bounding boxes and vector typography intact.",
    totalGuardedFiles: 2,
    entitiesRedactedCount: 16,
    zeroLeakagePassed: true,
    lastRecompiled: "18 mins ago",
    guardedFiles: [
      {
        id: "des-view-1",
        filename: "sample_executive_payroll_2026.designer.pdf",
        guardedKey: "views/role_designer/sample_executive_payroll_2026.designer.pdf",
        originalSha256: DEMO_DOCUMENTS[0].source_sha256,
        guardedSha256: "a02b7b3aca4dedc0e8e762c132c240b0fbf631ff4060851f4b2859fca99e2fc2",
        originalSize: "4.8 MB",
        guardedSize: "4.5 MB",
        appliedAction: "Tables preserved with placeholder glyphs; employee names replaced with layout dummy labels",
        redactionMetrics: "14 entities sanitized · geometry preserved",
        verificationStatus: "VERIFIED_ZERO_LEAKAGE",
        demoDocRef: DEMO_DOCUMENTS[0],
      },
      {
        id: "des-view-2",
        filename: "q3_field_performance_audit.designer.docx",
        guardedKey: "views/role_designer/q3_field_performance_audit.designer.docx",
        originalSha256: DEMO_DOCUMENTS[2].source_sha256,
        guardedSha256: "9c4021bb450e18820019faec9011703b4198cbb1054128eebca44091a18bc002",
        originalSize: "820 KB",
        guardedSize: "812 KB",
        appliedAction: "Typography and visual layouts verified; contact information stripped",
        redactionMetrics: "8 entities sanitized · 0 leaks",
        verificationStatus: "VERIFIED_ZERO_LEAKAGE",
        demoDocRef: DEMO_DOCUMENTS[2],
      },
    ],
  },
  Partner: {
    roleId: "Partner",
    roleLabel: "Partner",
    roleColor: "bg-[#ec4899]",
    roleBgBadge: "bg-pink-50 text-pink-800 border-pink-200",
    bucketUri: "gs://argus-tenant-org-hukurou/views/role_partner/",
    boundPolicyId: "thirdparty-vendor-restricted",
    policyName: "Third-Party External Partner Boundary",
    isolationGuarantee: "Strict external federation; time-limited presigned tokens; full confidential entity blackout",
    transformSummary: "Complete PII blackout, proprietary engineering architecture stripped, contractual rate sheets masked.",
    totalGuardedFiles: 2,
    entitiesRedactedCount: 26,
    zeroLeakagePassed: true,
    lastRecompiled: "32 mins ago",
    guardedFiles: [
      {
        id: "prt-view-1",
        filename: "sample_executive_payroll_2026.partner.pdf",
        guardedKey: "views/role_partner/sample_executive_payroll_2026.partner.pdf",
        originalSha256: DEMO_DOCUMENTS[0].source_sha256,
        guardedSha256: "81ddfe29a4046867cce209943869461340dcf145783641a6a64c657a96db8860",
        originalSize: "4.8 MB",
        guardedSize: "4.4 MB",
        appliedAction: "Full blackout redaction: Compensation, executive names, and internal project identifiers",
        redactionMetrics: "14 entities blacked out · zero-retention export",
        verificationStatus: "VERIFIED_ZERO_LEAKAGE",
        demoDocRef: DEMO_DOCUMENTS[0],
      },
      {
        id: "prt-view-2",
        filename: "q3_field_performance_audit.partner.docx",
        guardedKey: "views/role_partner/q3_field_performance_audit.partner.docx",
        originalSha256: DEMO_DOCUMENTS[2].source_sha256,
        guardedSha256: "8e7104b2c019a820011ec591bba0410712bb94410a88019fecca3410bb4190ee",
        originalSize: "820 KB",
        guardedSize: "790 KB",
        appliedAction: "Customer identifying emails and phones replaced with synthetic vendor placeholders",
        redactionMetrics: "12 entities sanitized · partner boundary enforced",
        verificationStatus: "VERIFIED_ZERO_LEAKAGE",
        demoDocRef: DEMO_DOCUMENTS[2],
      },
    ],
  },
  Marketing: {
    roleId: "Marketing",
    roleLabel: "Marketing",
    roleColor: "bg-[#3b82f6]",
    roleBgBadge: "bg-blue-50 text-blue-800 border-blue-200",
    bucketUri: "gs://argus-tenant-org-hukurou/views/role_marketing/",
    boundPolicyId: "public-relations-safe",
    policyName: "Public Relations & Marketing Safe Release",
    isolationGuarantee: "Public domain clearance; guaranteed free of confidential IP, internal salaries, and customer PII",
    transformSummary: "Financial figures aggregated to broad percentiles, individual employee names removed, high-level summaries only.",
    totalGuardedFiles: 2,
    entitiesRedactedCount: 18,
    zeroLeakagePassed: true,
    lastRecompiled: "45 mins ago",
    guardedFiles: [
      {
        id: "mkt-view-1",
        filename: "sample_executive_payroll_2026.marketing.pdf",
        guardedKey: "views/role_marketing/sample_executive_payroll_2026.marketing.pdf",
        originalSha256: DEMO_DOCUMENTS[0].source_sha256,
        guardedSha256: "9f99141c83062829096f7c97a7ed3f7e522abb31f4dfa79da7179cff70f7427d",
        originalSize: "4.8 MB",
        guardedSize: "4.5 MB",
        appliedAction: "Specific compensation amounts replaced with industry benchmarks; personal names redacted",
        redactionMetrics: "14 entities transformed · marketing-safe release",
        verificationStatus: "VERIFIED_ZERO_LEAKAGE",
        demoDocRef: DEMO_DOCUMENTS[0],
      },
      {
        id: "mkt-view-2",
        filename: "q3_field_performance_audit.marketing.docx",
        guardedKey: "views/role_marketing/q3_field_performance_audit.marketing.docx",
        originalSha256: DEMO_DOCUMENTS[2].source_sha256,
        guardedSha256: "721a990dbb9911e3b204128f4410aa6712398bb1eec4098aa908b1a233614be7",
        originalSize: "820 KB",
        guardedSize: "798 KB",
        appliedAction: "Performance metrics normalized to cohort medians; confidential customer quotes anonymized",
        redactionMetrics: "8 entities anonymized · 0 leaks",
        verificationStatus: "VERIFIED_ZERO_LEAKAGE",
        demoDocRef: DEMO_DOCUMENTS[2],
      },
    ],
  },
};

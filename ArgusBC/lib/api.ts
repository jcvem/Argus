import {
  HealthResponse,
  RedactionPolicy,
  PolicySummary,
  DemoSubject,
  DemoDocumentRecord,
  EntityFindingSummary,
  AristotleDraftResponse,
} from "./types";

const REDACTCORE_BASE_URL =
  process.env.NEXT_PUBLIC_REDACTCORE_API_URL?.trim() || "http://localhost:8000";

const ARISTOTLE_BASE_URL =
  process.env.NEXT_PUBLIC_ARISTOTLE_API_URL?.trim() ||
  "https://aristotle-api-774324846823.asia-east1.run.app";

/**
 * Pre-loaded canonical policies matching RedactCore/policies/*.yaml
 * Used as honest local fallback when the FastAPI backend is not connected.
 */
export const LOCAL_POLICIES: RedactionPolicy[] = [
  {
    policy_id: "engineering-internal-strict",
    name: "Engineering Internal Strict Access",
    version: "1.0.0",
    description:
      "Restricted to Developer role. Redacts executive compensation and employee IDs; masks emails and contact data; retains internal technical IP and endpoints.",
    default_action: "allow",
    require_figure_review: true,
    rules: [
      {
        entity_type: "SALARY",
        action: "redact",
        replacement: "[SALARY REDACTED]",
        description: "Compensation and payroll data is confidential",
      },
      {
        entity_type: "EMPLOYEE_ID",
        action: "redact",
        replacement: "[ID REDACTED]",
        description: "Internal staff IDs are hidden",
      },
      {
        entity_type: "PHONE_NUMBER",
        action: "redact",
        replacement: "[PHONE REDACTED]",
        description: "Personal contact numbers redacted",
      },
      {
        entity_type: "EMAIL_ADDRESS",
        action: "mask",
        mask_char: "*",
        description: "Personal email addresses masked",
      },
      {
        entity_type: "PASSWORD",
        action: "redact",
        replacement: "[PASSWORD REDACTED]",
        description: "Passwords and login credentials strictly prohibited",
      },
      {
        entity_type: "SECRET_KEY",
        action: "redact",
        replacement: "[SECRET REDACTED]",
        description: "Production keys and cloud secrets redacted",
      },
      {
        entity_type: "API_KEY",
        action: "redact",
        replacement: "[API KEY REDACTED]",
        description: "API keys redacted",
      },
    ],
  },
  {
    policy_id: "creative-partner-minimal",
    name: "Creative UI / Layout Inspection View",
    version: "1.0.0",
    description:
      "Designer role policy. Preserves visual typography, document geometry, and table structure while replacing names with layout labels and stripping compensation.",
    default_action: "allow",
    require_figure_review: false,
    rules: [
      {
        entity_type: "SALARY",
        action: "redact",
        replacement: "[COMPENSATION REDACTED]",
        description: "Financial balances and compensation stripped",
      },
      {
        entity_type: "EMPLOYEE_ID",
        action: "redact",
        replacement: "[EMP-ID-PREVIEW]",
        description: "Staff identifiers sanitized for layout preview",
      },
      {
        entity_type: "PERSON",
        action: "replace",
        replacement: "[DESIGN SAMPLE NAME]",
        description: "Employee names replaced with layout dummy labels",
      },
      {
        entity_type: "PHONE_NUMBER",
        action: "redact",
        replacement: "[PHONE REDACTED]",
        description: "Direct contact numbers stripped",
      },
      {
        entity_type: "EMAIL_ADDRESS",
        action: "mask",
        mask_char: "*",
        description: "Email addresses masked",
      },
      {
        entity_type: "PASSWORD",
        action: "redact",
        replacement: "[CREDENTIAL REDACTED]",
        description: "Sensitive credentials removed",
      },
      {
        entity_type: "SECRET_KEY",
        action: "redact",
        replacement: "[SECRET REDACTED]",
        description: "Secrets removed",
      },
      {
        entity_type: "API_KEY",
        action: "redact",
        replacement: "[API KEY REDACTED]",
        description: "API keys removed",
      },
    ],
  },
  {
    policy_id: "thirdparty-vendor-restricted",
    name: "Third-Party External Partner Boundary",
    version: "1.0.0",
    description:
      "External Partner boundary policy. Enforces full blackout redaction on executive compensation, staff identities, credentials, and customer contact data.",
    default_action: "review",
    require_figure_review: true,
    rules: [
      {
        entity_type: "SALARY",
        action: "redact",
        replacement: "[BLACKOUT: SALARY]",
        description: "Full blackout of executive compensation",
      },
      {
        entity_type: "EMPLOYEE_ID",
        action: "redact",
        replacement: "[BLACKOUT: ID]",
        description: "Full blackout of employee IDs",
      },
      {
        entity_type: "PERSON",
        action: "redact",
        replacement: "[BLACKOUT: PERSON]",
        description: "Full blackout of internal personnel names",
      },
      {
        entity_type: "PHONE_NUMBER",
        action: "redact",
        replacement: "[BLACKOUT: CONTACT]",
        description: "Full blackout of direct phone numbers",
      },
      {
        entity_type: "EMAIL_ADDRESS",
        action: "redact",
        replacement: "[BLACKOUT: EMAIL]",
        description: "Full blackout of direct email addresses",
      },
      {
        entity_type: "ADDRESS",
        action: "redact",
        replacement: "[BLACKOUT: ADDRESS]",
        description: "Full blackout of physical addresses",
      },
      {
        entity_type: "PASSWORD",
        action: "redact",
        replacement: "[BLACKOUT: CREDENTIAL]",
        description: "Credentials strictly confidential",
      },
      {
        entity_type: "SECRET_KEY",
        action: "redact",
        replacement: "[BLACKOUT: SECRET]",
        description: "Secrets strictly confidential",
      },
      {
        entity_type: "API_KEY",
        action: "redact",
        replacement: "[BLACKOUT: API_KEY]",
        description: "API keys strictly confidential",
      },
    ],
  },
  {
    policy_id: "public-relations-safe",
    name: "Public Relations & Marketing Safe Release",
    version: "1.0.0",
    description:
      "Marketing role policy. Safe for external campaigns and public domain release. Redacts individual salaries and employee IDs; masks emails and contact data.",
    default_action: "allow",
    require_figure_review: false,
    rules: [
      {
        entity_type: "SALARY",
        action: "redact",
        replacement: "[SALARY REDACTED]",
        description: "Granular salary metrics redacted for public release",
      },
      {
        entity_type: "EMPLOYEE_ID",
        action: "redact",
        replacement: "[STAFF ID REDACTED]",
        description: "Internal employee IDs redacted",
      },
      {
        entity_type: "PHONE_NUMBER",
        action: "mask",
        mask_char: "*",
        description: "Direct phone numbers masked",
      },
      {
        entity_type: "EMAIL_ADDRESS",
        action: "mask",
        mask_char: "*",
        description: "Personal emails masked with domain retained",
      },
      {
        entity_type: "PASSWORD",
        action: "redact",
        replacement: "[CREDENTIAL REDACTED]",
        description: "Credentials strictly confidential",
      },
      {
        entity_type: "SECRET_KEY",
        action: "redact",
        replacement: "[SECRET REDACTED]",
        description: "Secrets strictly confidential",
      },
      {
        entity_type: "API_KEY",
        action: "redact",
        replacement: "[API KEY REDACTED]",
        description: "API keys strictly confidential",
      },
    ],
  },
  {
    policy_id: "sales-quarterly",
    name: "Sales Quarterly Restricted View",
    version: "1.0.0",
    description:
      "Restricted policy for Sales personnel. Redacts employee PII, contacts, and compensation data.",
    default_action: "allow",
    require_figure_review: true,
    rules: [
      {
        entity_type: "SALARY",
        action: "redact",
        replacement: "[SALARY REDACTED]",
        description: "Compensation is strictly confidential",
      },
      {
        entity_type: "EMPLOYEE_ID",
        action: "redact",
        replacement: "[ID REDACTED]",
        description: "Internal staff IDs are hidden",
      },
      {
        entity_type: "PHONE_NUMBER",
        action: "redact",
        replacement: "[PHONE REDACTED]",
        description: "Direct personal telephone numbers hidden",
      },
      {
        entity_type: "EMAIL_ADDRESS",
        action: "mask",
        mask_char: "*",
        description: "Internal email masked",
      },
      {
        entity_type: "PERSON",
        action: "redact",
        replacement: "[PERSON REDACTED]",
        description: "Individual identities redacted for general sales distribution",
      },
      {
        entity_type: "ADDRESS",
        action: "mask",
        mask_char: "*",
        description: "Physical street address masked",
      },
      {
        entity_type: "PASSWORD",
        action: "redact",
        replacement: "[PASSWORD REDACTED]",
        description: "Passwords and login credentials are strictly confidential",
      },
      {
        entity_type: "SECRET_KEY",
        action: "redact",
        replacement: "[SECRET REDACTED]",
        description: "Secrets and credentials are strictly confidential",
      },
      {
        entity_type: "API_KEY",
        action: "redact",
        replacement: "[API KEY REDACTED]",
        description: "API credentials are strictly confidential",
      },
    ],
  },
  {
    policy_id: "finance-full-access",
    name: "Finance Department Audit View",
    version: "1.0.0",
    description:
      "Finance role policy. Allows access to compensation and employee IDs, while masking personal contact numbers and external addresses.",
    default_action: "allow",
    require_figure_review: false,
    rules: [
      {
        entity_type: "SALARY",
        action: "allow",
        description: "Finance authorized to review compensation metrics",
      },
      {
        entity_type: "EMPLOYEE_ID",
        action: "allow",
        description: "Finance authorized to link records by employee ID",
      },
      {
        entity_type: "PERSON",
        action: "allow",
        description: "Finance authorized to view employee names",
      },
      {
        entity_type: "PHONE_NUMBER",
        action: "redact",
        replacement: "[PHONE REDACTED]",
        description: "Direct telephone numbers redacted",
      },
      {
        entity_type: "EMAIL_ADDRESS",
        action: "allow",
        description: "Authorized for internal correspondence",
      },
      {
        entity_type: "ADDRESS",
        action: "mask",
        mask_char: "*",
        description: "Physical address masked",
      },
    ],
  },
  {
    policy_id: "reviewer",
    name: "Compliance Reviewer Policy",
    version: "1.0.0",
    description:
      "Compliance/Privacy Reviewer view. Highlights findings, flags uncertain candidates for human review, and requires review of embedded figures.",
    default_action: "review",
    require_figure_review: true,
    rules: [
      {
        entity_type: "SALARY",
        action: "review",
        description: "Requires explicit signoff before release",
      },
      {
        entity_type: "EMPLOYEE_ID",
        action: "mask",
        mask_char: "*",
        description: "Partially masked ID pending review",
      },
      {
        entity_type: "PHONE_NUMBER",
        action: "review",
        description: "Requires confirmation",
      },
      {
        entity_type: "EMAIL_ADDRESS",
        action: "review",
        description: "Requires confirmation",
      },
      {
        entity_type: "PERSON",
        action: "review",
        description: "Requires confirmation",
      },
    ],
  },
];

export const DEMO_SUBJECTS: DemoSubject[] = [
  {
    subject_id: "demo_developer",
    name: "Developer (Engineering Team)",
    roles: ["developer", "engineering"],
    clearance: "internal",
    description: "Engineering strict access: compensation and personal IDs redacted; internal technical specs and CIDRs retained.",
  },
  {
    subject_id: "demo_designer",
    name: "Designer (UI/UX Team)",
    roles: ["designer", "creative"],
    clearance: "creative",
    description: "Layout inspection: visual typography and geometry preserved; employee names replaced with layout dummy labels.",
  },
  {
    subject_id: "demo_partner",
    name: "External Partner (Federated Vendor)",
    roles: ["partner", "vendor"],
    clearance: "restricted",
    description: "Third-party boundary: complete blackout of executive compensation, names, project codes, and contact data.",
  },
  {
    subject_id: "demo_marketing",
    name: "Marketing Specialist (Public Relations)",
    roles: ["marketing", "public_relations"],
    clearance: "public",
    description: "Public-safe release: compensation and employee IDs redacted, contact info masked, broad metrics allowed.",
  },
  {
    subject_id: "demo_sales_viewer",
    name: "Sales Representative (Standard)",
    roles: ["sales", "viewer"],
    clearance: "standard",
    description: "Restricted view: all employee PII, contacts, and compensation redacted or masked.",
  },
  {
    subject_id: "demo_finance_viewer",
    name: "Finance Auditor",
    roles: ["finance", "viewer"],
    clearance: "confidential",
    description: "Authorized for compensation & staff IDs; telephone numbers redacted; emails allowed.",
  },
  {
    subject_id: "demo_reviewer",
    name: "Compliance Reviewer",
    roles: ["reviewer", "compliance"],
    clearance: "compliance",
    description: "Inspects findings and review states; can inspect unverified figures.",
  },
];

/**
 * Honest initial demo documents reflecting RedactCore test fixtures
 * and safety states from implementation.md.
 */
export const DEMO_DOCUMENTS: DemoDocumentRecord[] = [
  {
    filename: "sample_executive_payroll_2026.pdf",
    file_type: "pdf",
    source_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    page_count: 12,
    text_block_count: 48,
    table_count: 3,
    figure_count: 2,
    is_scanned: false,
    ocr_status: null,
    findings_count: 14,
    safety_state: "review_required",
    safety_explanation:
      "Embedded chart figures detected; policy require_figure_review is enabled. Human verification required before release.",
    uploaded_at: "2026-10-04 10:14:02 UTC",
    findings_summary: [
      {
        finding_id: "fnd-01",
        entity_type: "SALARY",
        value_digest: "a1c2e4...9b",
        page_or_section: "Page 2, Paragraph 3",
        source_ref: "block_04",
        confidence: 0.98,
        source: "regex",
        requires_review: false,
      },
      {
        finding_id: "fnd-02",
        entity_type: "EMPLOYEE_ID",
        value_digest: "7f44a1...2c",
        page_or_section: "Page 2, Table 1",
        source_ref: "table_01_r2",
        confidence: 0.95,
        source: "regex",
        requires_review: false,
      },
      {
        finding_id: "fnd-03",
        entity_type: "FIGURE_CONTAINER",
        value_digest: "8b19ee...41",
        page_or_section: "Page 5, Figure 1",
        source_ref: "fig_01",
        confidence: 1.0,
        source: "manual",
        requires_review: true,
        rationale: "Embedded raster image may conceal sensitive compensation graph",
      },
    ],
  },
  {
    filename: "legacy_acquisition_nda_scanned.pdf",
    file_type: "pdf",
    source_sha256: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
    page_count: 4,
    text_block_count: 0,
    table_count: 0,
    figure_count: 4,
    is_scanned: true,
    ocr_status: "not_performed",
    findings_count: 0,
    safety_state: "blocked_scanned_insufficient_ocr",
    safety_explanation:
      "Fail-closed: Document is scanned/raster-only and OCR pipeline is disabled or unconsented. Transformation blocked.",
    uploaded_at: "2026-10-04 09:45:18 UTC",
    findings_summary: [],
  },
  {
    filename: "q3_field_performance_audit.docx",
    file_type: "docx",
    source_sha256: "3b259160e1d13f9c656515d0234eef0bbd10f8ef1a7a0a030f8983227a6f2357",
    page_count: 6,
    text_block_count: 32,
    table_count: 1,
    figure_count: 0,
    is_scanned: false,
    ocr_status: null,
    findings_count: 8,
    safety_state: "verified",
    safety_explanation:
      "RedactCore verified: Derived DOCX generated under policy sales-quarterly. Leak check passed, original byte-identical.",
    uploaded_at: "2026-10-04 08:30:55 UTC",
    findings_summary: [
      {
        finding_id: "fnd-10",
        entity_type: "EMAIL_ADDRESS",
        value_digest: "51c911...0e",
        page_or_section: "Section 1",
        source_ref: "block_01",
        confidence: 0.99,
        source: "regex",
        requires_review: false,
      },
      {
        finding_id: "fnd-11",
        entity_type: "PHONE_NUMBER",
        value_digest: "90b4aa...71",
        page_or_section: "Section 4",
        source_ref: "block_12",
        confidence: 0.94,
        source: "regex",
        requires_review: false,
      },
    ],
  },
];

/**
 * Format SHA-256 for safe, compact monospace rendering.
 */
export function formatDigest(hash: string, prefixLen = 8, suffixLen = 6): string {
  if (!hash) return "—";
  if (hash.length <= prefixLen + suffixLen) return hash;
  return `${hash.slice(0, prefixLen)}…${hash.slice(-suffixLen)}`;
}

/**
 * RedactCore API client interface.
 */
export class RedactCoreClient {
  public readonly baseUrl: string;

  constructor(baseUrl: string = REDACTCORE_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async checkHealth(): Promise<{ live: boolean; data: HealthResponse }> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = (await res.json()) as HealthResponse;
      return { live: true, data };
    } catch {
      // Fallback honest demo health state when RedactCore server is not running
      return {
        live: false,
        data: {
          status: "healthy",
          version: "0.1.0-local-demo",
          storage_root: "RedactCore/data/local_store (demo)",
          storage_ephemeral: true,
          storage_warning:
            "Local container storage is ephemeral; derived views and uploaded originals will not persist across restarts.",
          policies: ["sales-quarterly", "finance-full-access", "reviewer"],
          presidio: {
            active: false,
            limitation: "Presidio local NLP engine not loaded in demo shell mode",
          },
          baseline_detector: "regex_deterministic",
          ocr: {
            status: "fail_closed_safe",
            mode: "off",
            tesseract_available: false,
            google_cloud_vision_available: false,
            active_engine: "none (cloud consent required)",
            notes: "Scanned documents trigger fail-closed block until OCR is consented.",
          },
          llm_inspector: {
            status: "consent_gated_off",
            mode: "off",
            active_engine: "none",
            notes: "LLM inspection is disabled by default and gated by cloud consent.",
          },
        },
      };
    }
  }

  async listPolicies(): Promise<{ live: boolean; policies: RedactionPolicy[] }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/policies`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const summaries = (await res.json()) as PolicySummary[];

      // Enhance with full rules from LOCAL_POLICIES
      const policies = summaries.map((summary) => {
        const full = LOCAL_POLICIES.find((p) => p.policy_id === summary.policy_id);
        return full || {
          ...summary,
          default_action: summary.default_action as "allow" | "review",
          rules: [],
        };
      });

      return { live: true, policies };
    } catch {
      return { live: false, policies: LOCAL_POLICIES };
    }
  }

  async listSubjects(): Promise<{ live: boolean; subjects: DemoSubject[] }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/subjects`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const subjects = (await res.json()) as DemoSubject[];
      return { live: true, subjects };
    } catch {
      return { live: false, subjects: DEMO_SUBJECTS };
    }
  }
}

export const api = new RedactCoreClient();

/**
 * Aristotle Policy Drafting API client interface.
 */
export class AristotleClient {
  public readonly baseUrl: string;

  constructor(baseUrl: string = ARISTOTLE_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async checkHealth(): Promise<{ live: boolean }> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      return { live: res.ok };
    } catch {
      return { live: false };
    }
  }

  async draftPolicy(
    requestText: string,
    policyId?: string,
    policyName?: string
  ): Promise<{ live: boolean; data: AristotleDraftResponse }> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/policy/draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          request: requestText,
          policy_id: policyId || undefined,
          policy_name: policyName || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Aristotle API error: HTTP ${res.status}`);
      }

      const data = (await res.json()) as AristotleDraftResponse;
      return { live: true, data };
    } catch (err) {
      console.warn("Aristotle API unreachable, falling back to deterministic draft:", err);
      const local = translateDraftPrompt(requestText);
      const fallbackPolicy: RedactionPolicy = {
        policy_id: policyId || "draft_local_policy",
        name: policyName || "Local Fallback Draft Policy",
        version: "1.0.0",
        description: `Draft policy derived from: "${requestText.slice(0, 80)}..."`,
        default_action: "review",
        require_figure_review: true,
        rules: local.draftRules.map((r) => ({
          entity_type: r.entity_type,
          action: (r.suggested_action as any) || "redact",
          replacement: r.suggested_action === "redact" ? `[${r.entity_type} REDACTED]` : null,
          mask_char: "*",
          description: r.reason,
        })),
      };

      return {
        live: false,
        data: {
          policy: fallbackPolicy,
          warnings: [
            "Aristotle Cloud API was unreachable. Showing deterministic local fallback mapping.",
          ],
          draft_only: true,
          model: "deterministic-local-fallback",
        },
      };
    }
  }
}

export const aristotleApi = new AristotleClient();

/**
 * Deterministic natural-language draft mapper as specified in implementation.md Section 2 (Screen 3).
 * NOTE: This is strictly draft-only and not persisted to RedactCore YAML.
 */
export function translateDraftPrompt(input: string): {
  draftRules: Array<{ entity_type: string; suggested_action: string; reason: string }>;
  unmapped: string[];
} {
  const lower = input.toLowerCase();
  const draftRules: Array<{ entity_type: string; suggested_action: string; reason: string }> = [];
  const unmapped: string[] = [];

  const mappings: Array<{
    keywords: string[];
    entity_type: string;
    action: string;
    reason: string;
  }> = [
    {
      keywords: ["salary", "compensation", "wage", "pay"],
      entity_type: "SALARY",
      action: "redact",
      reason: "Compensation and executive remuneration mapped to SALARY rule",
    },
    {
      keywords: ["employee id", "staff id", "badge", "worker id"],
      entity_type: "EMPLOYEE_ID",
      action: "redact",
      reason: "Internal worker identifier mapped to EMPLOYEE_ID rule",
    },
    {
      keywords: ["phone", "telephone", "mobile", "cell"],
      entity_type: "PHONE_NUMBER",
      action: "redact",
      reason: "Personal direct telephone mapped to PHONE_NUMBER rule",
    },
    {
      keywords: ["email", "e-mail", "inbox"],
      entity_type: "EMAIL_ADDRESS",
      action: "mask",
      reason: "Electronic communication address mapped to EMAIL_ADDRESS rule",
    },
    {
      keywords: ["person", "name", "individual", "identity"],
      entity_type: "PERSON",
      action: "redact",
      reason: "Human personal identity mapped to PERSON rule",
    },
    {
      keywords: ["address", "street", "residence", "location"],
      entity_type: "ADDRESS",
      action: "mask",
      reason: "Physical street address mapped to ADDRESS rule",
    },
    {
      keywords: ["password", "credential", "login"],
      entity_type: "PASSWORD",
      action: "redact",
      reason: "Authentication secret mapped to PASSWORD rule",
    },
    {
      keywords: ["secret", "private key"],
      entity_type: "SECRET_KEY",
      action: "redact",
      reason: "Cryptographic secret mapped to SECRET_KEY rule",
    },
    {
      keywords: ["api key", "token", "auth token"],
      entity_type: "API_KEY",
      action: "redact",
      reason: "API credential token mapped to API_KEY rule",
    },
  ];

  for (const m of mappings) {
    if (m.keywords.some((k) => lower.includes(k))) {
      draftRules.push({
        entity_type: m.entity_type,
        suggested_action: m.action,
        reason: m.reason,
      });
    }
  }

  if (draftRules.length === 0 && input.trim().length > 0) {
    unmapped.push(
      "No deterministic entity mapping matched. RedactCore supports formal types: SALARY, EMPLOYEE_ID, PHONE_NUMBER, EMAIL_ADDRESS, PERSON, ADDRESS, PASSWORD, SECRET_KEY, API_KEY."
    );
  }

  return { draftRules, unmapped };
}

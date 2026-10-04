/**
 * Typed domain models for the Argus Control Plane,
 * strictly aligned with RedactCore Pydantic models (RedactCore/src/redact_core/models.py).
 */

export interface SubjectContext {
  subject_id: string;
  roles: string[];
  groups?: string[];
  department?: string | null;
  clearance?: string | null;
  purpose?: string | null;
}

export interface ResourceContext {
  document_id: string;
  classification?: string;
  owner?: string | null;
  tags?: string[];
}

export interface TextSpan {
  span_id: string;
  text: string;
  bbox?: [number, number, number, number] | null;
  font?: string | null;
  size?: number | null;
  start_char?: number;
  end_char?: number;
}

export interface TextBlock {
  block_id: string;
  page_or_section: string;
  text: string;
  spans?: TextSpan[];
  bbox?: [number, number, number, number] | null;
}

export interface TableBlock {
  table_id: string;
  page_or_section: string;
  rows: string[][];
  bbox?: [number, number, number, number] | null;
}

export interface FigureBlock {
  figure_id: string;
  page_or_section: string;
  bbox?: [number, number, number, number] | null;
  caption?: string | null;
  has_text_potential: boolean;
  requires_review: boolean;
}

export interface NormalizedDocument {
  document_id: string;
  source_sha256: string;
  filename: string;
  file_type: "pdf" | "docx";
  page_count: number;
  text_blocks: TextBlock[];
  tables: TableBlock[];
  figures: FigureBlock[];
  warnings: string[];
  metadata: Record<string, unknown>;
  is_scanned: boolean;
  ocr_status: "not_performed" | "complete" | "partial" | "failed" | null;
  ocr_provider: string | null;
  ocr_coverage: number | null;
  ocr_warnings: string[];
}

/**
 * Safe entity finding summary.
 * SECURITY: raw_value is never present in serialized finding summaries;
 * only value_digest (SHA-256) is exposed.
 */
export interface EntityFindingSummary {
  finding_id: string;
  entity_type: string;
  value_digest: string;
  page_or_section: string;
  source_ref: string;
  bbox?: [number, number, number, number] | null;
  confidence: number;
  source: "regex" | "presidio" | "manual" | "ocr" | "gemini_llm";
  requires_review: boolean;
  category?: string | null;
  rationale?: string | null;
}

export type PolicyAction = "allow" | "redact" | "mask" | "replace" | "review";

export interface PolicyRule {
  entity_type: string;
  action: PolicyAction;
  replacement?: string | null;
  mask_char?: string;
  description?: string | null;
  conditions?: Record<string, unknown>;
}

export interface RedactionPolicy {
  policy_id: string;
  name: string;
  version: string;
  description: string;
  default_action: "allow" | "review";
  require_figure_review: boolean;
  allowed_subjects?: Record<string, string[]>;
  rules: PolicyRule[];
}

export interface PolicySummary {
  policy_id: string;
  name: string;
  version: string;
  description: string;
  default_action: string;
  require_figure_review: boolean;
  rules_count: number;
}

export interface VerificationResult {
  passed: boolean;
  checked_findings_count: number;
  leaks_found: string[];
  page_count_verified: boolean;
  integrity_verified: boolean;
  details?: Record<string, unknown>;
}

export interface ViewManifest {
  schema_version: string;
  view_id: string;
  source_sha256: string;
  output_sha256: string | null;
  policy_id: string;
  policy_version: string;
  subject_id_digest: string;
  decision_id: string;
  created_at: string;
  input_format: string;
  output_format: string;
  operation_counts: Record<string, number>;
  warnings: string[];
  verification: VerificationResult;
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unreachable";
  version: string;
  storage_root: string;
  storage_ephemeral: boolean;
  storage_warning: string | null;
  policies: string[];
  presidio: {
    active: boolean;
    limitation: string | null;
  };
  baseline_detector: string;
  ocr: {
    status: string;
    mode: string;
    tesseract_available: boolean;
    google_cloud_vision_available: boolean;
    active_engine: string;
    notes?: string;
  };
  llm_inspector: {
    status: string;
    mode: string;
    active_engine: string;
    notes?: string;
  };
}

export interface DemoSubject {
  subject_id: string;
  name: string;
  roles: string[];
  clearance: string;
  description: string;
}

export type DocumentSafetyState =
  | "ready"
  | "review_required"
  | "blocked_scanned_insufficient_ocr"
  | "blocked_verification_failure"
  | "verified";

export interface DemoDocumentRecord {
  filename: string;
  file_type: "pdf" | "docx";
  source_sha256: string;
  page_count: number;
  text_block_count: number;
  table_count: number;
  figure_count: number;
  is_scanned: boolean;
  ocr_status: string | null;
  findings_count: number;
  safety_state: DocumentSafetyState;
  safety_explanation: string;
  uploaded_at: string;
  findings_summary: EntityFindingSummary[];
}

"""Data contracts and models for Argus RedactCore."""

from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class SubjectContext(BaseModel):
    """Identity and authorization context for the subject requesting a document view."""
    model_config = ConfigDict(extra="ignore")

    subject_id: str
    roles: set[str] = Field(default_factory=set)
    groups: set[str] = Field(default_factory=set)
    department: str | None = None
    clearance: str | None = None
    purpose: str | None = None


class ResourceContext(BaseModel):
    """Attributes and classification of the requested resource."""
    model_config = ConfigDict(extra="ignore")

    document_id: str
    classification: str = "internal"
    owner: str | None = None
    tags: set[str] = Field(default_factory=set)


class TextSpan(BaseModel):
    """Normalized atomic text span with optional coordinate bounding box."""
    model_config = ConfigDict(extra="ignore")

    span_id: str
    text: str
    bbox: list[float] | None = None  # [x0, y0, x1, y1]
    font: str | None = None
    size: float | None = None
    start_char: int = 0
    end_char: int = 0


class TextBlock(BaseModel):
    """Normalized block of text containing multiple spans."""
    model_config = ConfigDict(extra="ignore")

    block_id: str
    page_or_section: str
    text: str
    spans: list[TextSpan] = Field(default_factory=list)
    bbox: list[float] | None = None


class TableBlock(BaseModel):
    """Normalized representation of a tabular region."""
    model_config = ConfigDict(extra="ignore")

    table_id: str
    page_or_section: str
    rows: list[list[str]] = Field(default_factory=list)
    bbox: list[float] | None = None


class FigureBlock(BaseModel):
    """Normalized figure or image container with review flags."""
    model_config = ConfigDict(extra="ignore")

    figure_id: str
    page_or_section: str
    bbox: list[float] | None = None
    caption: str | None = None
    has_text_potential: bool = True
    requires_review: bool = True


class NormalizedDocument(BaseModel):
    """Format-agnostic intermediate document representation."""
    model_config = ConfigDict(extra="ignore")

    document_id: str
    source_sha256: str
    filename: str
    file_type: str  # 'pdf' or 'docx'
    page_count: int
    text_blocks: list[TextBlock] = Field(default_factory=list)
    tables: list[TableBlock] = Field(default_factory=list)
    figures: list[FigureBlock] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    is_scanned: bool = False
    ocr_status: str | None = None  # None, 'not_performed', 'complete', 'partial', 'failed'
    ocr_provider: str | None = None
    ocr_coverage: float | None = None
    ocr_warnings: list[str] = Field(default_factory=list)


class EntityFinding(BaseModel):
    """Candidate sensitive entity detection result.
    
    IMPORTANT: raw_value is excluded from JSON/serialization to prevent PII leakage.
    Only value_digest (SHA-256) is recorded in manifests and public API responses.
    """
    model_config = ConfigDict(extra="ignore")

    finding_id: str
    entity_type: str
    value_digest: str
    page_or_section: str
    source_ref: str
    bbox: list[float] | None = None
    start: int | None = None
    end: int | None = None
    confidence: float
    source: str  # 'regex', 'presidio', 'manual', 'ocr', 'gemini_llm'
    requires_review: bool = False
    category: str | None = None
    rationale: str | None = None
    raw_value: str = Field(..., exclude=True)

    def safe_summary(self) -> dict[str, Any]:
        """Returns safe representation suitable for public API responses."""
        summary = {
            "finding_id": self.finding_id,
            "entity_type": self.entity_type,
            "value_digest": self.value_digest,
            "page_or_section": self.page_or_section,
            "source_ref": self.source_ref,
            "bbox": self.bbox,
            "confidence": self.confidence,
            "source": self.source,
            "requires_review": self.requires_review,
        }
        if self.category is not None:
            summary["category"] = self.category
        if self.rationale is not None:
            summary["rationale"] = self.rationale
        return summary


class PolicyRule(BaseModel):
    """A policy rule mapping an entity type to an action."""
    model_config = ConfigDict(extra="ignore")

    entity_type: str
    action: str  # 'redact', 'mask', 'replace', 'allow', 'review'
    replacement: str | None = None
    mask_char: str = "*"
    description: str | None = None
    conditions: dict[str, Any] = Field(default_factory=dict)


class RedactionPolicy(BaseModel):
    """A declarative redaction policy."""
    model_config = ConfigDict(extra="ignore")

    policy_id: str
    name: str = ""
    version: str = "1.0.0"
    description: str = ""
    default_action: str = "allow"
    require_figure_review: bool = False
    allowed_subjects: dict[str, list[str]] = Field(default_factory=dict)
    rules: list[PolicyRule] = Field(default_factory=list)


class RedactionOperation(BaseModel):
    """A planned redaction operation to be applied to a document copy."""
    model_config = ConfigDict(extra="ignore")

    operation_id: str
    finding_id: str
    entity_type: str
    action: str  # 'redact', 'mask', 'replace', 'review'
    page_or_section: str
    source_ref: str
    bbox: list[float] | None = None
    target_text: str = Field(..., exclude=True)  # Raw value excluded from serialization
    replacement_text: str | None = None
    mask_char: str = "*"


class RedactionPlan(BaseModel):
    """The complete plan of operations derived from document findings and policy."""
    model_config = ConfigDict(extra="ignore")

    plan_id: str
    policy_id: str
    policy_version: str
    subject_id: str
    decision_id: str
    operations: list[RedactionOperation] = Field(default_factory=list)
    blocked: bool = False
    block_reason: str | None = None
    requires_review_count: int = 0
    warnings: list[str] = Field(default_factory=list)


class VerificationResult(BaseModel):
    """Post-transformation verification outcomes."""
    model_config = ConfigDict(extra="ignore")

    passed: bool
    checked_findings_count: int = 0
    leaks_found: list[str] = Field(default_factory=list)
    page_count_verified: bool = True
    integrity_verified: bool = True
    details: dict[str, Any] = Field(default_factory=dict)


class ViewManifest(BaseModel):
    """Immutable audit record for a generated privacy-preserved document view."""
    model_config = ConfigDict(extra="ignore")

    schema_version: str = "1.0.0"
    view_id: str
    source_sha256: str
    output_sha256: str | None = None
    policy_id: str
    policy_version: str
    subject_id_digest: str
    decision_id: str
    created_at: str
    input_format: str
    output_format: str
    operation_counts: dict[str, int] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    verification: dict[str, Any] = Field(default_factory=dict)

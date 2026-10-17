"""Data models and validation contracts for Aristotle policy drafting."""

from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

# Strictly allowlisted entity types supported by Argus RedactCore pipeline
ALLOWED_ENTITY_TYPES: set[str] = {
    "SALARY",
    "EMPLOYEE_ID",
    "PHONE_NUMBER",
    "EMAIL_ADDRESS",
    "PERSON",
    "ADDRESS",
    "PASSWORD",
    "SECRET_KEY",
    "API_KEY",
    "GENERAL",
}

# Strictly allowlisted redaction actions supported by Argus RedactCore pipeline
ALLOWED_ACTIONS: set[str] = {
    "allow",
    "redact",
    "mask",
    "replace",
    "review",
}

# Conservative precedence hierarchy for deduplication conflict resolution:
# Higher integer value indicates more restrictive / conservative behavior.
ACTION_PRECEDENCE: dict[str, int] = {
    "review": 5,
    "redact": 4,
    "mask": 3,
    "replace": 2,
    "allow": 1,
}

EntityType = Literal[
    "SALARY",
    "EMPLOYEE_ID",
    "PHONE_NUMBER",
    "EMAIL_ADDRESS",
    "PERSON",
    "ADDRESS",
    "PASSWORD",
    "SECRET_KEY",
    "API_KEY",
    "GENERAL",
]

ActionType = Literal[
    "allow",
    "redact",
    "mask",
    "replace",
    "review",
]


class PolicyRule(BaseModel):
    """A single declarative rule mapping an entity type to a redaction action.

    Compatible with RedactCore.models.PolicyRule.
    """
    model_config = ConfigDict(extra="ignore")

    entity_type: EntityType
    action: ActionType
    replacement: str | None = None
    mask_char: str = "*"
    description: str | None = None
    conditions: dict[str, Any] = Field(default_factory=dict)

    @field_validator("entity_type", mode="before")
    @classmethod
    def normalize_entity_type(cls, v: Any) -> str:
        if isinstance(v, str):
            v_norm = v.strip().upper()
            if v_norm in ALLOWED_ENTITY_TYPES:
                return v_norm
        raise ValueError(f"Invalid entity_type '{v}'. Allowed types: {sorted(ALLOWED_ENTITY_TYPES)}")

    @field_validator("action", mode="before")
    @classmethod
    def normalize_action(cls, v: Any) -> str:
        if isinstance(v, str):
            v_norm = v.strip().lower()
            if v_norm in ALLOWED_ACTIONS:
                return v_norm
        raise ValueError(f"Invalid action '{v}'. Allowed actions: {sorted(ALLOWED_ACTIONS)}")

    @field_validator("mask_char", mode="before")
    @classmethod
    def normalize_mask_char(cls, v: Any) -> str:
        if v is None or not str(v):
            return "*"
        s = str(v)
        return s[0] if len(s) > 1 else s


class RedactionPolicy(BaseModel):
    """A complete declarative RedactCore-compatible redaction policy."""
    model_config = ConfigDict(extra="ignore")

    policy_id: str
    name: str = ""
    version: str = "1.0.0"
    description: str = ""
    default_action: str = "allow"
    require_figure_review: bool = False
    allowed_subjects: dict[str, list[str]] = Field(default_factory=dict)
    rules: list[PolicyRule] = Field(default_factory=list)

    @field_validator("default_action", mode="before")
    @classmethod
    def normalize_default_action(cls, v: Any) -> str:
        if isinstance(v, str):
            v_norm = v.strip().lower()
            if v_norm in {"allow", "review", "redact"}:
                return v_norm
        raise ValueError("Invalid default_action. Allowed values: allow, review, redact")


class DraftPolicyRule(BaseModel):
    """Declarative rule drafted by LLM without freeform dicts for Gemini schema compatibility."""
    model_config = ConfigDict(extra="ignore")

    entity_type: EntityType
    action: ActionType
    replacement: str | None = None
    mask_char: str = "*"
    description: str | None = None


class DraftPolicySchema(BaseModel):
    """Schema for LLM structured output, strictly avoiding additionalProperties for Gemini Developer API."""
    model_config = ConfigDict(extra="ignore")

    policy_id: str = "draft-policy"
    name: str = ""
    version: str = "1.0.0"
    description: str = ""
    default_action: str = "allow"
    require_figure_review: bool = False
    rules: list[DraftPolicyRule] = Field(default_factory=list)

    def to_redaction_policy(self) -> RedactionPolicy:
        converted_rules = [
            PolicyRule(
                entity_type=r.entity_type,
                action=r.action,
                replacement=r.replacement,
                mask_char=r.mask_char,
                description=r.description,
            )
            for r in self.rules
        ]
        return RedactionPolicy(
            policy_id=self.policy_id,
            name=self.name,
            version=self.version,
            description=self.description,
            default_action=self.default_action,
            require_figure_review=self.require_figure_review,
            rules=converted_rules,
        )


def normalize_and_dedupe_rules(raw_rules: list[PolicyRule]) -> tuple[list[PolicyRule], list[str]]:
    """Deterministically deduplicate and normalize policy rules.

    Rules are grouped by entity_type:
    - If multiple identical rules exist for an entity_type, retain one and record a warning.
    - If multiple conflicting rules exist for an entity_type, deterministically resolve
      to the most conservative action (review > redact > mask > replace > allow) and record a warning.
    - Preserves deterministic ordering matching the first appearance of each entity_type.
    """
    warnings: list[str] = []
    by_entity: dict[str, list[PolicyRule]] = {}
    ordered_entities: list[str] = []

    for rule in raw_rules:
        et = rule.entity_type
        if et not in by_entity:
            by_entity[et] = []
            ordered_entities.append(et)
        by_entity[et].append(rule)

    deduped_rules: list[PolicyRule] = []

    for et in ordered_entities:
        candidates = by_entity[et]
        if len(candidates) == 1:
            deduped_rules.append(candidates[0])
            continue

        first = candidates[0]
        all_identical = all(
            c.action == first.action
            and c.replacement == first.replacement
            and c.mask_char == first.mask_char
            and c.conditions == first.conditions
            for c in candidates
        )

        if all_identical:
            warnings.append(f"Deduped {len(candidates) - 1} duplicate rule(s) for entity type '{et}'.")
            deduped_rules.append(first)
        else:
            # Sort candidates by conservative precedence (highest rank first)
            sorted_candidates = sorted(
                candidates,
                key=lambda r: ACTION_PRECEDENCE.get(r.action, 0),
                reverse=True,
            )
            selected = sorted_candidates[0]
            warnings.append(
                f"Conflicting rules found for entity type '{et}'. "
                f"Deterministically resolved to conservative action '{selected.action}'."
            )
            deduped_rules.append(selected)

    return deduped_rules, warnings


class DraftPolicyRequest(BaseModel):
    """Request payload for drafting a RedactCore policy from natural language."""
    model_config = ConfigDict(extra="ignore")

    request: str = Field(..., description="Natural language policy specification")
    policy_id: str | None = Field(default=None, description="Optional custom policy ID")
    policy_name: str | None = Field(default=None, description="Optional custom policy name")

    @field_validator("request")
    @classmethod
    def validate_request_text(cls, v: str) -> str:
        if not isinstance(v, str) or not v.strip():
            raise ValueError("Request text cannot be empty or whitespace only")
        if len(v) > 8000:
            raise ValueError("Request text exceeds maximum limit of 8000 characters")
        return v


class DraftPolicyResponse(BaseModel):
    """Response payload containing a validated draft RedactCore policy."""
    model_config = ConfigDict(extra="ignore")

    policy: RedactionPolicy = Field(..., description="Validated RedactCore-compatible redaction policy")
    warnings: list[str] = Field(default_factory=list, description="Warnings and draft notices")
    draft_only: bool = Field(default=True, description="Always true; draft artifact requiring approval")
    model: str = Field(..., description="Gemini model identifier used for policy drafting")

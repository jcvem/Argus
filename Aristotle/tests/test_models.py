"""Unit tests for Aristotle policy models, normalization, and deduplication."""

import pytest
from pydantic import ValidationError

from aristotle_api.models import (
    ALLOWED_ACTIONS,
    ALLOWED_ENTITY_TYPES,
    DraftPolicyRequest,
    DraftPolicyResponse,
    PolicyRule,
    RedactionPolicy,
    normalize_and_dedupe_rules,
)


def test_allowed_entities_and_actions():
    """Verify that expected canonical entities and actions are in allowlists."""
    expected_entities = {
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
    assert ALLOWED_ENTITY_TYPES == expected_entities
    assert ALLOWED_ACTIONS == {"allow", "redact", "mask", "replace", "review"}


def test_policy_rule_normalization():
    """Verify entity_type and action normalization."""
    rule = PolicyRule(
        entity_type="salary",  # lowercase input
        action="REDACT",       # uppercase input
        mask_char="***",       # multiple characters
    )
    assert rule.entity_type == "SALARY"
    assert rule.action == "redact"
    assert rule.mask_char == "*"


def test_policy_rule_invalid_entity_type():
    """Disallowed entity types must raise a ValidationError."""
    with pytest.raises(ValidationError):
        PolicyRule(entity_type="CREDIT_CARD", action="redact")


def test_policy_rule_invalid_action():
    """Disallowed actions must raise a ValidationError."""
    with pytest.raises(ValidationError):
        PolicyRule(entity_type="SALARY", action="delete")


def test_normalize_and_dedupe_identical_rules():
    """Identical duplicate rules must be deduped to a single rule with a warning."""
    raw_rules = [
        PolicyRule(entity_type="SALARY", action="redact", replacement="[SALARY REDACTED]"),
        PolicyRule(entity_type="SALARY", action="redact", replacement="[SALARY REDACTED]"),
        PolicyRule(entity_type="PHONE_NUMBER", action="mask"),
    ]
    deduped, warnings = normalize_and_dedupe_rules(raw_rules)

    assert len(deduped) == 2
    assert deduped[0].entity_type == "SALARY"
    assert deduped[0].action == "redact"
    assert deduped[1].entity_type == "PHONE_NUMBER"
    assert any("Deduped" in w and "SALARY" in w for w in warnings)


def test_normalize_and_dedupe_conflicting_rules():
    """Conflicting rules must resolve conservatively (review > redact > mask > replace > allow)."""
    raw_rules = [
        PolicyRule(entity_type="SALARY", action="allow"),
        PolicyRule(entity_type="SALARY", action="redact"),
        PolicyRule(entity_type="EMAIL_ADDRESS", action="mask"),
        PolicyRule(entity_type="EMAIL_ADDRESS", action="review"),
    ]
    deduped, warnings = normalize_and_dedupe_rules(raw_rules)

    assert len(deduped) == 2
    # For SALARY: redact > allow
    salary_rule = next(r for r in deduped if r.entity_type == "SALARY")
    assert salary_rule.action == "redact"

    # For EMAIL_ADDRESS: review > mask
    email_rule = next(r for r in deduped if r.entity_type == "EMAIL_ADDRESS")
    assert email_rule.action == "review"

    assert len(warnings) == 2
    assert any("Conflicting rules found for entity type 'SALARY'" in w for w in warnings)
    assert any("Conflicting rules found for entity type 'EMAIL_ADDRESS'" in w for w in warnings)


def test_ordering_preserved_during_deduplication():
    """Entity ordering based on first appearance must be preserved."""
    raw_rules = [
        PolicyRule(entity_type="PERSON", action="redact"),
        PolicyRule(entity_type="SALARY", action="mask"),
        PolicyRule(entity_type="PERSON", action="review"),  # conflict with first
        PolicyRule(entity_type="API_KEY", action="redact"),
    ]
    deduped, _ = normalize_and_dedupe_rules(raw_rules)

    assert [r.entity_type for r in deduped] == ["PERSON", "SALARY", "API_KEY"]
    assert deduped[0].action == "review"  # review beats redact


def test_draft_policy_request_validation():
    """Test validation boundaries of DraftPolicyRequest."""
    # Valid
    req = DraftPolicyRequest(request="Redact all salaries", policy_id="test-policy")
    assert req.request == "Redact all salaries"
    assert req.policy_id == "test-policy"

    # Empty string rejected
    with pytest.raises(ValidationError):
        DraftPolicyRequest(request="")

    # Whitespace-only string rejected
    with pytest.raises(ValidationError):
        DraftPolicyRequest(request="   \n\t  ")

    # Oversized string (> 8000 chars) rejected
    with pytest.raises(ValidationError):
        DraftPolicyRequest(request="a" * 8001)


def test_draft_policy_response_draft_only():
    """DraftPolicyResponse must enforce draft_only=True."""
    policy = RedactionPolicy(
        policy_id="test-policy",
        name="Test",
        rules=[PolicyRule(entity_type="SALARY", action="redact")],
    )
    resp = DraftPolicyResponse(
        policy=policy,
        warnings=["Test warning"],
        model="gemini-2.5-flash",
    )
    assert resp.draft_only is True
    data = resp.model_dump()
    assert data["draft_only"] is True


def test_redactcore_yaml_policies_compatibility():
    """Verify that all standard RedactCore policy YAML files validate against Aristotle model."""
    import yaml
    from pathlib import Path

    policies_dir = Path("/Users/jc/Code/Argus/RedactCore/policies")
    if not policies_dir.exists():
        pytest.skip("RedactCore policies directory not available")

    yaml_files = list(policies_dir.glob("*.yaml"))
    assert len(yaml_files) >= 3

    for yaml_path in yaml_files:
        with open(yaml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        policy = RedactionPolicy.model_validate(data)
        assert policy.policy_id
        assert len(policy.rules) > 0


def test_draft_policy_schema_gemini_compatibility():
    """Verify DraftPolicySchema converts cleanly to Gemini API schema without additionalProperties."""
    from google import genai
    from google.genai._transformers import t_schema
    from aristotle_api.models import DraftPolicyRule, DraftPolicySchema

    client = genai.Client(api_key="AIzaSyDummyKeyForTestingSchemaTransform")
    gemini_schema = t_schema(client._api_client, DraftPolicySchema)
    assert gemini_schema is not None

    # Test conversion to full RedactionPolicy
    draft = DraftPolicySchema(
        policy_id="test-draft",
        name="Test Draft",
        rules=[
            DraftPolicyRule(entity_type="SALARY", action="redact"),
            DraftPolicyRule(entity_type="EMAIL_ADDRESS", action="mask", mask_char="#"),
        ],
    )
    redaction_policy = draft.to_redaction_policy()
    assert isinstance(redaction_policy, RedactionPolicy)
    assert redaction_policy.policy_id == "test-draft"
    assert len(redaction_policy.rules) == 2
    assert redaction_policy.rules[0].entity_type == "SALARY"
    assert redaction_policy.rules[0].action == "redact"
    assert redaction_policy.rules[1].mask_char == "#"

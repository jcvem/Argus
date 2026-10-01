"""Focused unit and integration tests for Gemini LLM Entity Inspection.

Guarantees:
- Zero real network calls (all Gemini clients/responses are mocked).
- Zero secrets or API keys exposed.
- Tests default offline safety, consent gating, untrusted span validation,
  fail-closed / fallback modes, chunking offset accuracy, and PII exclusion.
"""

import json
from pathlib import Path
from typing import Any
import pytest
from fastapi.testclient import TestClient

from redact_core.api import app
from redact_core.entities import EntityDetector
from redact_core.llm_entities import (
    EntityLLMConfigurationError,
    EntityLLMError,
    EntityLLMPayloadTooLargeError,
    EntityLLMResponseParseError,
    EntityLLMTimeoutError,
    GeminiCandidateEntity,
    GeminiEntityExtractionResponse,
    GeminiEntityInspector,
    chunk_text,
    enforce_cloud_llm_consent,
    normalize_entity_type,
)
from redact_core.models import EntityFinding, NormalizedDocument, TextBlock
from redact_core.pipeline import RedactionPipeline
from redact_core.storage import DocumentStore


class MockModelsService:
    """Mock models service conforming to the google-genai SDK interface."""

    def __init__(
        self,
        entities: list[GeminiCandidateEntity] | None = None,
        raise_exc: Exception | None = None,
        raw_text_json: str | None = None,
    ):
        self.entities = entities if entities is not None else []
        self.raise_exc = raise_exc
        self.raw_text_json = raw_text_json
        self.call_history: list[dict[str, Any]] = []

    def generate_content(self, model: str, contents: Any, config: Any = None) -> Any:
        self.call_history.append({"model": model, "contents": contents, "config": config})
        if self.raise_exc:
            raise self.raise_exc

        resp = type("MockGenAIResponse", (), {})()
        if self.raw_text_json is not None:
            resp.parsed = None
            resp.text = self.raw_text_json
        else:
            resp.parsed = GeminiEntityExtractionResponse(entities=self.entities)
            resp.text = json.dumps({"entities": [e.model_dump() for e in self.entities], "warnings": []})
        return resp


class MockGenAIClient:
    """Mock google-genai Client."""

    def __init__(
        self,
        entities: list[GeminiCandidateEntity] | None = None,
        raise_exc: Exception | None = None,
        raw_text_json: str | None = None,
    ):
        self.models = MockModelsService(
            entities=entities,
            raise_exc=raise_exc,
            raw_text_json=raw_text_json,
        )


# =========================================================================
# 1. Normalization & Canonical Allowlist Tests
# =========================================================================


def test_normalize_entity_type():
    assert normalize_entity_type("email") == "EMAIL_ADDRESS"
    assert normalize_entity_type("EMAIL_ADDRESS") == "EMAIL_ADDRESS"
    assert normalize_entity_type("phone-number") == "PHONE_NUMBER"
    assert normalize_entity_type("PERSON_NAME") == "PERSON"
    assert normalize_entity_type("Name") == "PERSON"
    assert normalize_entity_type("STAFF_ID") == "EMPLOYEE_ID"
    assert normalize_entity_type("compensation") == "SALARY"
    assert normalize_entity_type("project_id") == "PROJECT_CODE"
    assert normalize_entity_type("ssn") == "US_SSN"
    assert normalize_entity_type("secret") == "SECRET_KEY"
    assert normalize_entity_type("UNKNOWN_RANDOM_GARBAGE_XYZ_1234567890") is None
    assert normalize_entity_type("") is None
    assert normalize_entity_type(None) is None


# =========================================================================
# 2. Offline Default and Consent Gating Tests
# =========================================================================


def test_default_offline_behavior_no_network_call(monkeypatch):
    """By default, LLM inspection must be disabled and no client call attempted."""
    monkeypatch.delenv("REDACTCORE_ENTITY_LLM_ENABLED", raising=False)
    monkeypatch.delenv("REDACTCORE_ALLOW_CLOUD_LLM", raising=False)

    mock_client = MockGenAIClient()
    inspector = GeminiEntityInspector(client=mock_client)
    detector = EntityDetector(llm_inspector=inspector)

    text = "Contact Alice at alice@example.com or phone +1-555-234-5678."
    findings = detector.detect_in_text(text)

    # Deterministic findings present
    assert any(f.entity_type == "EMAIL_ADDRESS" for f in findings)
    assert any(f.entity_type == "PHONE_NUMBER" for f in findings)
    # Zero LLM calls
    assert len(mock_client.models.call_history) == 0


def test_enabled_without_consent_blocks_transmission(monkeypatch):
    """Enabling LLM without cloud consent must block transmission fail-closed."""
    monkeypatch.setenv("REDACTCORE_ENTITY_LLM_ENABLED", "true")
    monkeypatch.delenv("REDACTCORE_ALLOW_CLOUD_LLM", raising=False)
    monkeypatch.setenv("REDACTCORE_ENTITY_LLM_STRICT", "false")

    mock_client = MockGenAIClient()
    inspector = GeminiEntityInspector(api_key="mock-key-for-test", client=mock_client)
    detector = EntityDetector(llm_inspector=inspector)

    text = "Contact Alice at alice@example.com."
    findings = detector.detect_in_text(text)

    assert len(mock_client.models.call_history) == 0
    assert "cloud consent not granted" in (inspector.last_limitation or "").lower()
    # Baseline regex still works
    assert any(f.entity_type == "EMAIL_ADDRESS" for f in findings)


def test_strict_mode_raises_when_consent_denied(monkeypatch):
    """In strict mode, consent denial must raise EntityLLMConfigurationError fail-closed."""
    monkeypatch.setenv("REDACTCORE_ENTITY_LLM_ENABLED", "true")
    monkeypatch.delenv("REDACTCORE_ALLOW_CLOUD_LLM", raising=False)
    monkeypatch.setenv("REDACTCORE_ENTITY_LLM_STRICT", "true")

    inspector = GeminiEntityInspector(api_key="mock-key-for-test")
    detector = EntityDetector(llm_inspector=inspector)

    with pytest.raises(EntityLLMConfigurationError, match="cloud consent not granted"):
        detector.detect_in_text("Some sensitive document content")


def test_enforce_cloud_consent_helper(monkeypatch):
    monkeypatch.delenv("REDACTCORE_ALLOW_CLOUD_LLM", raising=False)
    with pytest.raises(EntityLLMConfigurationError, match="blocked: explicit consent not granted"):
        enforce_cloud_llm_consent()

    monkeypatch.setenv("REDACTCORE_ALLOW_CLOUD_LLM", "true")
    # Should not raise
    enforce_cloud_llm_consent()


# =========================================================================
# 3. Valid Structured Output & Offset Validation Tests
# =========================================================================


def test_valid_structured_llm_findings(monkeypatch):
    """When enabled, permitted, and configured, structured findings are parsed and mapped accurately."""
    monkeypatch.setenv("REDACTCORE_ENTITY_LLM_ENABLED", "true")
    monkeypatch.setenv("REDACTCORE_ALLOW_CLOUD_LLM", "true")

    text = "The project lead is Jane Doe and primary secret is API-KEY-998877."
    # Offsets: "Jane Doe" is at [20:28], "API-KEY-998877" is at [51:65]
    mock_entities = [
        GeminiCandidateEntity(
            entity_type="PERSON",
            text="Jane Doe",
            start=20,
            end=28,
            confidence=0.96,
            category="pii",
            rationale="Person full name",
        ),
        GeminiCandidateEntity(
            entity_type="API_KEY",
            text="API-KEY-998877",
            start=51,
            end=65,
            confidence=0.99,
            category="credential",
            rationale="Sensitive API key",
        ),
    ]

    mock_client = MockGenAIClient(entities=mock_entities)
    inspector = GeminiEntityInspector(api_key="test-key", client=mock_client)
    detector = EntityDetector(llm_inspector=inspector)

    findings = detector.detect_in_text(text)

    llm_findings = [f for f in findings if f.source == "gemini_llm"]
    assert len(llm_findings) == 2

    person_f = next(f for f in llm_findings if f.entity_type == "PERSON")
    assert person_f.raw_value == "Jane Doe"
    assert person_f.start == 20
    assert person_f.end == 28
    assert person_f.confidence == 0.96
    assert person_f.category == "pii"

    key_f = next(f for f in llm_findings if f.entity_type == "API_KEY")
    assert key_f.raw_value == "API-KEY-998877"
    assert key_f.start == 51
    assert key_f.end == 65


# =========================================================================
# 4. Untrusted Span Validation & Rejection Tests
# =========================================================================


def test_rejection_of_untrusted_malformed_spans(monkeypatch):
    """Invalid, mismatched, out-of-bounds, or unknown entity spans must be rejected."""
    monkeypatch.setenv("REDACTCORE_ENTITY_LLM_ENABLED", "true")
    monkeypatch.setenv("REDACTCORE_ALLOW_CLOUD_LLM", "true")

    text = "Short text for boundary verification."
    # text length is 37
    mock_entities = [
        # Out-of-bounds start/end
        GeminiCandidateEntity(
            entity_type="PERSON",
            text="Ghost",
            start=50,
            end=60,
            confidence=0.9,
        ),
        # Negative bounds
        GeminiCandidateEntity(
            entity_type="PERSON",
            text="Negative",
            start=-5,
            end=10,
            confidence=0.9,
        ),
        # Content mismatch: text at [0:5] is 'Short', not 'Wrong'
        GeminiCandidateEntity(
            entity_type="PERSON",
            text="Wrong",
            start=0,
            end=5,
            confidence=0.9,
        ),
        # Unknown / non-allowlisted entity type
        GeminiCandidateEntity(
            entity_type="INVALID_TYPE_BLAH",
            text="Short",
            start=0,
            end=5,
            confidence=0.9,
        ),
        # Empty text
        GeminiCandidateEntity(
            entity_type="PERSON",
            text="   ",
            start=0,
            end=3,
            confidence=0.9,
        ),
    ]

    mock_client = MockGenAIClient(entities=mock_entities)
    inspector = GeminiEntityInspector(api_key="test-key", client=mock_client)
    detector = EntityDetector(llm_inspector=inspector)

    findings = detector.detect_in_text(text)
    # None of the malformed LLM findings should have been admitted
    llm_findings = [f for f in findings if f.source == "gemini_llm"]
    assert len(llm_findings) == 0


def test_confidence_clamping(monkeypatch):
    """Confidence values outside 0.0..1.0 or invalid types must be clamped safely."""
    monkeypatch.setenv("REDACTCORE_ENTITY_LLM_ENABLED", "true")
    monkeypatch.setenv("REDACTCORE_ALLOW_CLOUD_LLM", "true")

    text = "Testing confidence score validation on Target Value."
    # "Target Value" is at [39:51]
    mock_entities = [
        GeminiCandidateEntity(
            entity_type="PERSON",
            text="Target Value",
            start=39,
            end=51,
            confidence=2.5,  # Exceeds 1.0
        ),
    ]

    mock_client = MockGenAIClient(entities=mock_entities)
    inspector = GeminiEntityInspector(api_key="test-key", client=mock_client)
    detector = EntityDetector(llm_inspector=inspector)

    findings = detector.detect_in_text(text)
    llm_f = next(f for f in findings if f.source == "gemini_llm")
    assert llm_f.confidence == 1.0


# =========================================================================
# 5. Deduplication and Overlap Handling Tests
# =========================================================================


def test_deduplication_regex_priority(monkeypatch):
    """Deterministic regex finding takes precedence over duplicate and overlapping LLM suggestions."""
    monkeypatch.setenv("REDACTCORE_ENTITY_LLM_ENABLED", "true")
    monkeypatch.setenv("REDACTCORE_ALLOW_CLOUD_LLM", "true")

    text = "Contact Alice Montgomery at alice.montgomery@example.com."
    # Regex will find EMAIL_ADDRESS at [28:56]
    # Regex will also find PERSON "Alice Montgomery" if preceded by title, or LLM will find it
    mock_entities = [
        # Exact duplicate of the email regex
        GeminiCandidateEntity(
            entity_type="EMAIL_ADDRESS",
            text="alice.montgomery@example.com",
            start=28,
            end=56,
            confidence=0.88,
        ),
        # Overlapping suggestion covering "at alice.montgomery@example.com"
        GeminiCandidateEntity(
            entity_type="EMAIL_ADDRESS",
            text="at alice.montgomery@example.com",
            start=25,
            end=56,
            confidence=0.75,
        ),
        # Non-overlapping novel finding
        GeminiCandidateEntity(
            entity_type="PERSON",
            text="Alice Montgomery",
            start=8,
            end=24,
            confidence=0.95,
        ),
    ]

    mock_client = MockGenAIClient(entities=mock_entities)
    inspector = GeminiEntityInspector(api_key="test-key", client=mock_client)
    detector = EntityDetector(llm_inspector=inspector)

    findings = detector.detect_in_text(text)

    email_findings = [f for f in findings if f.entity_type == "EMAIL_ADDRESS"]
    assert len(email_findings) == 1
    assert email_findings[0].source == "regex"  # Regex retained, duplicate LLM discarded

    person_findings = [f for f in findings if f.entity_type == "PERSON"]
    assert len(person_findings) == 1
    assert person_findings[0].source == "gemini_llm"
    assert person_findings[0].raw_value == "Alice Montgomery"


# =========================================================================
# 6. Long Document Chunking and Global Offset Mapping Tests
# =========================================================================


def test_chunking_and_global_offset_accuracy(monkeypatch):
    """Text exceeding max_chunk_size is chunked with global offsets accurately mapped back."""
    monkeypatch.setenv("REDACTCORE_ENTITY_LLM_ENABLED", "true")
    monkeypatch.setenv("REDACTCORE_ALLOW_CLOUD_LLM", "true")

    # Construct a long text: 3 paragraphs of ~250 chars each
    p1 = "Paragraph one with harmless text. " * 6 + "\n\n"
    p2 = "Paragraph two containing sensitive secret key SEC-ALPHA-8820 here. " * 3 + "\n\n"
    p3 = "Paragraph three with trailing text. " * 6

    full_text = p1 + p2 + p3

    # Use a small chunk size to force chunking
    chunk_size = 300
    overlap = 50

    chunks = chunk_text(full_text, max_chunk_size=chunk_size, overlap=overlap)
    assert len(chunks) >= 2

    # Verify every chunk maps correctly to full_text
    for chunk_str, g_offset in chunks:
        assert full_text[g_offset : g_offset + len(chunk_str)] == chunk_str


def test_chunked_llm_inspection_offset_mapping(monkeypatch):
    """Candidate spans returned in a chunk must map accurately to full_text global offsets."""
    monkeypatch.setenv("REDACTCORE_ENTITY_LLM_ENABLED", "true")
    monkeypatch.setenv("REDACTCORE_ALLOW_CLOUD_LLM", "true")

    prefix = "Padded intro text. " * 20  # ~380 chars
    secret = "EMP-998811"
    suffix = " Trailing harmless content. " * 20
    full_text = prefix + secret + suffix

    secret_global_start = full_text.index(secret)
    secret_global_end = secret_global_start + len(secret)

    # Configure inspector with small chunk size so secret is in chunk 2
    inspector = GeminiEntityInspector(
        api_key="test-key",
        chunk_size=300,
        chunk_overlap=50,
    )

    chunks = chunk_text(full_text, max_chunk_size=300, overlap=50)
    # Find which chunk contains the secret
    matching_chunk_idx = None
    rel_start = -1
    rel_end = -1
    for c_idx, (c_str, g_offset) in enumerate(chunks):
        if secret in c_str:
            matching_chunk_idx = c_idx
            rel_start = c_str.index(secret)
            rel_end = rel_start + len(secret)
            break

    assert matching_chunk_idx is not None

    def mock_generate(model, contents, config=None):
        prompt_text = contents[0].parts[0].text
        # If secret is in this chunk prompt, return it
        resp = type("MockResp", (), {})()
        if secret in prompt_text:
            cand = GeminiCandidateEntity(
                entity_type="EMPLOYEE_ID",
                text=secret,
                start=rel_start,
                end=rel_end,
                confidence=0.98,
            )
            resp.parsed = GeminiEntityExtractionResponse(entities=[cand])
            resp.text = json.dumps({"entities": [cand.model_dump()], "warnings": []})
        else:
            resp.parsed = GeminiEntityExtractionResponse(entities=[])
            resp.text = json.dumps({"entities": [], "warnings": []})
        return resp

    mock_client = type("MockClient", (), {})()
    mock_models = type("MockModels", (), {})()
    mock_models.generate_content = mock_generate
    mock_client.models = mock_models

    inspector._client = mock_client
    findings = inspector.inspect_text(full_text)

    emp_findings = [f for f in findings if f.entity_type == "EMPLOYEE_ID"]
    assert len(emp_findings) == 1
    f = emp_findings[0]
    assert f.start == secret_global_start
    assert f.end == secret_global_end
    assert full_text[f.start : f.end] == secret


# =========================================================================
# 7. Fail-Closed and Fallback Resilience Tests
# =========================================================================


def test_api_failure_fallback_deterministic_mode(monkeypatch):
    """In non-strict mode, API exceptions fall back to deterministic findings without breaking."""
    monkeypatch.setenv("REDACTCORE_ENTITY_LLM_ENABLED", "true")
    monkeypatch.setenv("REDACTCORE_ALLOW_CLOUD_LLM", "true")
    monkeypatch.setenv("REDACTCORE_ENTITY_LLM_STRICT", "false")

    mock_client = MockGenAIClient(raise_exc=RuntimeError("Connection timeout to Gemini"))
    inspector = GeminiEntityInspector(api_key="test-key", client=mock_client)
    detector = EntityDetector(llm_inspector=inspector)

    text = "Important info: alice@example.com is the contact."
    findings = detector.detect_in_text(text)

    # Baseline regex finding is preserved
    assert any(f.entity_type == "EMAIL_ADDRESS" for f in findings)
    assert "Gemini LLM inspection failed" in (inspector.last_limitation or "")


def test_api_failure_strict_mode_raises(monkeypatch):
    """In strict mode, an API error must fail closed by raising EntityLLMError."""
    monkeypatch.setenv("REDACTCORE_ENTITY_LLM_ENABLED", "true")
    monkeypatch.setenv("REDACTCORE_ALLOW_CLOUD_LLM", "true")
    monkeypatch.setenv("REDACTCORE_ENTITY_LLM_STRICT", "true")

    mock_client = MockGenAIClient(raise_exc=RuntimeError("Simulated API failure"))
    inspector = GeminiEntityInspector(api_key="test-key", client=mock_client)
    detector = EntityDetector(llm_inspector=inspector)

    with pytest.raises(Exception):
        detector.detect_in_text("Some text that requires inspection.")


def test_max_chunks_limit_enforced_in_strict_mode(monkeypatch):
    """In strict mode, exceeding max_chunks raises EntityLLMPayloadTooLargeError."""
    monkeypatch.setenv("REDACTCORE_ENTITY_LLM_ENABLED", "true")
    monkeypatch.setenv("REDACTCORE_ALLOW_CLOUD_LLM", "true")
    monkeypatch.setenv("REDACTCORE_ENTITY_LLM_STRICT", "true")

    mock_client = MockGenAIClient()
    inspector = GeminiEntityInspector(
        api_key="test-key",
        chunk_size=100,
        chunk_overlap=10,
        max_chunks=2,
        client=mock_client,
    )

    long_text = "A" * 500  # Will produce > 2 chunks
    with pytest.raises(EntityLLMPayloadTooLargeError, match="exceeding max limit"):
        inspector.inspect_text(long_text)


# =========================================================================
# 8. Observability & Zero Secret Exposure Tests
# =========================================================================


def test_health_check_zero_secret_leakage(monkeypatch):
    """Health check must never leak API keys, returning boolean has_api_key only."""
    fake_secret_key = "AIzaSySecretFakeKeyNeverExpose"
    monkeypatch.setenv("REDACTCORE_GEMINI_API_KEY", fake_secret_key)
    monkeypatch.setenv("REDACTCORE_ENTITY_LLM_ENABLED", "true")
    monkeypatch.setenv("REDACTCORE_ALLOW_CLOUD_LLM", "true")

    inspector = GeminiEntityInspector()
    health = inspector.check_health()

    assert health["has_api_key"] is True
    assert health["enabled"] is True
    assert health["cloud_consent_granted"] is True

    # Assert secret string is nowhere in health output or serialized JSON
    health_json = json.dumps(health)
    assert fake_secret_key not in health_json


def test_api_health_endpoint_contract(client):
    """GET /health must include llm_inspector without exposing secrets."""
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "llm_inspector" in data
    llm_info = data["llm_inspector"]
    assert "enabled" in llm_info
    assert "cloud_consent_granted" in llm_info
    assert "has_api_key" in llm_info
    assert isinstance(llm_info["has_api_key"], bool)
    assert "api_key" not in llm_info


# =========================================================================
# 9. PII Exclusion in Serialized Summaries and Manifests
# =========================================================================


def test_raw_pii_absent_from_serialized_finding_and_manifest():
    """EntityFinding.raw_value is excluded from serialization; only digests appear in manifests."""
    finding = EntityFinding(
        finding_id="llm_0_12345678",
        entity_type="PERSON",
        value_digest="mockdigest1234567890abcdef",
        page_or_section="page_1",
        source_ref="block_0",
        confidence=0.95,
        source="gemini_llm",
        category="pii",
        rationale="Person name",
        raw_value="VeryConfidentialRealName",
    )

    # 1. Pydantic serialization excludes raw_value
    serialized = finding.model_dump_json()
    assert "VeryConfidentialRealName" not in serialized
    assert "mockdigest1234567890abcdef" in serialized

    # 2. safe_summary() excludes raw_value
    summary = finding.safe_summary()
    assert "raw_value" not in summary
    assert "VeryConfidentialRealName" not in str(summary)
    assert summary["value_digest"] == "mockdigest1234567890abcdef"

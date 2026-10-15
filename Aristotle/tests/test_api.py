"""Integration and unit tests for Aristotle API endpoints and Gemini provider mocking."""

import logging
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from aristotle_api.main import app, get_provider
from aristotle_api.models import PolicyRule, RedactionPolicy
from aristotle_api.provider import (
    GeminiPolicyProvider,
    PolicySchemaValidationError,
    UpstreamProviderError,
)


@pytest.fixture(autouse=True)
def clean_environment():
    """Ensure clean environment and dependency overrides for each test."""
    original_api_key = os.environ.get("GEMINI_API_KEY")
    original_model = os.environ.get("ARISTOTLE_MODEL")
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()
    if original_api_key is not None:
        os.environ["GEMINI_API_KEY"] = original_api_key
    else:
        os.environ.pop("GEMINI_API_KEY", None)

    if original_model is not None:
        os.environ["ARISTOTLE_MODEL"] = original_model
    else:
        os.environ.pop("ARISTOTLE_MODEL", None)


class MockProvider:
    """Mock policy draft provider for deterministic testing."""

    def __init__(self, policy: RedactionPolicy, warnings: list[str] | None = None, model: str = "mock-gemini-2.5-flash"):
        self.policy = policy
        self.warnings = warnings or []
        self.model = model

    async def draft_policy(self, request_text: str, policy_id: str | None = None, policy_name: str | None = None):
        return self.policy, self.warnings


class ErrorProvider:
    """Mock provider that raises specified exceptions."""

    def __init__(self, exception_to_raise: Exception, model: str = "mock-gemini-2.5-flash"):
        self.exception_to_raise = exception_to_raise
        self.model = model

    async def draft_policy(self, request_text: str, policy_id: str | None = None, policy_name: str | None = None):
        raise self.exception_to_raise


def test_healthz_works_without_key():
    """GET /healthz must return 200 {'status': 'ok'} even without GEMINI_API_KEY."""
    os.environ.pop("GEMINI_API_KEY", None)
    with TestClient(app) as client:
        resp = client.get("/healthz")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


def test_missing_key_gives_503_and_no_policy():
    """POST /v1/policy/draft must return 503 and no policy if GEMINI_API_KEY is unset."""
    os.environ.pop("GEMINI_API_KEY", None)
    with TestClient(app) as client:
        resp = client.post(
            "/v1/policy/draft",
            json={"request": "Redact employee compensation and internal emails."},
        )
        assert resp.status_code == 503
        data = resp.json()
        assert "policy" not in data
        assert "GEMINI_API_KEY" in data["detail"]


def test_valid_mocked_gemini_result_validates():
    """POST /v1/policy/draft returns validated RedactCore policy when provider succeeds."""
    mock_policy = RedactionPolicy(
        policy_id="sales-policy",
        name="Sales Policy",
        version="1.0.0",
        description="Redact compensation",
        default_action="allow",
        rules=[
            PolicyRule(entity_type="SALARY", action="redact", replacement="[SALARY REDACTED]"),
            PolicyRule(entity_type="EMAIL_ADDRESS", action="mask", mask_char="*"),
        ],
    )
    mock_provider = MockProvider(
        policy=mock_policy,
        warnings=["Draft policy generated"],
        model="gemini-2.5-flash",
    )
    app.dependency_overrides[get_provider] = lambda: mock_provider

    with TestClient(app) as client:
        resp = client.post(
            "/v1/policy/draft",
            json={"request": "Redact salary and mask email", "policy_id": "sales-policy"},
        )
        assert resp.status_code == 200
        data = resp.json()

        # Policy shape validation
        assert data["policy"]["policy_id"] == "sales-policy"
        assert len(data["policy"]["rules"]) == 2
        assert data["policy"]["rules"][0]["entity_type"] == "SALARY"
        assert data["policy"]["rules"][0]["action"] == "redact"
        assert data["policy"]["rules"][1]["entity_type"] == "EMAIL_ADDRESS"
        assert data["policy"]["rules"][1]["action"] == "mask"

        # Metadata validation
        assert data["draft_only"] is True
        assert data["model"] == "gemini-2.5-flash"
        assert "warnings" in data
        assert len(data["warnings"]) >= 1


def test_malformed_upstream_output_fails_safely():
    """Malformed or schema-violating output from Gemini fails safely with HTTP 502 and no policy."""
    mock_provider = ErrorProvider(PolicySchemaValidationError("Schema mismatch"))
    app.dependency_overrides[get_provider] = lambda: mock_provider

    with TestClient(app) as client:
        resp = client.post(
            "/v1/policy/draft",
            json={"request": "Redact salary"},
        )
        assert resp.status_code == 502
        data = resp.json()
        assert "policy" not in data
        assert "schema" in data["detail"].lower() or "upstream" in data["detail"].lower()


def test_upstream_api_failure_fails_safely():
    """Network or upstream API failure returns safe HTTP 502 and no policy."""
    mock_provider = ErrorProvider(UpstreamProviderError("Gemini unavailable"))
    app.dependency_overrides[get_provider] = lambda: mock_provider

    with TestClient(app) as client:
        resp = client.post(
            "/v1/policy/draft",
            json={"request": "Redact salary"},
        )
        assert resp.status_code == 502
        data = resp.json()
        assert "policy" not in data
        assert "upstream" in data["detail"].lower()


def test_empty_and_oversized_requests_rejected():
    """Empty, blank, and requests exceeding 8000 characters must return HTTP 400."""
    mock_policy = RedactionPolicy(policy_id="test", rules=[])
    app.dependency_overrides[get_provider] = lambda: MockProvider(mock_policy)

    with TestClient(app) as client:
        # Empty string
        resp = client.post("/v1/policy/draft", json={"request": ""})
        assert resp.status_code == 400
        assert "policy" not in resp.json()

        # Whitespace-only string
        resp = client.post("/v1/policy/draft", json={"request": "    \n\t   "})
        assert resp.status_code == 400
        assert "policy" not in resp.json()

        # Oversized string (> 8000 characters)
        oversized = "a" * 8001
        resp = client.post("/v1/policy/draft", json={"request": oversized})
        assert resp.status_code == 400
        assert "policy" not in resp.json()


def test_duplicate_rules_deduped_in_provider():
    """Duplicate rules produced by the model are deterministically deduped."""
    raw_policy = RedactionPolicy(
        policy_id="duplicate-test",
        name="Duplicate Test",
        rules=[
            PolicyRule(entity_type="SALARY", action="allow"),
            PolicyRule(entity_type="SALARY", action="redact"),  # Conflicting duplicate
            PolicyRule(entity_type="PHONE_NUMBER", action="mask"),
            PolicyRule(entity_type="PHONE_NUMBER", action="mask"),  # Identical duplicate
        ],
    )

    provider = GeminiPolicyProvider(api_key="fake-key-for-test")
    # Mock client.aio.models.generate_content
    fake_response = MagicMock()
    fake_response.text = raw_policy.model_dump_json()
    provider.client.aio.models.generate_content = AsyncMock(return_value=fake_response)

    app.dependency_overrides[get_provider] = lambda: provider

    with TestClient(app) as client:
        resp = client.post(
            "/v1/policy/draft",
            json={"request": "Clean and dedupe rules"},
        )
        assert resp.status_code == 200
        data = resp.json()
        rules = data["policy"]["rules"]

        # Exactly 2 rules (SALARY and PHONE_NUMBER)
        assert len(rules) == 2
        salary_rule = next(r for r in rules if r["entity_type"] == "SALARY")
        assert salary_rule["action"] == "redact"  # Conservative resolution

        phone_rule = next(r for r in rules if r["entity_type"] == "PHONE_NUMBER")
        assert phone_rule["action"] == "mask"

        # Check deduplication warnings
        warnings = data["warnings"]
        assert any("Conflicting rules found for entity type 'SALARY'" in w for w in warnings)
        assert any("duplicate rule(s) for entity type 'PHONE_NUMBER'" in w for w in warnings)


def test_every_successful_response_has_draft_only_true():
    """Invariant: every successful draft response must have draft_only=True."""
    mock_policy = RedactionPolicy(
        policy_id="invariants-test",
        rules=[PolicyRule(entity_type="PERSON", action="redact")],
    )
    app.dependency_overrides[get_provider] = lambda: MockProvider(mock_policy)

    with TestClient(app) as client:
        resp = client.post(
            "/v1/policy/draft",
            json={"request": "Redact person names"},
        )
        assert resp.status_code == 200
        assert resp.json().get("draft_only") is True


def test_no_request_text_or_secret_appears_in_logs_or_errors(caplog):
    """Security Invariant: Sensitive request text and secrets must never appear in error responses or logs."""
    sensitive_prompt = "CONFIDENTIAL_MERGER_PROJECT_TITAN_DO_NOT_DISCLOSE"
    fake_secret_key = "AIzaSyFakeSecretKeyForSecurityVerification12345"

    with patch.dict(os.environ, {"GEMINI_API_KEY": fake_secret_key}):
        # Mock provider throwing an error
        mock_provider = ErrorProvider(UpstreamProviderError("Simulated upstream error"))
        app.dependency_overrides[get_provider] = lambda: mock_provider

        with caplog.at_level(logging.DEBUG):
            with TestClient(app) as client:
                resp = client.post(
                    "/v1/policy/draft",
                    json={"request": sensitive_prompt},
                )
                assert resp.status_code == 502

                # Verify response body does not contain sensitive prompt or secret key
                response_text = resp.text
                assert sensitive_prompt not in response_text
                assert fake_secret_key not in response_text

                # Verify log records do not contain sensitive prompt or secret key
                for record in caplog.records:
                    assert sensitive_prompt not in record.message
                    assert fake_secret_key not in record.message


def test_gemini_provider_with_markdown_fences():
    """Gemini provider handles JSON responses wrapped in markdown code fences."""
    raw_policy = RedactionPolicy(
        policy_id="fenced-policy",
        name="Fenced Policy",
        rules=[PolicyRule(entity_type="PASSWORD", action="redact")],
    )
    fenced_json = f"```json\n{raw_policy.model_dump_json()}\n```"

    provider = GeminiPolicyProvider(api_key="fake-key")
    fake_response = MagicMock()
    fake_response.text = fenced_json
    provider.client.aio.models.generate_content = AsyncMock(return_value=fake_response)

    app.dependency_overrides[get_provider] = lambda: provider

    with TestClient(app) as client:
        resp = client.post(
            "/v1/policy/draft",
            json={"request": "Redact passwords", "policy_id": "custom-id"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["policy"]["policy_id"] == "custom-id"
        assert data["policy"]["rules"][0]["entity_type"] == "PASSWORD"

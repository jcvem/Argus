"""Gemini LLM entity inspection provider for Argus RedactCore.

Extends the deterministic entity recognition engine with LLM inspection using
the official google-genai SDK.

Security & Privacy Contracts:
- Default OFF: REDACTCORE_ENTITY_LLM_ENABLED=false
- Dedicated Cloud Consent Gate: REDACTCORE_ALLOW_CLOUD_LLM=false (independent of OCR)
- Untrusted Output: Every returned candidate span is validated against the source
  chunk bounds and character contents; out-of-bounds or mismatched spans are rejected.
- Deterministic Policy Primacy: Findings are fed into the authoritative Policy Engine;
  LLM suggestions never override or weaken redaction policy rules.
- Zero Secret/PII Leakage: Prompts, raw document content, and API keys are NEVER logged,
  printed, or exposed in manifests or health endpoints.
"""

import json
import logging
import os
import re
import time
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

from redact_core.env import load_env_safely
from redact_core.hashing import hash_sensitive_value
from redact_core.models import EntityFinding

# Ensure environment is loaded safely if local .env exists
load_env_safely()

logger = logging.getLogger(__name__)


# Exception Hierarchy
class EntityLLMError(Exception):
    """Base exception for all Entity LLM inspection failures."""
    pass


class EntityLLMConfigurationError(EntityLLMError):
    """Raised when provider configuration or credentials are missing or invalid."""
    pass


class EntityLLMUnavailableError(EntityLLMError):
    """Raised when the required google-genai SDK is not installed or service is unavailable."""
    pass


class EntityLLMTimeoutError(EntityLLMError):
    """Raised when an LLM inspection request exceeds the configured timeout."""
    pass


class EntityLLMPayloadTooLargeError(EntityLLMError):
    """Raised when payload or chunk count exceeds configured limits in strict mode."""
    pass


class EntityLLMResponseParseError(EntityLLMError):
    """Raised when LLM response cannot be parsed into structured candidate entities."""
    pass


# Cloud Consent & Feature Gating
def is_cloud_llm_permitted() -> bool:
    """Checks whether explicit user consent has been granted for cloud LLM transmission.

    Defaults to FALSE (fail-closed) to prevent unauthorized document exfiltration.
    Independent of OCR consent to prevent unintended cross-subsystem transmission.
    """
    val = os.environ.get("REDACTCORE_ALLOW_CLOUD_LLM", "false").strip().lower()
    return val in ("true", "1", "yes", "on")


def is_entity_llm_enabled() -> bool:
    """Checks whether the Gemini LLM entity inspection feature is enabled.

    Defaults to FALSE (fail-closed) to guarantee offline-safe default operation.
    """
    val = os.environ.get("REDACTCORE_ENTITY_LLM_ENABLED", "false").strip().lower()
    return val in ("true", "1", "yes", "on")


def is_entity_llm_strict() -> bool:
    """Checks whether strict mode is enabled for LLM entity inspection.

    When TRUE, any failure in LLM inspection (timeout, malformed output, API failure)
    raises an exception (fail-closed) rather than silently falling back to deterministic
    detection. Defaults to FALSE.
    """
    val = os.environ.get("REDACTCORE_ENTITY_LLM_STRICT", "false").strip().lower()
    return val in ("true", "1", "yes", "on")


def enforce_cloud_llm_consent(provider_name: str = "gemini_llm") -> None:
    """Enforces explicit cloud LLM consent gate before any cloud transmission.

    Raises:
        EntityLLMConfigurationError if REDACTCORE_ALLOW_CLOUD_LLM is false.
    """
    if not is_cloud_llm_permitted():
        raise EntityLLMConfigurationError(
            f"Cloud LLM inspection upload for provider '{provider_name}' is blocked: "
            "explicit consent not granted. Set REDACTCORE_ALLOW_CLOUD_LLM=true to permit transmission."
        )


# Canonical Entity Types and Normalization Map
CANONICAL_ENTITY_TYPES: set[str] = {
    "EMAIL_ADDRESS",
    "PHONE_NUMBER",
    "EMPLOYEE_ID",
    "SALARY",
    "PROJECT_CODE",
    "PERSON",
    "ADDRESS",
    "US_SSN",
    "CREDIT_CARD",
    "IP_ADDRESS",
    "IBAN_CODE",
    "DATE_TIME",
    "LOCATION",
    "ORGANIZATION",
    "FINANCIAL",
    "MEDICAL_INFO",
    "SECRET_KEY",
    "API_KEY",
    "PASSWORD",
    "NATIONAL_ID",
    "DRIVER_LICENSE",
    "PASSPORT",
}

ENTITY_TYPE_ALIASES: dict[str, str] = {
    "EMAIL": "EMAIL_ADDRESS",
    "EMAIL_ADDRESS": "EMAIL_ADDRESS",
    "PHONE": "PHONE_NUMBER",
    "PHONE_NUMBER": "PHONE_NUMBER",
    "TELEPHONE": "PHONE_NUMBER",
    "MOBILE": "PHONE_NUMBER",
    "NAME": "PERSON",
    "PERSON": "PERSON",
    "PERSON_NAME": "PERSON",
    "INDIVIDUAL": "PERSON",
    "EMPLOYEE": "EMPLOYEE_ID",
    "EMPLOYEE_ID": "EMPLOYEE_ID",
    "STAFF_ID": "EMPLOYEE_ID",
    "SALARY": "SALARY",
    "COMPENSATION": "SALARY",
    "MONEY": "SALARY",
    "PROJECT": "PROJECT_CODE",
    "PROJECT_CODE": "PROJECT_CODE",
    "PROJECT_ID": "PROJECT_CODE",
    "ADDRESS": "ADDRESS",
    "STREET_ADDRESS": "ADDRESS",
    "LOCATION": "LOCATION",
    "SSN": "US_SSN",
    "US_SSN": "US_SSN",
    "CREDIT_CARD": "CREDIT_CARD",
    "CREDITCARD": "CREDIT_CARD",
    "IP_ADDRESS": "IP_ADDRESS",
    "IP": "IP_ADDRESS",
    "IBAN": "IBAN_CODE",
    "IBAN_CODE": "IBAN_CODE",
    "API_KEY": "API_KEY",
    "SECRET": "SECRET_KEY",
    "SECRET_KEY": "SECRET_KEY",
    "PASSWORD": "PASSWORD",
    "ORGANIZATION": "ORGANIZATION",
    "ORG": "ORGANIZATION",
    "COMPANY": "ORGANIZATION",
    "NATIONAL_ID": "NATIONAL_ID",
    "PASSPORT": "PASSPORT",
    "DRIVER_LICENSE": "DRIVER_LICENSE",
}


def normalize_entity_type(raw_type: str | None) -> str | None:
    """Validates and normalizes raw entity type string against the canonical allowlist."""
    if not raw_type or not isinstance(raw_type, str):
        return None
    cleaned = raw_type.strip().upper().replace(" ", "_").replace("-", "_")
    if cleaned in ENTITY_TYPE_ALIASES:
        return ENTITY_TYPE_ALIASES[cleaned]
    if cleaned in CANONICAL_ENTITY_TYPES:
        return cleaned
    # Safe regex fallback for well-formed custom upper-case entity names
    if re.match(r"^[A-Z0-9_]{3,30}$", cleaned):
        return cleaned
    return None


# Structured Pydantic Response Schema for Gemini
class GeminiCandidateEntity(BaseModel):
    """A candidate sensitive entity span extracted by Gemini."""
    model_config = ConfigDict(extra="ignore")

    entity_type: str
    text: str
    start: int
    end: int
    confidence: float = 1.0
    category: str | None = None
    rationale: str | None = None


class GeminiEntityExtractionResponse(BaseModel):
    """Structured response container for Gemini LLM inspection."""
    model_config = ConfigDict(extra="ignore")

    entities: list[GeminiCandidateEntity] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


GEMINI_ENTITY_INSPECTION_PROMPT = (
    "You are a high-precision privacy and sensitive information inspection engine. "
    "Analyze the provided text chunk and identify all candidate sensitive entity spans, including: "
    "PERSON names, EMAIL_ADDRESS, PHONE_NUMBER, EMPLOYEE_ID, SALARY/compensation, PROJECT_CODE, "
    "ADDRESS, US_SSN, CREDIT_CARD, IP_ADDRESS, and credentials/secrets/API keys.\n\n"
    "For each sensitive entity detected, return:\n"
    "1. 'entity_type': the canonical entity category (e.g. PERSON, EMAIL_ADDRESS, PHONE_NUMBER, "
    "SALARY, EMPLOYEE_ID, PROJECT_CODE, ADDRESS, US_SSN, CREDIT_CARD, SECRET_KEY).\n"
    "2. 'text': the EXACT substring as it appears in the text chunk. Do not alter casing, whitespace, or punctuation.\n"
    "3. 'start': the exact 0-indexed character start offset of the entity in the chunk.\n"
    "4. 'end': the exact 0-indexed character end offset (exclusive) in the chunk such that chunk[start:end] == text.\n"
    "5. 'confidence': confidence score between 0.0 and 1.0.\n"
    "6. 'category': short category description (e.g. 'pii', 'financial', 'internal_id', 'credentials').\n"
    "7. 'rationale': short safe rationale explaining why it is sensitive (DO NOT repeat secrets or raw values).\n\n"
    "Strict requirement: ONLY return entities that actually exist within the chunk. "
    "Offsets must precisely match chunk[start:end] == text."
)


def chunk_text(
    text: str,
    max_chunk_size: int = 4000,
    overlap: int = 200,
) -> list[tuple[str, int]]:
    """Splits long text into bounded chunks with global character offset tracking.

    Returns a list of tuples: (chunk_text, global_start_char_offset).
    Maintains deterministic boundaries and natural sentence/paragraph splits.
    """
    if not text:
        return []

    if len(text) <= max_chunk_size:
        return [(text, 0)]

    chunks: list[tuple[str, int]] = []
    total_len = len(text)
    curr_pos = 0

    while curr_pos < total_len:
        end_pos = min(curr_pos + max_chunk_size, total_len)

        if end_pos < total_len:
            # Look for natural split near end_pos (search backwards within overlap region)
            search_start = max(curr_pos, end_pos - overlap)
            segment = text[search_start:end_pos]

            split_offset = -1
            # 1. Paragraph boundary
            p_idx = segment.rfind("\n\n")
            if p_idx != -1:
                split_offset = search_start + p_idx + 2
            else:
                # 2. Line boundary
                l_idx = segment.rfind("\n")
                if l_idx != -1:
                    split_offset = search_start + l_idx + 1
                else:
                    # 3. Sentence / word boundary
                    s_idx = segment.rfind(". ")
                    if s_idx != -1:
                        split_offset = search_start + s_idx + 2
                    else:
                        w_idx = segment.rfind(" ")
                        if w_idx != -1:
                            split_offset = search_start + w_idx + 1

            if split_offset > curr_pos:
                end_pos = split_offset

        chunk_slice = text[curr_pos:end_pos]
        chunks.append((chunk_slice, curr_pos))

        if end_pos >= total_len:
            break

        # Advance with overlap
        step = max(1, end_pos - curr_pos - overlap)
        curr_pos += step

    return chunks


class GeminiEntityInspector:
    """Gemini-based LLM entity inspection provider using the official google-genai SDK.

    Security Contract:
    - Default OFF: REDACTCORE_ENTITY_LLM_ENABLED=false
    - Gated by REDACTCORE_ALLOW_CLOUD_LLM=true (dedicated cloud consent gate)
    - Untrusted suggestions: every returned span is rigorously verified against source text
    - Policy engine remains authoritative: findings are subject to policy rules
    - Zero secrets/PII in logs, health, or manifests
    """

    name = "gemini_llm"
    version = "1.0.0"

    def __init__(
        self,
        mode: str | None = None,
        model: str | None = None,
        api_key: str | None = None,
        project_id: str | None = None,
        location: str | None = None,
        timeout_seconds: float | None = None,
        max_retries: int | None = None,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
        min_chunk_chars: int | None = None,
        max_chunks: int | None = None,
        client: Any = None,
    ):
        # API key loading: prefer RedactCore-specific, fallback to GEMINI_API_KEY
        self.api_key = (
            api_key
            or os.environ.get("REDACTCORE_ENTITY_LLM_API_KEY")
            or os.environ.get("REDACTCORE_GEMINI_API_KEY")
            or os.environ.get("GEMINI_API_KEY")
        )
        self.project_id = (
            project_id
            or os.environ.get("REDACTCORE_GCP_PROJECT")
            or os.environ.get("GOOGLE_CLOUD_PROJECT")
        )
        self.location = (
            location
            or os.environ.get("REDACTCORE_GEMINI_LOCATION")
            or os.environ.get("REDACTCORE_DOCUMENT_AI_LOCATION", "us-central1")
        )

        # Mode resolution: if api_key is present and mode not explicitly vertex, default to api
        raw_mode = mode or os.environ.get("REDACTCORE_ENTITY_LLM_MODE") or os.environ.get("REDACTCORE_GEMINI_MODE")
        if raw_mode:
            self.mode = raw_mode.lower().strip()
        else:
            self.mode = "api" if self.api_key else "vertex"

        self.model = (
            model
            or os.environ.get("REDACTCORE_ENTITY_LLM_MODEL")
            or os.environ.get("REDACTCORE_GEMINI_MODEL", "gemini-3.8-flash")
        )

        self.timeout_seconds = float(
            os.environ.get(
                "REDACTCORE_ENTITY_LLM_TIMEOUT",
                str(timeout_seconds if timeout_seconds is not None else 30.0),
            )
        )
        self.max_retries = int(
            os.environ.get(
                "REDACTCORE_ENTITY_LLM_MAX_RETRIES",
                str(max_retries if max_retries is not None else 2),
            )
        )
        self.chunk_size = int(
            os.environ.get(
                "REDACTCORE_ENTITY_LLM_CHUNK_SIZE",
                str(chunk_size if chunk_size is not None else 4000),
            )
        )
        self.chunk_overlap = int(
            os.environ.get(
                "REDACTCORE_ENTITY_LLM_CHUNK_OVERLAP",
                str(chunk_overlap if chunk_overlap is not None else 200),
            )
        )
        self.min_chunk_chars = int(
            os.environ.get(
                "REDACTCORE_ENTITY_LLM_MIN_CHUNK_CHARS",
                str(min_chunk_chars if min_chunk_chars is not None else 15),
            )
        )
        self.max_chunks = int(
            os.environ.get(
                "REDACTCORE_ENTITY_LLM_MAX_CHUNKS",
                str(max_chunks if max_chunks is not None else 25),
            )
        )

        self._client = client
        self.last_limitation: str | None = None

    def is_enabled(self) -> bool:
        """Returns True if the LLM entity inspection feature is explicitly enabled."""
        return is_entity_llm_enabled()

    def is_cloud_consent_granted(self) -> bool:
        """Returns True if explicit user cloud consent is granted for LLM inspection."""
        return is_cloud_llm_permitted()

    def is_strict(self) -> bool:
        """Returns True if fail-closed strict mode is configured."""
        return is_entity_llm_strict()

    def is_available(self) -> bool:
        """Checks if the official google-genai SDK is installed."""
        try:
            from google import genai  # noqa: F401
            return True
        except ImportError:
            return False

    def is_configured(self) -> bool:
        """Returns True if credentials/project are configured for the selected mode."""
        if self.mode == "api":
            return bool(self.api_key) and self._api_key_has_expected_format()
        elif self.mode == "vertex":
            return bool(self.project_id)
        return False

    def _api_key_has_expected_format(self) -> bool:
        """Reject obvious OAuth tokens before sending a request to the Gemini API."""
        if not self.api_key:
            return False
        # Gemini AI Studio currently issues both legacy AIza-prefixed keys and
        # newer AQ-prefixed authentication keys. OAuth access tokens such as
        # ya29.* are not API keys and must not be sent to the Gemini API.
        return self.api_key.startswith(("AIza", "AQ."))

    def check_health(self) -> dict[str, Any]:
        """Provides subsystem observability reporting booleans only (never secrets)."""
        return {
            "enabled": self.is_enabled(),
            "cloud_consent_granted": self.is_cloud_consent_granted(),
            "available": self.is_available(),
            "configured": self.is_configured(),
            "mode": self.mode,
            "model": self.model,
            "has_api_key": bool(self.api_key),
            "has_gcp_project": bool(self.project_id),
            "has_location": bool(self.location),
            "strict_mode": self.is_strict(),
            "limitation": self.last_limitation,
        }

    def _get_client(self) -> Any:
        if self._client is not None:
            return self._client

        if not self.is_available():
            raise EntityLLMUnavailableError(
                "google-genai SDK is not installed. "
                "Install optional dependency: pip install 'redact-core[ocr-gemini]'"
            )

        from google import genai

        if self.mode == "api":
            if not self.api_key:
                raise EntityLLMConfigurationError(
                    "Gemini API mode requested but REDACTCORE_GEMINI_API_KEY/GEMINI_API_KEY is not set."
                )
            if not self._api_key_has_expected_format():
                raise EntityLLMConfigurationError(
                    "Gemini API credential has the wrong format. Use a Gemini AI Studio API key "
                    "starting with 'AIza' or 'AQ.', not an OAuth access token such as 'ya29.'."
                )
            self._client = genai.Client(api_key=self.api_key)
        elif self.mode == "vertex":
            if not self.project_id:
                raise EntityLLMConfigurationError(
                    "Gemini Vertex mode requested but REDACTCORE_GCP_PROJECT/GOOGLE_CLOUD_PROJECT is not set."
                )
            self._client = genai.Client(
                vertexai=True,
                project=self.project_id,
                location=self.location,
            )
        else:
            raise EntityLLMConfigurationError(
                f"Unknown Gemini mode '{self.mode}'. Supported: 'api', 'vertex'."
            )

        return self._client

    def inspect_chunk(self, chunk_text: str) -> list[GeminiCandidateEntity]:
        """Submits a single bounded text chunk to Gemini and parses structured candidates."""
        from google.genai import types

        client = self._get_client()

        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(
                        text=f"{GEMINI_ENTITY_INSPECTION_PROMPT}\n\n--- TEXT CHUNK TO INSPECT ---\n{chunk_text}"
                    )
                ],
            )
        ]

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=GeminiEntityExtractionResponse,
        )

        response = None
        for attempt in range(1, self.max_retries + 2):
            try:
                response = client.models.generate_content(
                    model=self.model,
                    contents=contents,
                    config=config,
                )
                break
            except Exception as e:
                err_type = type(e).__name__
                if "DeadlineExceeded" in err_type or "Timeout" in err_type:
                    logger.warning("Gemini LLM inspection attempt %d timed out: %s", attempt, err_type)
                    if attempt > self.max_retries:
                        raise EntityLLMTimeoutError(
                            f"Gemini LLM request exceeded timeout of {self.timeout_seconds}s"
                        ) from e
                elif "InvalidArgument" in err_type or "PermissionDenied" in err_type or "Unauthenticated" in err_type:
                    raise EntityLLMConfigurationError(f"Gemini LLM rejected request: {err_type}") from e
                else:
                    logger.warning("Gemini LLM inspection attempt %d failed: %s", attempt, err_type)
                    if attempt > self.max_retries:
                        raise EntityLLMError(
                            f"Gemini LLM call failed after {attempt} attempts: {err_type}"
                        ) from e
                time.sleep(0.5 * attempt)

        if response is None:
            raise EntityLLMResponseParseError("Empty response from Gemini LLM inspection.")

        # Parse structured output safely
        extraction_data: GeminiEntityExtractionResponse
        if hasattr(response, "parsed") and response.parsed is not None:
            if isinstance(response.parsed, GeminiEntityExtractionResponse):
                extraction_data = response.parsed
            else:
                extraction_data = GeminiEntityExtractionResponse.model_validate(response.parsed)
        elif hasattr(response, "text") and response.text:
            try:
                parsed_json = json.loads(response.text)
                extraction_data = GeminiEntityExtractionResponse.model_validate(parsed_json)
            except Exception as e:
                raise EntityLLMResponseParseError(f"Failed to parse Gemini response as JSON: {e}") from e
        else:
            raise EntityLLMResponseParseError("Gemini response contained no structured data or text.")

        # Validate every returned candidate span against chunk_text
        validated_candidates: list[GeminiCandidateEntity] = []
        chunk_len = len(chunk_text)

        for candidate in extraction_data.entities:
            # 1. Validate entity type
            norm_type = normalize_entity_type(candidate.entity_type)
            if not norm_type:
                continue

            # 2. Validate non-empty text
            val = candidate.text
            if not val or not val.strip():
                continue

            start = candidate.start
            end = candidate.end

            # 3. Validate bounds
            if not (0 <= start < end <= chunk_len):
                continue

            # 4. Validate exact character match
            matched_slice = chunk_text[start:end]
            if matched_slice == val:
                valid_start, valid_end, valid_text = start, end, val
            elif matched_slice.strip() == val.strip():
                # Minor whitespace trimming offset alignment
                stripped_val = val.strip()
                rel_idx = matched_slice.find(stripped_val)
                if rel_idx != -1:
                    valid_start = start + rel_idx
                    valid_end = valid_start + len(stripped_val)
                    valid_text = stripped_val
                else:
                    continue
            else:
                # Local window search (+/- 5 chars) to compensate for minor model index drift
                local_search_start = max(0, start - 5)
                local_search_end = min(chunk_len, end + 5)
                local_window = chunk_text[local_search_start:local_search_end]
                find_idx = local_window.find(val)
                if find_idx != -1:
                    valid_start = local_search_start + find_idx
                    valid_end = valid_start + len(val)
                    valid_text = val
                else:
                    # Span does not match source text; reject untrusted suggestion
                    continue

            # 5. Validate & clamp confidence
            conf = candidate.confidence
            if not isinstance(conf, (int, float)) or conf != conf:  # check NaN
                conf = 0.85
            else:
                conf = max(0.0, min(1.0, float(conf)))

            # 6. Sanitize rationale to prevent accidental raw PII reflections
            safe_rationale = candidate.rationale
            if safe_rationale and valid_text.lower() in safe_rationale.lower():
                safe_rationale = f"Detected sensitive {norm_type.lower()} candidate"

            validated_candidates.append(
                GeminiCandidateEntity(
                    entity_type=norm_type,
                    text=valid_text,
                    start=valid_start,
                    end=valid_end,
                    confidence=conf,
                    category=candidate.category or "llm_inspection",
                    rationale=safe_rationale,
                )
            )

        return validated_candidates

    def inspect_text(
        self,
        text: str,
        page_or_section: str = "main",
        source_ref: str = "text",
    ) -> list[EntityFinding]:
        """Inspects text string with bounded chunking and maps spans back to global coordinates."""
        # 1. Enforce cloud consent gate
        enforce_cloud_llm_consent(self.name)

        if not self.is_configured():
            raise EntityLLMConfigurationError(
                f"Gemini LLM provider ({self.mode} mode) is not configured with required credentials/project."
            )

        chunks = chunk_text(text, max_chunk_size=self.chunk_size, overlap=self.chunk_overlap)
        if len(chunks) > self.max_chunks:
            if self.is_strict():
                raise EntityLLMPayloadTooLargeError(
                    f"Document text produced {len(chunks)} chunks, exceeding max limit of {self.max_chunks}."
                )
            logger.warning(
                "Document text produced %d chunks, exceeding max limit of %d. Truncating LLM inspection.",
                len(chunks),
                self.max_chunks,
            )
            chunks = chunks[: self.max_chunks]

        findings: list[EntityFinding] = []
        seen_global_spans: set[tuple[str, int, int]] = set()

        for chunk_idx, (chunk_str, global_offset) in enumerate(chunks):
            if len(chunk_str.strip()) < self.min_chunk_chars:
                continue

            candidates = self.inspect_chunk(chunk_str)

            for cand in candidates:
                g_start = global_offset + cand.start
                g_end = global_offset + cand.end

                # Verify global coordinates against original text
                if not (0 <= g_start < g_end <= len(text)):
                    continue
                if text[g_start:g_end] != cand.text:
                    continue

                span_key = (cand.entity_type, g_start, g_end)
                if span_key in seen_global_spans:
                    continue
                seen_global_spans.add(span_key)

                val_clean = cand.text
                val_digest = hash_sensitive_value(val_clean)
                finding_id = f"llm_{len(findings)}_{val_digest[:8]}"

                findings.append(
                    EntityFinding(
                        finding_id=finding_id,
                        entity_type=cand.entity_type,
                        value_digest=val_digest,
                        page_or_section=page_or_section,
                        source_ref=source_ref,
                        start=g_start,
                        end=g_end,
                        confidence=cand.confidence,
                        source="gemini_llm",
                        requires_review=(cand.confidence < 0.85),
                        category=cand.category,
                        rationale=cand.rationale,
                        raw_value=val_clean,
                    )
                )

        return findings

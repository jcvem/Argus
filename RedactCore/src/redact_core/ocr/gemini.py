"""Gemini vision/document OCR adapter using the official google-genai SDK."""

import json
import logging
import os
import time
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

from redact_core.ocr.models import (
    OCRBlock,
    OCRDocumentResult,
    OCRPageResult,
    OCRToken,
    gemini_box_to_pdf_points,
)
from redact_core.ocr.protocol import (
    OCRConfigurationError,
    OCRError,
    OCRProvider,
    OCRResponseParseError,
    OCRTimeoutError,
    OCRUnavailableError,
    enforce_cloud_consent,
    is_cloud_ocr_permitted,
)

logger = logging.getLogger(__name__)

SUPPORTED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}


# Structured Pydantic models for Gemini structured output schema
class GeminiOCRToken(BaseModel):
    model_config = ConfigDict(extra="ignore")
    text: str
    box_2d: list[float]  # [ymin, xmin, ymax, xmax] in 0..1000 or 0.0..1.0
    confidence: float = 1.0


class GeminiOCRBlock(BaseModel):
    model_config = ConfigDict(extra="ignore")
    text: str
    box_2d: list[float]  # [ymin, xmin, ymax, xmax]
    tokens: list[GeminiOCRToken] = Field(default_factory=list)
    confidence: float = 1.0


class GeminiOCRPage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    page_number: int = 1
    blocks: list[GeminiOCRBlock] = Field(default_factory=list)
    confidence: float = 1.0
    coverage: float = 1.0
    warnings: list[str] = Field(default_factory=list)


class GeminiOCRResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    pages: list[GeminiOCRPage] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


GEMINI_OCR_PROMPT = (
    "You are a high-precision OCR and document layout engine. Extract all visual and printed text from the document. "
    "For every text block and word-level token, return precise 2D bounding boxes in normalized coordinates "
    "[ymin, xmin, ymax, xmax] on a scale of 0 to 1000, where [0, 0] is top-left and [1000, 1000] is bottom-right. "
    "Do not miss headers, footnotes, stamps, table cells, or marginal notes."
)


class GeminiOCRProvider(OCRProvider):
    """Adapter for Google Gemini OCR (Vertex AI mode or direct API mode).
    
    Security Contract:
    - Gemini output is treated as UNTRUSTED suggestions.
    - Policy engine remains authoritative for redaction decisions.
    - Post-redaction verifier remains the release gate.
    - Prompts, raw document content, and API keys are NEVER logged.
    """

    name = "gemini"
    version = "1.0.0"
    is_cloud = True

    def __init__(
        self,
        mode: str | None = None,
        model: str | None = None,
        api_key: str | None = None,
        project_id: str | None = None,
        location: str | None = None,
        timeout_seconds: float = 30.0,
        max_retries: int = 2,
        client: Any = None,
    ):
        self.mode = (mode or os.environ.get("REDACTCORE_GEMINI_MODE", "vertex")).lower().strip()
        self.model = model or os.environ.get("REDACTCORE_GEMINI_MODEL", "gemini-3.8-flash")
        self.api_key = api_key or os.environ.get("REDACTCORE_GEMINI_API_KEY")
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
        self.timeout_seconds = float(os.environ.get("REDACTCORE_OCR_TIMEOUT", str(timeout_seconds)))
        self.max_retries = int(os.environ.get("REDACTCORE_OCR_MAX_RETRIES", str(max_retries)))
        self._client = client

    def is_available(self) -> bool:
        """Checks if the official google-genai SDK is installed."""
        try:
            from google import genai  # noqa: F401
            return True
        except ImportError:
            return False

    def is_configured(self) -> bool:
        """Returns True if the required credentials/project are set for the selected mode."""
        if self.mode == "api":
            return bool(self.api_key)
        elif self.mode == "vertex":
            return bool(self.project_id)
        return False

    def check_health(self) -> dict[str, Any]:
        """Observability health status reporting booleans only (never API keys)."""
        return {
            "available": self.is_available(),
            "configured": self.is_configured(),
            "mode": self.mode,
            "has_api_key": bool(self.api_key),
            "has_gcp_project": bool(self.project_id),
            "has_location": bool(self.location),
            "model_configured": bool(self.model),
            "cloud_consent_granted": is_cloud_ocr_permitted(),
        }

    def _get_client(self) -> Any:
        if self._client is not None:
            return self._client

        if not self.is_available():
            raise OCRUnavailableError(
                "google-genai SDK is not installed. "
                "Install optional dependency: pip install 'redact-core[ocr-gemini]'"
            )

        from google import genai

        if self.mode == "api":
            if not self.api_key:
                raise OCRConfigurationError("Gemini API mode requested but REDACTCORE_GEMINI_API_KEY is not set.")
            self._client = genai.Client(api_key=self.api_key)
        elif self.mode == "vertex":
            if not self.project_id:
                raise OCRConfigurationError("Gemini Vertex mode requested but REDACTCORE_GCP_PROJECT is not set.")
            self._client = genai.Client(vertexai=True, project=self.project_id, location=self.location)
        else:
            raise OCRConfigurationError(f"Unknown Gemini mode '{self.mode}'. Supported: 'vertex', 'api'.")

        return self._client

    def process_document(
        self,
        data: bytes,
        mime_type: str = "application/pdf",
        page_geometries: list[tuple[float, float]] | None = None,
    ) -> OCRDocumentResult:
        # 1. Enforce strict cloud consent gate
        enforce_cloud_consent(self.name)

        # 2. Check limits and configuration
        self.validate_payload(data)
        if not self.is_configured():
            raise OCRConfigurationError(
                f"Gemini OCR provider ({self.mode} mode) is not configured with required credentials/project."
            )

        clean_mime = mime_type.lower().split(";")[0].strip()
        if clean_mime not in SUPPORTED_MIME_TYPES:
            raise ValueError(
                f"Unsupported MIME type '{clean_mime}' for Gemini OCR. Supported: {sorted(SUPPORTED_MIME_TYPES)}"
            )

        client = self._get_client()

        from google.genai import types

        logger.info(
            "Calling Gemini OCR [mode=%s, model=%s, payload_bytes=%d]",
            self.mode,
            self.model,
            len(data),
        )

        doc_part = types.Part.from_bytes(data=data, mime_type=clean_mime)
        contents = [doc_part, GEMINI_OCR_PROMPT]
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=GeminiOCRResponse,
        )

        # 3. Call API with retries and timeout
        last_err: Exception | None = None
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
                last_err = e
                err_type = type(e).__name__
                if "DeadlineExceeded" in err_type or "Timeout" in err_type:
                    logger.warning("Gemini attempt %d timed out: %s", attempt, err_type)
                    if attempt > self.max_retries:
                        raise OCRTimeoutError(f"Gemini request exceeded timeout of {self.timeout_seconds}s")
                elif "InvalidArgument" in err_type or "PermissionDenied" in err_type or "Unauthenticated" in err_type:
                    raise OCRConfigurationError(f"Gemini rejected request: {err_type}")
                else:
                    logger.warning("Gemini attempt %d failed: %s", attempt, err_type)
                    if attempt > self.max_retries:
                        raise OCRError(f"Gemini OCR call failed after {attempt} attempts: {err_type}")
                time.sleep(0.5 * attempt)

        if response is None:
            raise OCRResponseParseError("Empty response from Gemini OCR.")

        # Extract parsed schema or text
        return self.parse_gemini_response(
            raw_response=response,
            page_geometries=page_geometries,
        )

    def parse_gemini_response(
        self,
        raw_response: Any,
        page_geometries: list[tuple[float, float]] | None = None,
    ) -> OCRDocumentResult:
        """Parses structured Gemini output into OCRDocumentResult.
        
        Validates, clamps, and converts normalized boxes to PDF points.
        Rejects malformed geometry fail-closed.
        """
        gemini_data: GeminiOCRResponse

        if hasattr(raw_response, "parsed") and raw_response.parsed is not None:
            if isinstance(raw_response.parsed, GeminiOCRResponse):
                gemini_data = raw_response.parsed
            else:
                gemini_data = GeminiOCRResponse.model_validate(raw_response.parsed)
        elif hasattr(raw_response, "text") and raw_response.text:
            try:
                parsed_json = json.loads(raw_response.text)
                gemini_data = GeminiOCRResponse.model_validate(parsed_json)
            except Exception as e:
                raise OCRResponseParseError(f"Failed to parse Gemini response as JSON: {e}")
        else:
            raise OCRResponseParseError("Gemini response did not contain structured output or text.")

        pages: list[OCRPageResult] = []
        overall_confidences: list[float] = []

        for p_idx, g_page in enumerate(gemini_data.pages):
            page_num = g_page.page_number or (p_idx + 1)
            page_w, page_h = 595.0, 842.0
            if page_geometries and p_idx < len(page_geometries):
                page_w, page_h = page_geometries[p_idx]

            page_blocks: list[OCRBlock] = []
            page_tokens: list[OCRToken] = []
            page_warnings: list[str] = list(g_page.warnings)

            for b_idx, g_blk in enumerate(g_page.blocks):
                try:
                    blk_bbox = gemini_box_to_pdf_points(g_blk.box_2d, page_w, page_h)
                except ValueError as e:
                    raise OCRResponseParseError(f"Malformed Gemini block bounding box on page {page_num}: {e}")

                blk_tokens: list[OCRToken] = []
                curr_char = 0

                for t_idx, g_tok in enumerate(g_blk.tokens):
                    try:
                        tok_bbox = gemini_box_to_pdf_points(g_tok.box_2d, page_w, page_h)
                    except ValueError as e:
                        raise OCRResponseParseError(f"Malformed Gemini token bounding box on page {page_num}: {e}")

                    tok_text = g_tok.text.strip()
                    if not tok_text:
                        continue

                    start_c = curr_char
                    end_c = start_c + len(tok_text)
                    curr_char = end_c + 1

                    tok_obj = OCRToken(
                        token_id=f"page_{page_num}_b{b_idx}_t{t_idx}",
                        text=tok_text,
                        bbox=tok_bbox,
                        confidence=g_tok.confidence,
                        start_char=start_c,
                        end_char=end_c,
                    )
                    blk_tokens.append(tok_obj)
                    page_tokens.append(tok_obj)
                    overall_confidences.append(g_tok.confidence)

                page_blocks.append(
                    OCRBlock(
                        block_id=f"page_{page_num}_b{b_idx}",
                        text=g_blk.text,
                        bbox=blk_bbox,
                        confidence=g_blk.confidence,
                        tokens=blk_tokens,
                    )
                )

            page_text = "\n\n".join(b.text for b in page_blocks)
            page_conf = sum(b.confidence for b in page_blocks) / len(page_blocks) if page_blocks else 1.0
            coverage = g_page.coverage if g_page.coverage > 0 else (1.0 if page_blocks else 0.0)

            if coverage < 0.5:
                page_warnings.append(f"Page {page_num}: Low Gemini OCR coverage ({coverage:.1%}).")

            pages.append(
                OCRPageResult(
                    page_number=page_num,
                    width=page_w,
                    height=page_h,
                    text=page_text,
                    blocks=page_blocks,
                    tokens=page_tokens,
                    confidence=page_conf,
                    coverage=coverage,
                    warnings=page_warnings,
                    requires_review=coverage < 0.8,
                )
            )

        avg_conf = sum(overall_confidences) / len(overall_confidences) if overall_confidences else 1.0
        doc_coverage = min((p.coverage for p in pages), default=1.0)
        doc_warnings: list[str] = list(gemini_data.warnings)
        for p in pages:
            doc_warnings.extend(p.warnings)

        full_text = "\n\n".join(p.text for p in pages)

        return OCRDocumentResult(
            provider_name=self.name,
            provider_version=f"{self.version}-{self.model}",
            pages=pages,
            full_text=full_text,
            confidence=avg_conf,
            coverage=doc_coverage,
            warnings=doc_warnings,
            requires_review=any(p.requires_review for p in pages),
        )

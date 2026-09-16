"""Google Cloud Document AI Enterprise Document OCR adapter."""

import logging
import os
import time
from typing import Any

from redact_core.ocr.models import (
    OCRBlock,
    OCRDocumentResult,
    OCRLine,
    OCRPageResult,
    OCRToken,
    clamp_bbox,
)
from redact_core.ocr.protocol import (
    OCRConfigurationError,
    OCRError,
    OCRPayloadTooLargeError,
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
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/tiff",
}


def _text_from_anchor(anchor: Any, full_text: str) -> str:
    """Extracts text slice from Document.text using TextAnchor segments."""
    if not anchor or not getattr(anchor, "text_segments", None):
        return ""
    pieces: list[str] = []
    for seg in anchor.text_segments:
        start = int(getattr(seg, "start_index", 0) or 0)
        end = int(getattr(seg, "end_index", 0) or 0)
        pieces.append(full_text[start:end])
    return "".join(pieces)


def _poly_to_bbox(poly: Any, width: float, height: float) -> list[float]:
    """Converts Document AI BoundingPoly (normalized or absolute) to PDF point bbox."""
    if not poly:
        return [0.0, 0.0, width, height]

    normalized_vertices = getattr(poly, "normalized_vertices", None)
    if normalized_vertices:
        xs = [float(v.x) * width for v in normalized_vertices]
        ys = [float(v.y) * height for v in normalized_vertices]
        if xs and ys:
            return clamp_bbox([min(xs), min(ys), max(xs), max(ys)], width, height)

    vertices = getattr(poly, "vertices", None)
    if vertices:
        xs = [float(v.x) for v in vertices]
        ys = [float(v.y) for v in vertices]
        if xs and ys:
            return clamp_bbox([min(xs), min(ys), max(xs), max(ys)], width, height)

    return [0.0, 0.0, width, height]


class DocumentAIOCRProvider(OCRProvider):
    """Adapter for Google Cloud Document AI Enterprise Document OCR.
    
    Uses Application Default Credentials (ADC) or service account credentials in runtime.
    Endpoints and processor resources are configured regionally.
    """

    name = "document_ai"
    version = "1.0.0"
    is_cloud = True

    def __init__(
        self,
        project_id: str | None = None,
        location: str | None = None,
        processor_id: str | None = None,
        processor_version: str | None = None,
        timeout_seconds: float = 30.0,
        max_retries: int = 2,
        client: Any = None,
    ):
        self.project_id = project_id or os.environ.get("REDACTCORE_GCP_PROJECT") or os.environ.get("GOOGLE_CLOUD_PROJECT")
        self.location = location or os.environ.get("REDACTCORE_DOCUMENT_AI_LOCATION", "us")
        self.processor_id = processor_id or os.environ.get("REDACTCORE_DOCUMENT_AI_PROCESSOR_ID")
        self.processor_version = processor_version or os.environ.get("REDACTCORE_DOCUMENT_AI_PROCESSOR_VERSION")
        self.timeout_seconds = float(os.environ.get("REDACTCORE_OCR_TIMEOUT", str(timeout_seconds)))
        self.max_retries = int(os.environ.get("REDACTCORE_OCR_MAX_RETRIES", str(max_retries)))
        self._client = client

    def is_available(self) -> bool:
        """Returns True if google-cloud-documentai is importable."""
        try:
            import google.cloud.documentai_v1  # noqa: F401
            return True
        except ImportError:
            return False

    def is_configured(self) -> bool:
        """Returns True if project ID and processor ID are configured."""
        return bool(self.project_id and self.processor_id)

    def check_health(self) -> dict[str, Any]:
        """Observability health status reporting booleans only (never secrets)."""
        return {
            "available": self.is_available(),
            "configured": self.is_configured(),
            "has_project": bool(self.project_id),
            "has_location": bool(self.location),
            "has_processor_id": bool(self.processor_id),
            "has_processor_version": bool(self.processor_version),
            "cloud_consent_granted": is_cloud_ocr_permitted(),
        }

    def _get_client(self) -> Any:
        if self._client is not None:
            return self._client

        if not self.is_available():
            raise OCRUnavailableError(
                "google-cloud-documentai is not installed. "
                "Install optional dependency: pip install 'redact-core[ocr-gcp]'"
            )

        from google.api_core.client_options import ClientOptions
        from google.cloud import documentai_v1 as documentai

        endpoint = f"{self.location}-documentai.googleapis.com"
        client_options = ClientOptions(api_endpoint=endpoint)
        self._client = documentai.DocumentProcessorServiceClient(client_options=client_options)
        return self._client

    def _get_processor_name(self, client: Any) -> str:
        if self.processor_version:
            return client.processor_version_path(
                self.project_id, self.location, self.processor_id, self.processor_version
            )
        return client.processor_path(self.project_id, self.location, self.processor_id)

    def process_document(
        self,
        data: bytes,
        mime_type: str = "application/pdf",
        page_geometries: list[tuple[float, float]] | None = None,
    ) -> OCRDocumentResult:
        # 1. Enforce strict cloud consent gate before handling or transmitting bytes
        enforce_cloud_consent(self.name)

        # 2. Check configuration and limits
        self.validate_payload(data)
        if not self.is_configured():
            raise OCRConfigurationError(
                "Document AI not configured. Missing REDACTCORE_GCP_PROJECT or "
                "REDACTCORE_DOCUMENT_AI_PROCESSOR_ID."
            )

        clean_mime = mime_type.lower().split(";")[0].strip()
        if clean_mime not in SUPPORTED_MIME_TYPES:
            raise ValueError(
                f"Unsupported MIME type '{clean_mime}' for Document AI. "
                f"Supported: {sorted(SUPPORTED_MIME_TYPES)}"
            )

        client = self._get_client()
        processor_name = self._get_processor_name(client)

        from google.cloud import documentai_v1 as documentai

        raw_document = documentai.RawDocument(content=data, mime_type=clean_mime)
        request = documentai.ProcessRequest(name=processor_name, raw_document=raw_document)

        logger.info(
            "Calling Document AI Enterprise OCR [payload_bytes=%d, pages_hint=%s]",
            len(data),
            len(page_geometries) if page_geometries else "unknown",
        )

        # 3. Call API with retries and timeout
        last_err: Exception | None = None
        response = None

        for attempt in range(1, self.max_retries + 2):
            try:
                response = client.process_document(request=request, timeout=self.timeout_seconds)
                break
            except Exception as e:
                last_err = e
                err_type = type(e).__name__
                if "DeadlineExceeded" in err_type or "Timeout" in err_type:
                    logger.warning("Document AI attempt %d timed out: %s", attempt, err_type)
                    if attempt > self.max_retries:
                        raise OCRTimeoutError(f"Document AI request exceeded timeout of {self.timeout_seconds}s")
                elif "InvalidArgument" in err_type or "Unauthenticated" in err_type or "PermissionDenied" in err_type:
                    raise OCRConfigurationError(f"Document AI rejected request: {err_type}")
                else:
                    logger.warning("Document AI attempt %d failed: %s", attempt, err_type)
                    if attempt > self.max_retries:
                        raise OCRError(f"Document AI process_document failed after {attempt} attempts: {err_type}")
                time.sleep(0.5 * attempt)

        if response is None or not getattr(response, "document", None):
            raise OCRResponseParseError("Empty or malformed Document AI response received.")

        return self.parse_document_ai_response(
            document=response.document,
            page_geometries=page_geometries,
        )

    def parse_document_ai_response(
        self,
        document: Any,
        page_geometries: list[tuple[float, float]] | None = None,
    ) -> OCRDocumentResult:
        """Maps Document AI Document protobuf into normalized OCRDocumentResult.
        
        Preserves page dimensions and maps text anchors and normalized vertices into PDF points.
        """
        full_text = getattr(document, "text", "") or ""
        doc_pages = getattr(document, "pages", []) or []

        pages: list[OCRPageResult] = []
        overall_confidences: list[float] = []

        for p_idx, doc_page in enumerate(doc_pages):
            page_num = p_idx + 1

            # Determine page dimensions
            page_w, page_h = 595.0, 842.0  # Default A4
            if page_geometries and p_idx < len(page_geometries):
                page_w, page_h = page_geometries[p_idx]
            elif getattr(doc_page, "dimension", None):
                dim = doc_page.dimension
                if getattr(dim, "width", 0) > 0 and getattr(dim, "height", 0) > 0:
                    page_w, page_h = float(dim.width), float(dim.height)

            page_blocks: list[OCRBlock] = []
            page_tokens: list[OCRToken] = []
            page_warnings: list[str] = []

            # 1. Parse tokens
            for t_idx, tok in enumerate(getattr(doc_page, "tokens", []) or []):
                layout = getattr(tok, "layout", None)
                if not layout:
                    continue
                tok_text = _text_from_anchor(getattr(layout, "text_anchor", None), full_text)
                if not tok_text.strip():
                    continue

                tok_bbox = _poly_to_bbox(getattr(layout, "bounding_poly", None), page_w, page_h)
                tok_conf = float(getattr(layout, "confidence", 1.0) or 1.0)
                overall_confidences.append(tok_conf)

                seg_start, seg_end = 0, len(tok_text)
                anchor = getattr(layout, "text_anchor", None)
                if anchor and getattr(anchor, "text_segments", None):
                    seg_start = int(anchor.text_segments[0].start_index or 0)
                    seg_end = int(anchor.text_segments[0].end_index or len(tok_text))

                page_tokens.append(
                    OCRToken(
                        token_id=f"page_{page_num}_t{t_idx}",
                        text=tok_text,
                        bbox=tok_bbox,
                        confidence=tok_conf,
                        start_char=seg_start,
                        end_char=seg_end,
                    )
                )

            # 2. Parse blocks
            for b_idx, blk in enumerate(getattr(doc_page, "blocks", []) or []):
                layout = getattr(blk, "layout", None)
                if not layout:
                    continue
                blk_text = _text_from_anchor(getattr(layout, "text_anchor", None), full_text).strip()
                if not blk_text:
                    continue

                blk_bbox = _poly_to_bbox(getattr(layout, "bounding_poly", None), page_w, page_h)
                blk_conf = float(getattr(layout, "confidence", 1.0) or 1.0)

                # Collect tokens that fall within this block's text or bbox
                contained_tokens = [
                    t for t in page_tokens
                    if (blk_bbox[0] - 2 <= t.bbox[0] and t.bbox[2] <= blk_bbox[2] + 2 and
                        blk_bbox[1] - 2 <= t.bbox[1] and t.bbox[3] <= blk_bbox[3] + 2)
                ]

                page_blocks.append(
                    OCRBlock(
                        block_id=f"page_{page_num}_b{b_idx}",
                        text=blk_text,
                        bbox=blk_bbox,
                        confidence=blk_conf,
                        tokens=contained_tokens,
                    )
                )

            # If no blocks were structured by Document AI but tokens exist, create block from tokens
            if not page_blocks and page_tokens:
                combined_text = " ".join(t.text for t in page_tokens)
                union_bbox = [
                    min(t.bbox[0] for t in page_tokens),
                    min(t.bbox[1] for t in page_tokens),
                    max(t.bbox[2] for t in page_tokens),
                    max(t.bbox[3] for t in page_tokens),
                ]
                page_blocks.append(
                    OCRBlock(
                        block_id=f"page_{page_num}_b0",
                        text=combined_text,
                        bbox=union_bbox,
                        confidence=sum(t.confidence for t in page_tokens) / len(page_tokens),
                        tokens=page_tokens,
                    )
                )

            page_text = "\n\n".join(b.text for b in page_blocks) if page_blocks else full_text
            page_conf = sum(t.confidence for t in page_tokens) / len(page_tokens) if page_tokens else 1.0
            coverage = 1.0 if page_tokens else 0.0

            if coverage < 0.5:
                page_warnings.append(
                    f"Page {page_num}: Low OCR coverage ({coverage:.1%}). Unrecognized content may exist."
                )

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
        doc_warnings: list[str] = []
        for p in pages:
            doc_warnings.extend(p.warnings)

        return OCRDocumentResult(
            provider_name=self.name,
            provider_version=self.version,
            pages=pages,
            full_text=full_text,
            confidence=avg_conf,
            coverage=doc_coverage,
            warnings=doc_warnings,
            requires_review=any(p.requires_review for p in pages),
        )

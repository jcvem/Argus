"""Argus RedactCore OCR subsystem."""

from redact_core.ocr.document_ai import DocumentAIOCRProvider
from redact_core.ocr.gemini import GeminiOCRProvider
from redact_core.ocr.models import (
    OCRBlock,
    OCRDocumentResult,
    OCRLine,
    OCRPageResult,
    OCRToken,
    clamp_bbox,
    convert_ocr_result_to_blocks,
    gemini_box_to_pdf_points,
)
from redact_core.ocr.offline import FakeOCRProvider, OfflineOCRProvider
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
from redact_core.ocr.router import OCRRouter, default_ocr_router

__all__ = [
    "DocumentAIOCRProvider",
    "GeminiOCRProvider",
    "OfflineOCRProvider",
    "FakeOCRProvider",
    "OCRBlock",
    "OCRDocumentResult",
    "OCRLine",
    "OCRPageResult",
    "OCRToken",
    "clamp_bbox",
    "gemini_box_to_pdf_points",
    "convert_ocr_result_to_blocks",
    "OCRProvider",
    "OCRError",
    "OCRConfigurationError",
    "OCRUnavailableError",
    "OCRTimeoutError",
    "OCRPayloadTooLargeError",
    "OCRResponseParseError",
    "is_cloud_ocr_permitted",
    "enforce_cloud_consent",
    "OCRRouter",
    "default_ocr_router",
]

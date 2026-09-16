"""Offline OCR provider boundary and synthetic test fake provider."""

import logging
from typing import Any, Callable

from redact_core.ocr.models import (
    OCRBlock,
    OCRDocumentResult,
    OCRLine,
    OCRPageResult,
    OCRToken,
)
from redact_core.ocr.protocol import (
    OCRConfigurationError,
    OCRProvider,
    OCRUnavailableError,
)

logger = logging.getLogger(__name__)


class OfflineOCRProvider(OCRProvider):
    """Offline OCR provider interface boundary / stub.
    
    Serves as an architectural placeholder for local offline OCR backends
    (e.g., Tesseract or on-device engines) without bundling heavyweight
    dependencies into the core package.
    """

    name = "offline"
    version = "1.0.0-stub"
    is_cloud = False

    def __init__(self, backend_runner: Callable[[bytes, str], OCRDocumentResult] | None = None):
        self._runner = backend_runner

    def is_available(self) -> bool:
        """Returns True only if a custom offline backend runner is configured."""
        return self._runner is not None

    def is_configured(self) -> bool:
        return self._runner is not None

    def check_health(self) -> dict[str, Any]:
        return {
            "available": self.is_available(),
            "configured": self.is_configured(),
            "backend": "custom_runner" if self._runner else "unbound_stub",
        }

    def process_document(
        self,
        data: bytes,
        mime_type: str = "application/pdf",
        page_geometries: list[tuple[float, float]] | None = None,
    ) -> OCRDocumentResult:
        self.validate_payload(data)
        if not self._runner:
            raise OCRUnavailableError(
                "Offline OCR provider is an unconfigured stub boundary. "
                "No local OCR engine is configured. Fail-closed: Cannot process scanned document."
            )
        return self._runner(data, mime_type)


class FakeOCRProvider(OCRProvider):
    """Deterministic synthetic OCR provider for unit tests and E2E verification.
    
    Allows injecting mock tokens, bounding boxes, coverage ratios, and warnings
    without requiring cloud network calls or external binary dependencies.
    """

    name = "fake"
    version = "1.0.0-mock"
    is_cloud = False

    def __init__(
        self,
        canned_pages: list[OCRPageResult] | None = None,
        coverage: float = 1.0,
        warnings: list[str] | None = None,
        requires_review: bool = False,
        confidence: float = 0.98,
    ):
        self.canned_pages = canned_pages or []
        self.coverage = coverage
        self.warnings = warnings or []
        self.requires_review = requires_review
        self.confidence = confidence

    def is_available(self) -> bool:
        return True

    def is_configured(self) -> bool:
        return True

    def check_health(self) -> dict[str, Any]:
        return {
            "available": True,
            "configured": True,
            "backend": "synthetic_fake",
        }

    def process_document(
        self,
        data: bytes,
        mime_type: str = "application/pdf",
        page_geometries: list[tuple[float, float]] | None = None,
    ) -> OCRDocumentResult:
        self.validate_payload(data)

        if not self.canned_pages and page_geometries:
            # Generate default synthetic page result if none provided
            pages = []
            for idx, (pw, ph) in enumerate(page_geometries):
                pages.append(
                    OCRPageResult(
                        page_number=idx + 1,
                        width=pw,
                        height=ph,
                        text="Synthetic OCR text",
                        blocks=[
                            OCRBlock(
                                block_id=f"page_{idx+1}_b0",
                                text="Synthetic OCR text",
                                bbox=[50.0, 50.0, pw - 50.0, 100.0],
                                confidence=self.confidence,
                                tokens=[
                                    OCRToken(
                                        token_id=f"page_{idx+1}_t0",
                                        text="Synthetic",
                                        bbox=[50.0, 50.0, 150.0, 80.0],
                                        confidence=self.confidence,
                                        start_char=0,
                                        end_char=9,
                                    ),
                                    OCRToken(
                                        token_id=f"page_{idx+1}_t1",
                                        text="OCR",
                                        bbox=[155.0, 50.0, 200.0, 80.0],
                                        confidence=self.confidence,
                                        start_char=10,
                                        end_char=13,
                                    ),
                                    OCRToken(
                                        token_id=f"page_{idx+1}_t2",
                                        text="text",
                                        bbox=[205.0, 50.0, 250.0, 80.0],
                                        confidence=self.confidence,
                                        start_char=14,
                                        end_char=18,
                                    ),
                                ],
                            )
                        ],
                        confidence=self.confidence,
                        coverage=self.coverage,
                        warnings=list(self.warnings),
                        requires_review=self.requires_review,
                    )
                )
        else:
            pages = self.canned_pages

        full_text = " ".join(p.text for p in pages)
        return OCRDocumentResult(
            provider_name=self.name,
            provider_version=self.version,
            pages=pages,
            full_text=full_text,
            confidence=self.confidence,
            coverage=self.coverage,
            warnings=list(self.warnings),
            requires_review=self.requires_review,
        )

"""Provider-neutral OCR Router for Argus RedactCore."""

import logging
import os
from typing import Any

from redact_core.ocr.document_ai import DocumentAIOCRProvider
from redact_core.ocr.gemini import GeminiOCRProvider
from redact_core.ocr.models import OCRDocumentResult
from redact_core.ocr.offline import FakeOCRProvider, OfflineOCRProvider
from redact_core.ocr.protocol import (
    OCRConfigurationError,
    OCRError,
    OCRProvider,
    OCRUnavailableError,
    is_cloud_ocr_permitted,
)

logger = logging.getLogger(__name__)


class OCRRouter:
    """Routes document OCR requests to configured deterministic or escalation providers.
    
    Routing Modes (REDACTCORE_OCR_PROVIDER):
    - 'none' (default): OCR disabled. Scanned PDFs fail closed.
    - 'document_ai': Google Cloud Document AI Enterprise Document OCR.
    - 'gemini': Gemini vision/document OCR.
    - 'offline': Local offline provider stub.
    - 'auto': Cloud-consent-gated auto-routing. Prefers Document AI when cloud consent is
              granted; escalates/falls back to Gemini if configured; never silently uploads.
    """

    def __init__(
        self,
        mode: str | None = None,
        custom_provider: OCRProvider | None = None,
    ):
        self.mode = (mode or os.environ.get("REDACTCORE_OCR_PROVIDER", "none")).lower().strip()
        self._custom_provider = custom_provider
        self.doc_ai = DocumentAIOCRProvider()
        self.gemini = GeminiOCRProvider()
        self.offline = OfflineOCRProvider()

    def set_custom_provider(self, provider: OCRProvider | None) -> None:
        """Registers a custom or fake provider for testing or specialized offline backends."""
        self._custom_provider = provider

    @property
    def provider_name(self) -> str:
        """Returns the active provider mode identifier."""
        if self._custom_provider:
            return self._custom_provider.name
        return self.mode

    @property
    def allow_cloud_ocr(self) -> bool:
        """Checks if cloud upload consent is active."""
        return is_cloud_ocr_permitted()

    def get_health_summary(self) -> dict[str, Any]:
        """Provides subsystem health observability without exposing sensitive credentials."""
        summary = {
            "mode": self.mode,
            "cloud_consent_granted": self.allow_cloud_ocr,
            "document_ai": self.doc_ai.check_health(),
            "gemini": self.gemini.check_health(),
            "offline": self.offline.check_health(),
        }
        if self._custom_provider:
            summary["custom_provider"] = self._custom_provider.check_health()
        return summary

    def resolve_provider(self) -> OCRProvider | None:
        """Resolves the active OCR provider according to routing configuration and cloud consent."""
        if self._custom_provider:
            return self._custom_provider

        mode = self.mode

        if mode in ("none", "", "disabled"):
            return None

        if mode == "document_ai":
            return self.doc_ai

        if mode == "gemini":
            return self.gemini

        if mode == "offline":
            return self.offline

        if mode == "auto":
            # Auto-routing: Check cloud consent first
            if not self.allow_cloud_ocr:
                # Without cloud consent, NEVER upload to cloud. Try offline if available.
                if self.offline.is_available():
                    return self.offline
                return None

            # With cloud consent: Prefer Document AI if configured
            if self.doc_ai.is_configured() and self.doc_ai.is_available():
                return self.doc_ai

            # Fallback to Gemini if configured
            if self.gemini.is_configured() and self.gemini.is_available():
                return self.gemini

            # Fallback to offline stub if available
            if self.offline.is_available():
                return self.offline

            return None

        raise OCRConfigurationError(
            f"Unknown REDACTCORE_OCR_PROVIDER mode '{mode}'. "
            "Supported: 'none', 'document_ai', 'gemini', 'offline', 'auto'."
        )

    def process_document(
        self,
        data: bytes,
        mime_type: str = "application/pdf",
        page_geometries: list[tuple[float, float]] | None = None,
    ) -> OCRDocumentResult:
        """Processes document through the resolved OCR provider.
        
        In 'auto' mode with cloud consent, supports safe escalation to Gemini if Document AI
        encounters a recoverable processing failure.
        """
        provider = self.resolve_provider()

        if provider is None:
            raise OCRUnavailableError(
                f"OCR is disabled or no suitable provider is available (mode='{self.mode}', "
                f"cloud_consent={self.allow_cloud_ocr}). Scanned documents fail closed."
            )

        # In auto mode with cloud consent, allow fallback escalation
        if self.mode == "auto" and provider == self.doc_ai and self.gemini.is_configured():
            try:
                return provider.process_document(data, mime_type=mime_type, page_geometries=page_geometries)
            except (OCRUnavailableError, OCRError) as e:
                logger.warning("Document AI failed in auto mode (%s); escalating to Gemini provider.", e)
                return self.gemini.process_document(data, mime_type=mime_type, page_geometries=page_geometries)

        return provider.process_document(data, mime_type=mime_type, page_geometries=page_geometries)


# Global default OCR router instance
default_ocr_router = OCRRouter()

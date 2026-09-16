"""Protocol, base class, and exception hierarchy for RedactCore OCR providers."""

from abc import ABC, abstractmethod
import os
from typing import Any

from redact_core.ocr.models import OCRDocumentResult


class OCRError(Exception):
    """Base exception for all OCR-related failures."""
    pass


class OCRConfigurationError(OCRError):
    """Raised when provider configuration or credentials are missing or invalid."""
    pass


class OCRUnavailableError(OCRError):
    """Raised when a requested provider is not installed or service is unavailable."""
    pass


class OCRTimeoutError(OCRError):
    """Raised when an OCR processing request exceeds the configured timeout."""
    pass


class OCRPayloadTooLargeError(OCRError):
    """Raised when the document payload exceeds the maximum permitted OCR payload size."""
    pass


class OCRResponseParseError(OCRError):
    """Raised when an OCR response cannot be parsed or contains invalid geometry."""
    pass


def is_cloud_ocr_permitted() -> bool:
    """Checks whether explicit user consent has been granted for cloud OCR uploads.
    
    Defaults to FALSE (fail-closed) to prevent unauthorized document exfiltration.
    """
    val = os.environ.get("REDACTCORE_ALLOW_CLOUD_OCR", "false").strip().lower()
    return val in ("true", "1", "yes", "on")


def enforce_cloud_consent(provider_name: str) -> None:
    """Enforces explicit cloud consent gate before any cloud transmission.
    
    Raises:
        OCRConfigurationError if REDACTCORE_ALLOW_CLOUD_OCR is false.
    """
    if not is_cloud_ocr_permitted():
        raise OCRConfigurationError(
            f"Cloud OCR upload for provider '{provider_name}' is blocked: explicit consent "
            "not granted. Set REDACTCORE_ALLOW_CLOUD_OCR=true to permit transmission."
        )


class OCRProvider(ABC):
    """Abstract base class for all OCR providers."""

    name: str = "base"
    version: str | None = None
    is_cloud: bool = False
    max_payload_bytes: int = 50 * 1024 * 1024  # 50 MB

    def validate_payload(self, data: bytes) -> None:
        """Ensures document size is within safe bounds."""
        if len(data) > self.max_payload_bytes:
            raise OCRPayloadTooLargeError(
                f"Document size {len(data)} bytes exceeds provider limit ({self.max_payload_bytes} bytes)"
            )

    @abstractmethod
    def is_available(self) -> bool:
        """Returns True if the required SDK/dependencies are installed."""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True if required configuration/credentials are present."""
        pass

    @abstractmethod
    def check_health(self) -> dict[str, Any]:
        """Returns provider status with boolean flags ONLY (never secrets or PII)."""
        pass

    @abstractmethod
    def process_document(
        self,
        data: bytes,
        mime_type: str = "application/pdf",
        page_geometries: list[tuple[float, float]] | None = None,
    ) -> OCRDocumentResult:
        """Processes document bytes and returns structured OCRDocumentResult."""
        pass

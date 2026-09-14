"""Tests for PDF parsing and normalized model creation."""

from pathlib import Path
import pytest
from redact_core.pdf_parser import parse_pdf


FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"


def test_parse_text_native_pdf():
    pdf_path = FIXTURES_DIR / "sample_report.pdf"
    assert pdf_path.exists(), "Synthetic PDF fixture must exist"

    doc = parse_pdf(pdf_path)
    assert doc.file_type == "pdf"
    assert doc.page_count == 2
    assert len(doc.text_blocks) > 0
    assert not doc.is_scanned

    # Check that text spans have coordinates (bounding boxes)
    all_spans = [span for block in doc.text_blocks for span in block.spans]
    assert len(all_spans) > 0
    assert all(span.bbox is not None and len(span.bbox) == 4 for span in all_spans)

    # Check figures detected
    assert len(doc.figures) >= 1
    assert doc.figures[0].requires_review is True

    # Check metadata extracted
    assert "title" in doc.metadata or "author" in doc.metadata


def test_detect_scanned_pdf():
    scanned_path = FIXTURES_DIR / "scanned_sample.pdf"
    assert scanned_path.exists(), "Scanned PDF fixture must exist"

    doc = parse_pdf(scanned_path)
    assert doc.is_scanned is True
    assert any("scanned" in w.lower() for w in doc.warnings)

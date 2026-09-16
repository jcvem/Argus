"""Typed OCR data models and coordinate conversion utilities.

COORDINATE SYSTEM SPECIFICATION:
================================
- Coordinate space: PDF standard user space points (1/72 inch).
- Origin: Top-left corner of the page (0.0, 0.0).
- X-axis: Increases from left to right ([0.0, page_width]).
- Y-axis: Increases from top to bottom ([0.0, page_height]).
- Bounding Box Representation: [x0, y0, x1, y1]
    - x0: Left boundary
    - y0: Top boundary
    - x1: Right boundary
    - y1: Bottom boundary
    - Constraint: 0.0 <= x0 <= x1 <= page_width, 0.0 <= y0 <= y1 <= page_height.

PROVIDER COORDINATE CONVERSIONS:
- Google Cloud Document AI:
    - Provides normalized vertices where (x, y) are floats in [0.0, 1.0].
    - x0 = min(v.x) * page_width,  x1 = max(v.x) * page_width
    - y0 = min(v.y) * page_height, y1 = max(v.y) * page_height
- Gemini Vision / Document OCR:
    - Standard box format is [ymin, xmin, ymax, xmax].
    - Can be normalized [0.0, 1.0] or integer-scaled [0, 1000].
    - If any value > 1.0, scaled by 1/1000.0.
    - x0 = xmin * page_width,  x1 = xmax * page_width
    - y0 = ymin * page_height, y1 = ymax * page_height
"""

from typing import Any
from pydantic import BaseModel, ConfigDict, Field

from redact_core.models import TextBlock, TextSpan


def clamp_bbox(bbox: list[float], max_width: float, max_height: float) -> list[float]:
    """Clamps a bounding box [x0, y0, x1, y1] to stay within [0, max_width] and [0, max_height].
    
    Validates that x0 <= x1 and y0 <= y1, correcting minor inversions or raising ValueError.
    """
    if len(bbox) != 4:
        raise ValueError(f"Bounding box must contain exactly 4 coordinates, got {len(bbox)}")

    x0, y0, x1, y1 = [float(v) for v in bbox]

    # Handle slight inverted coordinate anomalies from OCR engines
    if x0 > x1:
        x0, x1 = x1, x0
    if y0 > y1:
        y0, y1 = y1, y0

    x0 = max(0.0, min(x0, max_width))
    y0 = max(0.0, min(y0, max_height))
    x1 = max(x0, min(x1, max_width))
    y1 = max(y0, min(y1, max_height))

    return [round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2)]


def gemini_box_to_pdf_points(
    box_2d: list[float],
    page_width: float,
    page_height: float,
) -> list[float]:
    """Converts Gemini normalized [ymin, xmin, ymax, xmax] box to PDF [x0, y0, x1, y1] in points.
    
    Accepts coordinates either in [0.0, 1.0] or integer-scaled [0, 1000].
    """
    if len(box_2d) != 4:
        raise ValueError(f"Gemini box_2d must have 4 coordinates [ymin, xmin, ymax, xmax], got {box_2d}")

    ymin, xmin, ymax, xmax = [float(v) for v in box_2d]

    # Detect 0..1000 integer-scaled coordinate format
    if any(coord > 1.0 for coord in (ymin, xmin, ymax, xmax)):
        ymin /= 1000.0
        xmin /= 1000.0
        ymax /= 1000.0
        xmax /= 1000.0

    # Ensure in [0.0, 1.0]
    if not (0.0 <= ymin <= 1.05 and 0.0 <= xmin <= 1.05 and 0.0 <= ymax <= 1.05 and 0.0 <= xmax <= 1.05):
        raise ValueError(f"Gemini coordinates out of bounds: [{ymin}, {xmin}, {ymax}, {xmax}]")

    x0 = xmin * page_width
    y0 = ymin * page_height
    x1 = xmax * page_width
    y1 = ymax * page_height

    return clamp_bbox([x0, y0, x1, y1], page_width, page_height)


class OCRToken(BaseModel):
    """Atomic token (word or symbol) recognized by OCR."""
    model_config = ConfigDict(extra="ignore")

    token_id: str | None = None
    text: str
    bbox: list[float]  # [x0, y0, x1, y1] in PDF points
    confidence: float = 1.0
    start_char: int = 0
    end_char: int = 0


class OCRLine(BaseModel):
    """Line of recognized tokens."""
    model_config = ConfigDict(extra="ignore")

    line_id: str | None = None
    text: str
    bbox: list[float]  # [x0, y0, x1, y1] in PDF points
    confidence: float = 1.0
    tokens: list[OCRToken] = Field(default_factory=list)


class OCRBlock(BaseModel):
    """Logical block / paragraph of text detected by OCR."""
    model_config = ConfigDict(extra="ignore")

    block_id: str | None = None
    text: str
    bbox: list[float]  # [x0, y0, x1, y1] in PDF points
    confidence: float = 1.0
    block_type: str = "text"  # 'text', 'table', 'figure_caption'
    lines: list[OCRLine] = Field(default_factory=list)
    tokens: list[OCRToken] = Field(default_factory=list)


class OCRPageResult(BaseModel):
    """Complete OCR result for a single page."""
    model_config = ConfigDict(extra="ignore")

    page_number: int  # 1-indexed
    width: float
    height: float
    text: str
    blocks: list[OCRBlock] = Field(default_factory=list)
    lines: list[OCRLine] = Field(default_factory=list)
    tokens: list[OCRToken] = Field(default_factory=list)
    confidence: float = 1.0
    language: str | None = None
    coverage: float = 1.0  # 0.0 to 1.0 fraction of expected readable area
    warnings: list[str] = Field(default_factory=list)
    requires_review: bool = False


class OCRDocumentResult(BaseModel):
    """Aggregated OCR result across all pages of a document."""
    model_config = ConfigDict(extra="ignore")

    provider_name: str
    provider_version: str | None = None
    pages: list[OCRPageResult] = Field(default_factory=list)
    full_text: str = ""
    confidence: float = 1.0
    coverage: float = 1.0
    warnings: list[str] = Field(default_factory=list)
    requires_review: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)


def convert_ocr_result_to_blocks(ocr_doc: OCRDocumentResult) -> tuple[list[TextBlock], list[str]]:
    """Converts an OCRDocumentResult into TextBlock/TextSpan instances with source='ocr'.
    
    Returns:
        tuple of (text_blocks, collected_warnings)
    """
    text_blocks: list[TextBlock] = []
    warnings: list[str] = list(ocr_doc.warnings)

    for page in ocr_doc.pages:
        page_ref = f"page_{page.page_number}"
        if page.warnings:
            warnings.extend(page.warnings)

        for b_idx, block in enumerate(page.blocks):
            block_id = block.block_id or f"{page_ref}_ocr_b{b_idx}"
            spans: list[TextSpan] = []

            # Prefer tokens inside block, fallback to flattened page tokens
            source_tokens = block.tokens
            if not source_tokens and block.lines:
                source_tokens = [tok for line in block.lines for tok in line.tokens]

            if source_tokens:
                curr_char = 0
                for s_idx, tok in enumerate(source_tokens):
                    tok_text = tok.text.strip()
                    if not tok_text:
                        continue
                    start_c = tok.start_char if tok.start_char > 0 else curr_char
                    end_c = tok.end_char if tok.end_char > start_c else start_c + len(tok_text)
                    curr_char = end_c + 1

                    spans.append(
                        TextSpan(
                            span_id=tok.token_id or f"{block_id}_s{s_idx}",
                            text=tok_text,
                            bbox=tok.bbox,
                            start_char=start_c,
                            end_char=end_c,
                        )
                    )
            else:
                # If no token-level breakdown, create a single span for the block
                spans.append(
                    TextSpan(
                        span_id=f"{block_id}_s0",
                        text=block.text,
                        bbox=block.bbox,
                        start_char=0,
                        end_char=len(block.text),
                    )
                )

            text_blocks.append(
                TextBlock(
                    block_id=block_id,
                    page_or_section=page_ref,
                    text=block.text,
                    spans=spans,
                    bbox=block.bbox,
                )
            )

    return text_blocks, warnings

"""PDF document parser using PyMuPDF (fitz).

Extracts text blocks, spans with coordinates, tables, images/figures, metadata,
and detects scanned/image-only documents.
"""

from pathlib import Path
import pymupdf

from redact_core.hashing import compute_sha256_bytes, compute_sha256_file
from redact_core.models import (
    FigureBlock,
    NormalizedDocument,
    TableBlock,
    TextBlock,
    TextSpan,
)


def parse_pdf(file_path_or_bytes: Path | str | bytes, filename: str = "document.pdf") -> NormalizedDocument:
    """Parses a PDF into a normalized document model with coordinates and structure."""
    if isinstance(file_path_or_bytes, bytes):
        doc = pymupdf.open(stream=file_path_or_bytes, filetype="pdf")
        source_sha256 = compute_sha256_bytes(file_path_or_bytes)
    else:
        path = Path(file_path_or_bytes)
        doc = pymupdf.open(str(path))
        source_sha256 = compute_sha256_file(path)
        filename = path.name

    warnings: list[str] = []

    if doc.is_encrypted:
        doc.close()
        raise ValueError(f"Encrypted or password-protected PDF cannot be processed: {filename}")

    page_count = len(doc)
    text_blocks: list[TextBlock] = []
    tables: list[TableBlock] = []
    figures: list[FigureBlock] = []

    total_text_len = 0
    total_images_count = 0

    for page_idx in range(page_count):
        page = doc[page_idx]
        page_ref = f"page_{page_idx + 1}"
        page_dict = page.get_text("dict")

        # 1. Parse text blocks & spans
        for b_idx, block in enumerate(page_dict.get("blocks", [])):
            if block.get("type") == 0:  # Text block
                block_spans: list[TextSpan] = []
                block_text_parts: list[str] = []
                curr_char_idx = 0

                for l_idx, line in enumerate(block.get("lines", [])):
                    for s_idx, span in enumerate(line.get("spans", [])):
                        span_text = span.get("text", "")
                        if not span_text:
                            continue
                        span_bbox = list(span.get("bbox", []))
                        start_c = curr_char_idx
                        end_c = start_c + len(span_text)
                        curr_char_idx = end_c + 1  # count space

                        block_spans.append(
                            TextSpan(
                                span_id=f"{page_ref}_b{b_idx}_l{l_idx}_s{s_idx}",
                                text=span_text,
                                bbox=span_bbox,
                                font=span.get("font"),
                                size=span.get("size"),
                                start_char=start_c,
                                end_char=end_c,
                            )
                        )
                        block_text_parts.append(span_text)

                combined_text = " ".join(block_text_parts).strip()
                total_text_len += len(combined_text)

                if combined_text:
                    text_blocks.append(
                        TextBlock(
                            block_id=f"{page_ref}_b{b_idx}",
                            page_or_section=page_ref,
                            text=combined_text,
                            spans=block_spans,
                            bbox=list(block.get("bbox", [])),
                        )
                    )

        # 2. Parse tables (using PyMuPDF find_tables)
        try:
            tabs = page.find_tables()
            for t_idx, tab in enumerate(tabs):
                extracted_rows = tab.extract()
                if extracted_rows:
                    cleaned_rows = [
                        [str(cell).strip() if cell is not None else "" for cell in row]
                        for row in extracted_rows
                    ]
                    tables.append(
                        TableBlock(
                            table_id=f"{page_ref}_t{t_idx}",
                            page_or_section=page_ref,
                            rows=cleaned_rows,
                            bbox=list(tab.bbox),
                        )
                    )
        except Exception:
            # Fallback if table finder encounters irregularities
            pass

        # 3. Parse images & figures
        img_list = page.get_images(full=True)
        total_images_count += len(img_list)
        for i_idx, img_info in enumerate(img_list):
            xref = img_info[0]
            rects = page.get_image_rects(xref)
            bbox = list(rects[0]) if rects else None
            figures.append(
                FigureBlock(
                    figure_id=f"{page_ref}_fig{i_idx}",
                    page_or_section=page_ref,
                    bbox=bbox,
                    caption=f"Image xref {xref}",
                    has_text_potential=True,
                    requires_review=True,
                )
            )

    # Scanned document detection:
    is_scanned = False
    if page_count > 0:
        avg_chars_per_page = total_text_len / page_count
        if avg_chars_per_page < 10 and total_images_count > 0:
            is_scanned = True
            warnings.append(
                "Document appears to be a scanned or image-only PDF with little or no selectable text. "
                "Text redactions cannot be reliably applied without OCR. Fail-closed: Requires review."
            )

    if figures:
        warnings.append(
            f"Document contains {len(figures)} figure(s)/image(s) that may contain unverified text. "
            "Policy requires review for unverified visual content."
        )

    meta = doc.metadata or {}
    clean_meta = {k: v for k, v in meta.items() if v}
    doc.close()

    return NormalizedDocument(
        document_id=source_sha256[:16],
        source_sha256=source_sha256,
        filename=filename,
        file_type="pdf",
        page_count=page_count,
        text_blocks=text_blocks,
        tables=tables,
        figures=figures,
        warnings=warnings,
        metadata=clean_meta,
        is_scanned=is_scanned,
    )

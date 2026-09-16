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
from redact_core.ocr.models import convert_ocr_result_to_blocks
from redact_core.ocr.router import OCRRouter, default_ocr_router


def parse_pdf(
    file_path_or_bytes: Path | str | bytes,
    filename: str = "document.pdf",
    ocr_router: OCRRouter | None = None,
) -> NormalizedDocument:
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

    # Scanned document detection & OCR routing:
    is_scanned = False
    ocr_status: str | None = None
    ocr_provider: str | None = None
    ocr_coverage: float | None = None
    ocr_warnings: list[str] = []

    page_geometries = [(page.rect.width, page.rect.height) for page in doc]

    if page_count > 0:
        avg_chars_per_page = total_text_len / page_count
        if avg_chars_per_page < 10 and total_images_count > 0:
            is_scanned = True
            warnings.append(
                "Document appears to be a scanned or image-only PDF with little or no selectable text. "
                "Text redactions cannot be reliably applied without OCR. Fail-closed: Requires review."
            )

            # Check if an OCR provider is configured and available
            router = ocr_router or default_ocr_router
            provider = router.resolve_provider()

            if provider is not None:
                raw_bytes = (
                    file_path_or_bytes
                    if isinstance(file_path_or_bytes, bytes)
                    else path.read_bytes()
                )
                try:
                    ocr_res = router.process_document(
                        data=raw_bytes,
                        mime_type="application/pdf",
                        page_geometries=page_geometries,
                    )
                    ocr_blocks, ocr_warns = convert_ocr_result_to_blocks(ocr_res)
                    text_blocks.extend(ocr_blocks)
                    ocr_provider = ocr_res.provider_name
                    ocr_coverage = ocr_res.coverage
                    ocr_warnings = ocr_warns
                    warnings.extend(ocr_warns)

                    if ocr_res.coverage >= 0.8 and not ocr_res.requires_review:
                        ocr_status = "complete"
                        warnings.append(
                            f"Scanned document processed with OCR provider '{ocr_provider}' "
                            f"(coverage: {ocr_coverage:.1%})."
                        )
                    else:
                        ocr_status = "partial" if ocr_res.coverage > 0 else "failed"
                        warnings.append(
                            f"Scanned document OCR yielded incomplete coverage "
                            f"({ocr_coverage:.1%}, status: {ocr_status}). Fail-closed."
                        )
                except Exception as e:
                    ocr_status = "failed"
                    ocr_warnings.append(f"OCR processing failed: {e}")
                    warnings.append(f"OCR processing failed: {e}. Fail-closed: Requires review.")
            else:
                ocr_status = "not_performed"

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
        ocr_status=ocr_status,
        ocr_provider=ocr_provider,
        ocr_coverage=ocr_coverage,
        ocr_warnings=ocr_warnings,
    )

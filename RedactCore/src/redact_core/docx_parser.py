"""DOCX document parser using python-docx.

Extracts paragraphs, runs, tables, headers/footers, and figures into a normalized model.
"""

from io import BytesIO
from pathlib import Path
import docx

from redact_core.hashing import compute_sha256_bytes, compute_sha256_file
from redact_core.models import (
    FigureBlock,
    NormalizedDocument,
    TableBlock,
    TextBlock,
    TextSpan,
)


def parse_docx(file_path_or_bytes: Path | str | bytes, filename: str = "document.docx") -> NormalizedDocument:
    """Parses a DOCX document into the normalized document representation."""
    if isinstance(file_path_or_bytes, bytes):
        stream = BytesIO(file_path_or_bytes)
        doc = docx.Document(stream)
        source_sha256 = compute_sha256_bytes(file_path_or_bytes)
    else:
        path = Path(file_path_or_bytes)
        doc = docx.Document(str(path))
        source_sha256 = compute_sha256_file(path)
        filename = path.name

    warnings: list[str] = []
    text_blocks: list[TextBlock] = []
    tables: list[TableBlock] = []
    figures: list[FigureBlock] = []

    # 1. Parse header/footer text
    for s_idx, section in enumerate(doc.sections):
        if section.header and section.header.paragraphs:
            header_text = " ".join(p.text for p in section.header.paragraphs if p.text.strip())
            if header_text:
                text_blocks.append(
                    TextBlock(
                        block_id=f"section_{s_idx}_header",
                        page_or_section=f"section_{s_idx}_header",
                        text=header_text,
                        spans=[
                            TextSpan(
                                span_id=f"section_{s_idx}_header_s0",
                                text=header_text,
                                start_char=0,
                                end_char=len(header_text),
                            )
                        ],
                    )
                )

    # 2. Parse main document paragraphs and runs
    for p_idx, para in enumerate(doc.paragraphs):
        para_text = para.text
        # Check for drawing/images in paragraph runs
        has_drawing = False
        for r_idx, run in enumerate(para.runs):
            if "drawing" in run._element.xml or "pict" in run._element.xml:
                has_drawing = True
                figures.append(
                    FigureBlock(
                        figure_id=f"p{p_idx}_r{r_idx}_fig",
                        page_or_section=f"paragraph_{p_idx}",
                        caption=f"Inline drawing in paragraph {p_idx}",
                        has_text_potential=True,
                        requires_review=True,
                    )
                )

        if not para_text.strip():
            continue

        spans: list[TextSpan] = []
        curr_offset = 0
        for r_idx, run in enumerate(para.runs):
            r_text = run.text
            if not r_text:
                continue
            start_c = curr_offset
            end_c = start_c + len(r_text)
            curr_offset = end_c
            spans.append(
                TextSpan(
                    span_id=f"p{p_idx}_r{r_idx}",
                    text=r_text,
                    font=run.font.name if run.font else None,
                    size=float(run.font.size.pt) if run.font and run.font.size else None,
                    start_char=start_c,
                    end_char=end_c,
                )
            )

        text_blocks.append(
            TextBlock(
                block_id=f"p{p_idx}",
                page_or_section=f"paragraph_{p_idx}",
                text=para_text,
                spans=spans,
            )
        )

    # 3. Parse tables
    for t_idx, tbl in enumerate(doc.tables):
        table_rows: list[list[str]] = []
        for r_idx, row in enumerate(tbl.rows):
            row_data: list[str] = []
            for c_idx, cell in enumerate(row.cells):
                cell_text = cell.text.strip()
                row_data.append(cell_text)

                # Also add table cell text as searchable text blocks for entity detection
                if cell_text:
                    text_blocks.append(
                        TextBlock(
                            block_id=f"t{t_idx}_r{r_idx}_c{c_idx}",
                            page_or_section=f"table_{t_idx}_r{r_idx}_c{c_idx}",
                            text=cell_text,
                            spans=[
                                TextSpan(
                                    span_id=f"t{t_idx}_r{r_idx}_c{c_idx}_s0",
                                    text=cell_text,
                                    start_char=0,
                                    end_char=len(cell_text),
                                )
                            ],
                        )
                    )
            table_rows.append(row_data)

        tables.append(
            TableBlock(
                table_id=f"table_{t_idx}",
                page_or_section=f"table_{t_idx}",
                rows=table_rows,
            )
        )

    # Inline shapes
    for s_idx, shape in enumerate(doc.inline_shapes):
        # Only add if not already captured
        fig_id = f"inline_shape_{s_idx}"
        if not any(f.figure_id == fig_id for f in figures):
            figures.append(
                FigureBlock(
                    figure_id=fig_id,
                    page_or_section="document_body",
                    caption=f"Inline shape {s_idx}",
                    has_text_potential=True,
                    requires_review=True,
                )
            )

    if figures:
        warnings.append(
            f"DOCX contains {len(figures)} figure/image element(s) with potential text. "
            "Layout-preserving DOCX views cannot redact embedded image text without OCR; marked requires_review."
        )

    # Core properties
    cp = doc.core_properties
    meta = {
        "title": cp.title or "",
        "author": cp.author or "",
        "comments": cp.comments or "",
        "last_modified_by": cp.last_modified_by or "",
    }
    clean_meta = {k: v for k, v in meta.items() if v}

    return NormalizedDocument(
        document_id=source_sha256[:16],
        source_sha256=source_sha256,
        filename=filename,
        file_type="docx",
        page_count=max(1, len(doc.sections)),
        text_blocks=text_blocks,
        tables=tables,
        figures=figures,
        warnings=warnings,
        metadata=clean_meta,
        is_scanned=False,
    )

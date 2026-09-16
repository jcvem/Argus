"""PDF true redaction transformation engine.

Applies cryptographic-grade redactions by modifying underlying PDF content streams
using PyMuPDF redaction annotations, stripping sensitive metadata, and cleaning xrefs.
NEVER uses superficial visual-only overlays.
"""

from pathlib import Path
import pymupdf

from redact_core.models import RedactionOperation, RedactionPlan


def transform_pdf(
    original_bytes: bytes,
    plan: RedactionPlan,
    sanitize_metadata: bool = True,
) -> bytes:
    """Transforms a copy of the original PDF bytes by applying all planned redaction operations.
    
    The original bytes are never mutated.
    """
    if plan.blocked:
        raise ValueError(f"Cannot transform document under a blocked plan: {plan.block_reason}")

    doc = pymupdf.open(stream=original_bytes, filetype="pdf")

    # Map operations by page index if specified (e.g. 'page_1' -> 0)
    for op in plan.operations:
        if op.action in ("allow",):
            continue

        target_text = op.target_text.strip()
        if not target_text:
            continue

        # Determine target pages
        pages_to_search = []
        if op.page_or_section.startswith("page_"):
            try:
                p_num = int(op.page_or_section.split("_")[1]) - 1
                if 0 <= p_num < len(doc):
                    pages_to_search = [p_num]
            except Exception:
                pages_to_search = list(range(len(doc)))
        else:
            pages_to_search = list(range(len(doc)))

        for p_idx in pages_to_search:
            page = doc[p_idx]
            rects = page.search_for(target_text)

            # If not found via search_for and bbox provided, fallback to bbox
            if not rects and op.bbox and len(op.bbox) == 4:
                rects = [pymupdf.Rect(op.bbox)]

            for r in rects:
                if op.action == "redact":
                    # Solid dark redaction box with optional replacement text
                    page.add_redact_annot(
                        r,
                        text=op.replacement_text or "",
                        fontsize=8,
                        fill=(0.1, 0.1, 0.1),
                        text_color=(0.9, 0.9, 0.9),
                    )
                elif op.action in ("mask", "replace"):
                    # Light background with clear replacement/mask text
                    page.add_redact_annot(
                        r,
                        text=op.replacement_text or "[REDACTED]",
                        fontsize=8,
                        fill=(0.9, 0.9, 0.9),
                        text_color=(0.2, 0.2, 0.2),
                    )
                elif op.action == "review":
                    # Review action: mark with review box
                    page.add_redact_annot(
                        r,
                        text=op.replacement_text or "[PENDING REVIEW]",
                        fontsize=8,
                        fill=(0.95, 0.9, 0.7),
                        text_color=(0.3, 0.2, 0.0),
                    )

    # Apply all redaction annotations across all pages to completely purge content streams and raster pixels
    for page in doc:
        page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_PIXELS)

    # Sanitize document metadata if requested
    if sanitize_metadata:
        doc.set_metadata({
            "title": "Redacted View",
            "author": "Argus RedactCore",
            "subject": f"Derived privacy-preserved view under policy {plan.policy_id}",
            "keywords": f"decision_id:{plan.decision_id}",
            "creator": "Argus RedactCore",
            "producer": "Argus RedactCore",
        })

    # Output cleaned, deflated bytes with stripped dead xrefs
    output_bytes = doc.tobytes(garbage=4, deflate=True, clean=True)
    doc.close()
    return output_bytes

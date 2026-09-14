# Security Policy & Operational Safeguards

Argus RedactCore is engineered for zero-trust document processing and derived view generation. This document outlines key security guarantees, safeguards, threat model considerations, and current MVP limitations.

---

## 1. Core Security Guarantees

### Immutability of Source Documents
- All original documents uploaded to RedactCore are stored content-addressed by their SHA-256 digest under `data/originals/<sha256>.<ext>`.
- The storage engine computes the SHA-256 before transformation, passes an in-memory byte copy to the transformation engine, and re-computes the file hash post-transformation. Any mutation of the source document triggers a critical `RuntimeError`.

### True Redaction (No Superficial Overlays)
- **PDF**: PyMuPDF redaction annotations (`add_redact_annot` followed by `apply_redactions`) are utilized. This physically deletes character drawing commands and associated text stream bytes from the document's content stream. Metadata properties are replaced with sanitized static values.
- **DOCX**: Runs and table cell text containing sensitive matches are replaced in-memory and re-serialized. Core metadata properties (title, author, comments, last modified) are sanitized.

### Audit Manifest Privacy (Zero Raw PII)
- Entity findings and redaction operations stored in view manifests (`data/manifests/view_<id>.json`) record only the cryptographic SHA-256 digest of the sensitive value (`value_digest`).
- Subject IDs and document hashes are similarly digested or pseudonymized. No raw sensitive text is ever exposed through audit manifests or public API responses.

### Fail-Closed Verification
- Prior to saving and serving any derived view, the verification engine re-opens the rendered output artifact, extracts all text and metadata, and verifies that none of the target sensitive values appear anywhere in the derived view.
- If any target string is discovered, the process immediately aborts, no view is stored, and a verification failure is raised.

---

## 2. Unverified Content & Review Policy

### Scanned and Image-Only Documents
- RedactCore inspects PDF text blocks to determine whether a document contains selectable text.
- If a document is flagged as scanned or image-only (`is_scanned: true`), processing is blocked **fail-closed** (`plan.blocked = True`, HTTP 403 / PermissionError).
- Redactions cannot be guaranteed without OCR; silent release of unredacted images containing text is prohibited.

### Embedded Figures & Visual Content
- Documents containing raster graphics or embedded figures are flagged with `FigureBlock(requires_review=True)`.
- Under policies that require figure review (`require_figure_review: true`), requests from subjects without a `reviewer` role generate explicit review warnings and increment `requires_review_count`.
- Visual elements are not silently assumed clean; compliance warnings are persisted to the view manifest.

---

## 3. Operational Limitations (Current MVP)

1. **Presidio NLP Model Availability**:
   - The primary deterministic baseline detector uses offline regular expressions for `EMAIL_ADDRESS`, `PHONE_NUMBER`, `EMPLOYEE_ID`, `SALARY`, `PERSON`, and `ADDRESS`.
   - Microsoft Presidio integration is optional. If the spaCy NLP model (e.g., `en_core_web_lg` or `en_core_web_sm`) is not loaded in the runtime environment, the detector falls back safely to the deterministic regex engine and notes the limitation in `/health`.
2. **OCR Integration**:
   - Scanned document OCR is not integrated into this MVP version. Scanned files are safely blocked fail-closed rather than processed insecurely.
3. **Complex Layout Tables**:
   - Nested tables or text wrapped in decorative vector drawings require careful bounding box alignment in PDF; the deterministic regex recognizer extracts text blocks natively supported by PyMuPDF.

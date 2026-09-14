# Argus RedactCore

Argus RedactCore provides deterministic, policy-driven, privacy-preserving document views for enterprise and compliance workflows. It generates auditable derived document views (PDF and DOCX) tailored to a subject's role and clearance without mutating original documents or leaking sensitive PII.

---

## Architecture Overview

```
[Original Document (PDF/DOCX)]
              │
              ▼
   [Immutable Storage] ──────► SHA-256 Content-Addressed (`data/originals/<hash>.<ext>`)
              │
              ▼
    [Normalized Parser] ─────► Text blocks, coordinate bounding boxes, tables, figures, warnings
              │
              ▼
   [Entity Recognizer] ──────► Deterministic Regex (Baseline) + Optional Presidio NLP
              │
              ▼
     [Policy Engine] ────────► Role & attribute-based evaluation (`policies/*.yaml`)
              │
              ▼
   [Redaction Planner] ──────► Ordered operations plan; fail-closed safety checks
              │
              ▼
   [Transform Engine] ───────► True PDF redaction (content stream purge) / DOCX replacement
              │
              ▼
   [Leak Verification] ──────► Re-opens output artifact; asserts absence of sensitive strings
              │
              ▼
   [Derived View Store] ─────► `data/views/view_<id>.<ext>`
   [View Audit Manifest] ────► `data/manifests/view_<id>.json` (Digests only, zero raw PII)
```

### Core Principles

1. **Immutable Storage**: Original files are saved strictly by their SHA-256 digest in `data/originals/`. Processing code only operates on byte copies and verifies that source files remain byte-identical post-transformation.
2. **True Redaction (Never Visual-Only)**: In PDFs, redaction annotations are applied via PyMuPDF to purge underlying content streams and xrefs. No black overlay boxes over live selectable text. DOCX transforms replace text across paragraph runs and table cells while scrubbing core metadata properties.
3. **Zero Raw PII in Logs or Manifests**: Finding values and subject identities in manifests are stored solely as one-way SHA-256 digests. Raw sensitive data is never serialized into manifests or public API responses.
4. **Post-Transformation Verification**: Every generated view is re-opened and searched for candidate sensitive strings before being made available for download. If a leak is detected, view creation fails closed.
5. **Explicit Review Behavior**: Scanned documents without selectable text fail closed. Embedded figures are flagged and recorded in `requires_review_count` and manifest warnings.

---

## Masking Contracts

The `mask_string(value, entity_type, mask_char)` utility implements deterministic, structure-preserving masking:

- **`EMAIL_ADDRESS`**:
  - Preserves the `@domain` portion.
  - If `len(user_part) >= 3`: Preserves the first and last character of `user_part`, masking intermediate characters 1:1.
    - Example: `alice.montgomery@example.com` &rarr; `a**************y@example.com` (14 asterisks)
    - Example: `bob@example.com` &rarr; `b*b@example.com`
  - If `len(user_part) == 2`: Preserves first and last character while inserting `mask_char * 2` between them to prevent exposing the raw 2-character value in the clear.
    - Example: `ab@example.com` &rarr; `a**b@example.com`
  - If `len(user_part) == 1`: Preserves the initial character followed by mask characters.
    - Example: `a@example.com` &rarr; `a***@example.com`
  - If `user_part` is empty: Replaces with `***`.
- **`PHONE_NUMBER`**:
  - Preserves formatting and masks intermediate digits, keeping the first 2 digits and last 2 digits when digit count &ge; 7.
    - Example: `+1-555-234-5678` &rarr; `+1-5**-***-**78`
- **`EMPLOYEE_ID`**:
  - Preserves the prefix and masks suffix keeping the last 2 digits.
    - Example: `EMP-84920` &rarr; `EMP-***20`
- **`GENERAL` / Fallback**:
  - For strings &le; 3 characters, masks all characters. For strings > 3 characters, preserves first and last character, masking intermediate characters.
    - Example: `Secret` &rarr; `S****t`

---

## Figure Review and Scanned Document Behavior

- **Scanned / Image-Only Documents**:
  - When a PDF contains no selectable text (`is_scanned: true`), RedactCore enforces **fail-closed** behavior (`plan.blocked = True`, raising `PermissionError` in CLI and returning `HTTP 403 Forbidden` in the API). Automated text redaction cannot be guaranteed without OCR.
- **Embedded Figures**:
  - When documents contain figures or raster charts, they are detected as `FigureBlock` and flagged with `requires_review: true`.
  - Policies with `require_figure_review: true` (such as `sales-quarterly` and `reviewer`) record warnings and increment `requires_review_count` unless the requesting subject holds a `reviewer` role. This makes unverified visual content explicit in the immutable audit manifest without silently assuming safety.

---

## CLI Reference

```bash
# Check subsystem health, recognizer status, and loaded policies
uv run redact-core health

# Inspect document structure, text blocks, figures, and candidate findings
uv run redact-core inspect fixtures/sample_report.pdf

# Generate a privacy-preserved derived view under a policy
uv run redact-core process fixtures/sample_report.pdf \
  --policy sales-quarterly \
  --subject demo_sales_viewer \
  --output /tmp/redactcore-sales.pdf

# View the audit manifest of a generated view
uv run redact-core verify view_<view_id>
```

---

## HTTP API Reference

The FastAPI application is defined in `redact_core.api:app`:

- `GET /health` &mdash; System health, storage status, policy listing, recognizer status.
- `GET /api/policies` &mdash; List available redaction policies.
- `GET /api/subjects` &mdash; Preconfigured demo subjects demonstrating role-based differentiation.
- `POST /api/upload` &mdash; Ingests PDF/DOCX into immutable storage and returns document structure and finding digests (never raw PII).
- `POST /api/views` &mdash; Generates, verifies, and stores a derived view for a given subject and policy.
- `GET /api/views/{view_id}/manifest` &mdash; Retrieves the immutable audit manifest for a derived view.
- `GET /api/views/{view_id}/download` &mdash; Downloads the verified derived artifact.
- `GET /api/views/{view_id}/preview` &mdash; Renders a thumbnail preview (PNG for PDF, text preview for DOCX).

---

## Verification & Testing

```bash
# Run full pytest suite
uv run pytest -q

# Run end-to-end API smoke test
uv run python scripts/smoke_test_api.py

# Validate generated view against its manifest and check for PII leaks
uv run python scripts/validate_view.py <view_id>
```

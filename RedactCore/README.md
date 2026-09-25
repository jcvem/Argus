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

- `GET /healthz` &mdash; Lightweight liveness and readiness probe for container runtimes and Cloud Run.
- `GET /health` &mdash; System health, storage status (including ephemeral warning), policy listing, recognizer status.
- `GET /api/policies` &mdash; List available redaction policies.
- `GET /api/subjects` &mdash; Preconfigured demo subjects demonstrating role-based differentiation.
- `GET /api/fixtures/{fixture_name}` &mdash; Synthetic test fixture access (gated by `REDACTCORE_ENABLE_DEMO_FIXTURES=true`).
- `POST /api/upload` &mdash; Ingests PDF/DOCX into immutable storage and returns document structure and finding digests (never raw PII).
- `POST /api/views` &mdash; Generates, verifies, and stores a derived view for a given subject and policy.
- `GET /api/views/{view_id}/manifest` &mdash; Retrieves the immutable audit manifest for a derived view.
- `GET /api/views/{view_id}/download` &mdash; Downloads the verified derived artifact.
- `GET /api/views/{view_id}/preview` &mdash; Renders a thumbnail preview (PNG for PDF, text preview for DOCX).

---

## Hosted Demo API

This section details hosting the API for remote stakeholder demonstrations (e.g. via Cloud Run or Docker).

> [!WARNING]
> **Demo-Only Boundary**: This hosted configuration is strictly intended for demonstration purposes. It does **not** provide production authentication or multi-tenant authorization. Caller-provided `subject_id` and `roles` parameters are accepted only to demonstrate policy differentiation across roles.

### 1. Local Run

```bash
# Start locally with safe localhost defaults
uv run uvicorn redact_core.api:app --host 0.0.0.0 --port 8080
```

### 2. Docker Build & Run

A production-ready `Dockerfile` with a non-root runtime user (`appuser:1000`) is included:

```bash
# Build the container image
docker build -t redact-core:demo .

# Run container locally exposing port 8080
docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  -e REDACTCORE_STORAGE_DIR=/tmp/redactcore-data \
  -e REDACTCORE_ENABLE_DEMO_FIXTURES=true \
  redact-core:demo
```

### 3. Cloud Run Deployment

Deploy to Google Cloud Run using `cloud-run.yaml` or `gcloud run deploy`:

```bash
# Using gcloud CLI (replace PROJECT_ID and REGION with your GCP parameters)
gcloud run deploy redact-core-demo \
  --image gcr.io/PROJECT_ID/redact-core:latest \
  --region REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 3 \
  --timeout 300 \
  --set-env-vars "REDACTCORE_STORAGE_DIR=/tmp/redactcore-data,REDACTCORE_ENABLE_DEMO_FIXTURES=true,REDACTCORE_CORS_ORIGINS=https://argus-demo.example.com,REDACTCORE_MAX_UPLOAD_BYTES=20971520"
```

Or deploy declaratively:
```bash
gcloud run services replace cloud-run.yaml --region REGION
```

### 4. Configuration Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Listening port for the Uvicorn HTTP server. |
| `REDACTCORE_STORAGE_DIR` | `./data` (local) / `/tmp/redactcore-data` (container) | Target root directory for immutable originals, derived views, and manifests. |
| `REDACTCORE_CORS_ORIGINS` | Safe localhost origins | Comma-separated list of allowed origins. Wildcard `*` disables credentials. |
| `REDACTCORE_ENABLE_DEMO_FIXTURES` | `false` (default) | Gating flag for `/api/fixtures/{name}` to prevent serving raw demo files in public environments unless explicitly enabled for demos. |
| `REDACTCORE_MAX_UPLOAD_BYTES` | `20971520` (20 MB) | Enforced boundary limit for incoming document uploads. |

### 5. Architectural & Security Limitations

- **Ephemeral Storage**: Container disk space in Cloud Run is strictly ephemeral. Files written to `/tmp/redactcore-data` will disappear when container instances scale down or restart. Production persistence requires durable cloud object storage (such as Google Cloud Storage or AWS S3) and a metadata database.
- **Identity & Access**: In this demo service, callers can specify `subject_id` and `roles` in `POST /api/views` to demonstrate redaction behaviors across different clearance levels. In production, caller-provided roles **must never be trusted**. True enterprise deployments require identity integration (Argus Cerberus / OIDC JWTs) where user clearance is authenticated and cryptographically verified.
- **Direct Streaming**: For large production payloads, documents should be uploaded and downloaded via short-lived signed URLs directly to/from cloud object storage rather than streamed through API container memory.

### 6. Demonstration Walkthrough (curl)

Follow this deterministic flow to test the API remotely:

```bash
# 1. Health Probe
curl -s http://localhost:8080/healthz
# Response: {"status":"ok"}

# 2. Inspect Subsystems & Recognizer
curl -s http://localhost:8080/health | jq .

# 3. Ingest Synthetic Document
UPLOAD_RES=$(curl -s -F "file=@fixtures/sample_report.pdf;type=application/pdf" http://localhost:8080/api/upload)
SOURCE_SHA=$(echo $UPLOAD_RES | jq -r .source_sha256)
echo "Uploaded SHA: $SOURCE_SHA"

# 4. Generate Derived View for Sales Viewer
VIEW_RES=$(curl -s -H "Content-Type: application/json" \
  -d "{\"source_sha256\":\"$SOURCE_SHA\",\"ext\":\"pdf\",\"policy_id\":\"sales-quarterly\",\"subject_id\":\"demo_sales_viewer\",\"roles\":[\"sales\",\"viewer\"]}" \
  http://localhost:8080/api/views)
VIEW_ID=$(echo $VIEW_RES | jq -r .view_id)
echo "Generated View ID: $VIEW_ID"

# 5. Fetch Immutable Audit Manifest (Zero Raw PII)
curl -s http://localhost:8080/api/views/$VIEW_ID/manifest | jq .

# 6. Download Verified Redacted PDF
curl -s -o derived_sales.pdf http://localhost:8080/api/views/$VIEW_ID/download
```

---

## Verification & Testing

```bash
# Run full pytest suite (23+ tests)
uv run pytest -q

# Run end-to-end API smoke test (Python TestClient)
uv run python scripts/smoke_test_api.py

# Run standalone HTTP demo verification against local/remote server
./scripts/demo_api.sh http://localhost:8080

# Validate generated view against its manifest and check for PII leaks
uv run python scripts/validate_view.py <view_id>
```

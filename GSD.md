1. Overview & RedactCore's Role in Argus
In the Argus architecture, RedactCore is the authoritative document transformation and verification data-plane engine. Its core invariant is "Allow with transformation": it ingests raw business documents, evaluates policies against subject clearances, transforms content streams (never visual-only overlays), verifies that zero sensitive data leaks, and creates cryptographic audit manifests.

2. Current Functionalities in RedactCore
RedactCore is currently the most functionally complete backend subsystem in the Argus workspace. Its implemented capabilities include:

A. Immutable Ingestion & Storage Architecture (

storage.py
)
Content-Addressed Storage: Ingests files strictly by SHA-256 hash in data/originals/<sha256>.<ext>.
Integrity Enforcement: Verifies original byte hashes before and after processing to guarantee that source files are never mutated in place.
Safety Boundaries: Rejection of path traversal sequences (.., null bytes, slashes) and upload size limits (configured to 20MB/50MB).
B. Normalized Document Parsing (

pdf_parser.py
,

docx_parser.py
)
Format-Agnostic AST (

NormalizedDocument
): Converts heterogeneous formats into text blocks, coordinate bounding boxes ([x0, y0, x1, y1]), character span offsets, font sizes, tables, and figure containers.
Scanned Document Detection: Detects PDFs without selectable text (is_scanned: True) and enforces a fail-closed policy when OCR coverage is incomplete.
Table & Run Extraction: Extracts tabular structures via PyMuPDF find_tables and DOCX paragraph run boundaries.
C. Hybrid Entity Recognition (

entities.py
,

llm_entities.py
)
Deterministic Regex Baseline: Fast, zero-dependency offline recognition for:
EMAIL_ADDRESS, PHONE_NUMBER (US, International, and Taiwan formats), EMPLOYEE_ID (EMP-xxxxx), SALARY / compensation, PROJECT_CODE, PERSON (title/role-prefixed), ADDRESS.
Optional Presidio NLP Fallback: Gracefully engages local Presidio/spaCy analyzer if installed without blocking offline execution.
Consent-Gated Gemini LLM Inspection:
Gated behind explicit flags (REDACTCORE_ENTITY_LLM_ENABLED and REDACTCORE_ALLOW_CLOUD_LLM).
Strict bounding verification: rejects hallucinated or out-of-bounds entity spans returned by the model.
Deterministic findings always take precedence over LLM suggestions.
D. OCR Router & Cloud Escalation (

ocr/router.py
)
Pluggable provider routing supporting Google Cloud Document AI, Gemini Document OCR, and local/offline test providers.
Gated by explicit cloud-consent checks (is_cloud_ocr_permitted) to prevent accidental data exfiltration.
E. Declarative Policy Evaluation & Planning (

policy.py
,

planner.py
)
YAML-based policy specification (policies/*.yaml) evaluating actions: redact, mask, replace, allow, review.
Condition matching on subject roles, departments, or clearances.
Deterministic Structure-Preserving Masking:
E.g., emails preserve @domain and outer characters (<alice.montgomery@example.com> → a**************<y@example.com>); phone numbers mask intermediate digits; employee IDs preserve prefix and terminal digits.
Fail-Closed Planning: Blocks execution if scanned content lacks OCR; tracks requires_review_count for unverified figures and risky findings.
F. Physical Document Transformation (True Redaction) (

pdf_transform.py
,

docx_transform.py
)
PDF Content Stream Purging: Applies PyMuPDF add_redact_annot and page.apply_redactions(images=PDF_REDACT_IMAGE_PIXELS) to permanently wipe underlying text bytes and raster pixels from PDF xrefs (never visual-only black boxes).
DOCX Scrubbing: Replaces text across cross-run boundaries and table cells; sanitizes document core metadata properties.
G. Post-Transformation Verification & Leak Detection (

verifier.py
)
Independently re-opens the output PDF/DOCX before releasing it.
Extracts all text and metadata, searching for the raw values of any planned redaction/mask target.
Verifies page counts and structural integrity; suppresses the view entirely if any leak is detected.
H. Immutable Audit Manifests & Zero-PII Guarantee (

manifests.py
)
Generates JSON manifests containing SHA-256 digests of sensitive values and subject IDs, policy versions, decision seeds, operation counts, and verification status.
Zero raw PII is written to disk manifests or returned in API responses (raw_value is excluded from serialization).
I. Delivery Interfaces (

api.py
,

cli.py
,

web/
)
FastAPI REST service with endpoints for /health, /api/upload, /api/views, /api/views/{id}/manifest, /api/views/{id}/download, and page previews (/api/views/{id}/preview).
CLI tool (redact-core health, inspect, process, verify).
Local HTML/JS web demo workbench.
3. What is Still Missing from the Overall Picture?
When viewing RedactCore against the complete Argus Data Plane thesis, several key components are missing or incomplete across three layers:

┌────────────────────────────────────────────────────────────────────────┐
│                          MISSING GAPS SUMMARY                          │
├───────────────────────────────┬────────────────────────────────────────┤
│ 1. RedactCore Internal Gaps   │ Structured data formats (CSV/SQL),     │
│                               │ Aggregation/filtering, Cloud storage   │
├───────────────────────────────┼────────────────────────────────────────┤
│ 2. Upstream Integrations      │ Connectors (Drive/S3), Aristotle sync, │
│                               │ Medusa change simulation               │
├───────────────────────────────┼────────────────────────────────────────┤
│ 3. Downstream AI Delivery     │ Cerberus runtime gateway, RAG chunking │
│                               │ & vector indexing, Human review queue  │
└───────────────────────────────┴────────────────────────────────────────┘
A. Internal Functional & Data Format Gaps
Lack of Structured & Tabular Data Projections:
RedactCore currently only transforms PDF and DOCX.
The Argus thesis requires redacting and projecting business data from CSV, Excel (XLSX), JSON payloads, and relational database queries.
Missing Transformation Primitives: Row Filtering & Aggregation:
The Argus specification defines: "filter irrelevant records, redact sensitive fields, aggregate where detail is unnecessary".
RedactCore currently performs text substitution (redact, mask, replace). It cannot yet perform numeric aggregations (e.g. bucketing salaries into $100k-$120k bands or sum/averaging rows) or record-level row filtering.
Pure Image Handling (Scans / Screenshots):
Currently, scanned files must be uploaded wrapped inside a PDF. Standalone image formats (PNG, JPEG, TIFF) are not directly processed or redacted into derived image views.
B. Storage, Production Security & Scalability Gaps
Durable Cloud Object Storage:
RedactCore currently writes to local disk or ephemeral container storage (/tmp/redactcore-data).
Missing native cloud storage adapters (GCS, AWS S3, Azure Blob) and presigned URL flows to avoid routing high-bandwidth binary streams through API server memory.
Production Identity & Authentication:
In the API (/api/views), caller-supplied subject_id and roles are accepted directly for demo purposes.
It lacks JWT/OIDC authentication, mTLS, or cryptographic verification connecting it to Cerberus or enterprise IdPs.
Asynchronous Job Pipeline:
View generation is synchronous. Large documents (e.g., a 100-page operational audit) run into HTTP request timeouts. It lacks a background task queue (Celery, Cloud Tasks) with progress polling or webhooks.
C. Integration with the Wider Argus Ecosystem
Cerberus (Runtime AI/MCP Gateway Enforcement):
Cerberus is intended to intercept AI agent tool calls and RAG context fetches, evaluate policies, and request verified views from RedactCore.
RedactCore currently has no machine-to-machine adapter or RPC interface specifically tailored for Cerberus.
Aristotle (Policy Authoring & Formal Verification):
Policies in RedactCore are currently static YAML files loaded from disk.
There is no automated policy distribution or sync mechanism connecting Aristotle's authoring/verification output to RedactCore's active policy registry.
ArgusBC (Control Plane UI):

ArgusBC
 has implemented mock/demo views, but it is not yet fully wired to RedactCore's live /api/upload and /api/views endpoints.
Ingestion Connectors (Drive / SharePoint / S3):
Currently, documents must be manually uploaded via HTTP. Automated ingestion workers that sync from source connectors, verify consent scopes, and push to RedactCore are not yet built.
RAG Extraction, Chunking & Embedding Pipeline:
The ultimate goal is: "Safe derived view becomes eligible for RAG indexing".
RedactCore generates the derived file, but there is no pipeline to extract safe text chunks from the derived view, calculate embeddings, and push them into a vector database (e.g., pgvector / Pinecone) for agent retrieval.
Human Reviewer Queue & Exception Workflow:
RedactCore flags requires_review_count for unreviewed figures and low-confidence detections, but there is no interactive review inbox where a compliance officer can review and approve flagged items.
4. Recommended Priority Roadmap
If we are prioritizing next steps on RedactCore, here is the natural sequencing:

Wire RedactCore to ArgusBC: Connect ArgusBC's document/view pages to RedactCore's /api/upload and /api/views endpoints so that uploads and role-based view switching work end-to-end in the UI.
Implement Structured Data Projections: Add CSV/JSON support to RedactCore so tabular operational data (e.g. Victor synthetic manufacturing data) can be filtered, masked, and aggregated.
Connect to Aristotle: Enable RedactCore to accept exported policies directly from Aristotle's API.
Build the Safe RAG Ingestion Hook: Add an export step where a verified derived view outputs sanitized text chunks ready for vector indexing.

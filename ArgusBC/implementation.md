# Argus Core UI Implementation Plan

> **For the implementer:** Build the UI in `ArgusBC` against the existing Argus/RedactCore contracts. Do not invent a second policy or redaction engine in the frontend.

**Goal:** Build a high-density, trustworthy Argus control-plane UI that lets a user inspect documents and findings, compare policy outcomes by subject, generate verified privacy-preserved views, and understand exactly why a view was allowed, transformed, reviewed, or blocked.

**Architecture:** The UI is a control and observability layer over the existing RedactCore API. RedactCore remains authoritative for document parsing, entity detection, policy evaluation, redaction planning, transformation, leak verification, immutable storage, and audit manifests. The UI may provide local demo state and a natural-language policy authoring experience, but it must serialize only contracts that the backend actually supports; unsupported future capabilities must be visibly marked as preview/mock.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind or the existing project styling conventions, Lucide React, and Zustand or React Context for local UI state. Backend integration uses the existing FastAPI API in `RedactCore/src/redact_core/api.py`.

---

## 1. Existing Argus capabilities to preserve

### 1.1 Argus module boundaries

The UI should represent the current module architecture without collapsing responsibilities:

```text
Aristotle  -> formal policy consistency and counterexamples
Medusa     -> change-impact simulation, quarantine, and access review
Cerberus   -> runtime AI/MCP gateway enforcement
RedactCore -> privacy-preserved document and data views
```

For this UI milestone, RedactCore is the implemented backend surface. Aristotle, Medusa, and Cerberus should appear as clearly separated future/control-plane concepts, not as fake completed integrations.

RedactCore must remain the trusted transformation/verifier. It does not decide identity authorization. Cerberus will eventually provide authenticated identity and runtime enforcement; the current demo API accepts demo `subject_id` and `roles` only to demonstrate policy differentiation and must be labeled accordingly.

### 1.2 RedactCore processing pipeline

The primary UI flow must map to the real pipeline:

```text
Upload PDF/DOCX
  -> immutable SHA-256 original storage
  -> normalized parse: text blocks, spans, tables, figures, metadata
  -> entity detection: deterministic regex, optional Presidio, optional consent-gated Gemini
  -> YAML policy evaluation against subject/resource context
  -> ordered redaction plan
  -> true PDF redaction or DOCX replacement
  -> post-transform leak verification
  -> derived view + zero-raw-PII audit manifest
```

The UI must never imply that a black overlay is sufficient. A successful result means the derived artifact was reopened and verified, and the original remained byte-identical.

### 1.3 Current policy model

RedactCore currently loads YAML files from `RedactCore/policies/*.yaml` through `PolicyEngine`.

The actual policy contract is:

- `policy_id`, `name`, `version`, and `description`
- `default_action`: currently `allow` or `review`
- `require_figure_review`
- ordered entity rules
- per-rule `entity_type`, `action`, `replacement`, `mask_char`, `description`, and optional role conditions

Supported rule actions are `allow`, `redact`, `mask`, `replace`, and `review`. The frontend must not replace these with unimplemented generic actions such as `BLOCK`, `REDACT_METADATA`, or `READ_ONLY` unless they are explicitly labeled as a future Cerberus/Medusa concept.

The shipped policies are:

1. `sales-quarterly` — restricted sales view. Redacts salary, employee IDs, phone numbers, people, passwords, secrets, and API keys; masks email addresses and physical addresses; requires figure review.
2. `finance-full-access` — finance audit view. Allows salary, employee IDs, people, and email; redacts phone numbers; masks addresses; does not require figure review.
3. `reviewer` — compliance reviewer view. Defaults to review, sends salary, phone, email, and person findings to review, masks employee IDs, and requires figure review.

The policy screen should render these policies from `GET /api/policies`, then show their rules in a readable entity/action matrix. It should not hard-code policy claims that can drift from YAML.

### 1.4 Subject and resource context

The current subject contract includes:

- `subject_id`
- `roles`
- `groups`
- `department`
- `clearance`
- `purpose`

The current resource contract includes:

- `document_id`
- `classification`
- `owner`
- `tags`

The current API exposes three demo subjects through `GET /api/subjects`:

- Sales Representative (`sales`, `viewer`, standard clearance)
- Finance Auditor (`finance`, `viewer`, confidential clearance)
- Compliance Reviewer (`reviewer`, `compliance`, compliance clearance)

The UI should use these as selectable, labeled demo personas. It must show that the selected subject is demonstration input, not authenticated production authorization.

### 1.5 Detection, privacy, and safety states

The upload response exposes safe structural metadata and finding summaries, never raw sensitive values. Findings include entity type, digest, location, confidence, source, review flag, and optional safe rationale. The UI must display digests or masked labels, never reconstruct or log raw PII.

Detection sources may include:

- deterministic local regex baseline
- optional local Presidio enrichment
- optional Gemini LLM inspection, disabled by default and independently gated by explicit cloud consent

The health view should make these modes visible without exposing credentials, prompts, document content, or secrets.

Scanned/image-only PDFs are fail-closed when OCR is disabled or incomplete. Embedded figures can require review when the policy sets `require_figure_review: true`. These are first-class safety states in the UI, not generic errors:

- `Ready`
- `Review required`
- `Blocked: scanned document/OCR coverage insufficient`
- `Blocked: policy or verification failure`
- `Verified`

### 1.6 Derived views and audit manifests

`POST /api/views` creates a verified derivative from a stored original and returns:

- `view_id`
- source and output SHA-256 digests
- policy ID/version
- operation counts
- verification result
- warnings
- download, preview, and manifest URLs

The manifest contains digests, operation counts, timestamps, formats, warnings, and verification details. It must not expose raw PII or raw subject identity. The UI should offer an “Audit details” drawer that shows this safe manifest and links to the verified derivative.

---

## 2. Product surfaces

### Screen 1: Security Dashboard (`/dashboard`)

Replace the generic exposure dashboard with a RedactCore-aware operations dashboard.

Show:

- RedactCore health status from `GET /healthz` and `GET /health`
- loaded policy count and policy IDs
- detector status: deterministic baseline, Presidio availability/limitation, and Gemini inspector status
- OCR provider mode and cloud-consent status without credentials
- storage mode, including the ephemeral-storage warning when applicable
- recent demo documents/views held in local UI state, with source digest prefixes and safe filenames
- counts of verified views, review-required findings, blocked documents, and warnings calculated from fetched responses

Document table columns:

- filename and PDF/DOCX type
- source SHA-256 prefix
- pages, text blocks, tables, and figures
- scanned/OCR state
- findings count
- safety state
- actions: Inspect, Choose Policy, Generate View

Do not show “Google Drive synced” or “AI agents without PBAC” as real metrics yet. If these concepts are included for product direction, label them “planned integration” and keep them visually separate from live RedactCore metrics.

### Screen 2: Document Inspector (`/documents/:sourceSha256`)

Add a document-centric screen because RedactCore already returns the data required for it.

Show:

- safe document metadata and source digest
- normalized structure counts: pages, text blocks, tables, figures
- scanned/OCR status, provider, coverage, and warnings
- entity findings table with entity type, page/section, source, confidence, digest prefix, and review status
- no raw finding values
- policy/persona selector
- “Generate derived view” action

For figures, show “visual review required” where appropriate. For scanned documents, explain why generation is blocked rather than offering a misleading bypass.

### Screen 3: Policy Studio (`/policies`)

Use two modes:

#### A. Existing policy inspection

This is the production-backed mode. Fetch `GET /api/policies`, allow selection of `sales-quarterly`, `finance-full-access`, or `reviewer`, and render:

- policy identity and version
- default action
- figure-review requirement
- entity rules and descriptions
- action legend: allow, mask, redact/replace, review
- selected subject compatibility/demo context

#### B. Natural-language policy draft

Keep the textarea and quick prompts from the original concept, but do not pretend a natural-language compiler exists in RedactCore today.

The first UI version should provide a clearly labeled local “draft translator” for demo prompts, limited to deterministic mappings such as:

- “salary/compensation” -> `SALARY`
- “employee ID/staff ID” -> `EMPLOYEE_ID`
- “phone/telephone” -> `PHONE_NUMBER`
- “email” -> `EMAIL_ADDRESS`
- “name/person” -> `PERSON`
- “secret/API key/password” -> corresponding credential types

The draft output must be marked `Draft / not persisted` and must not silently mutate YAML or claim to enforce a policy. A future backend contract should be designed around versioned policy snapshots and Aristotle consistency checks before adding Save/Enforce actions.

For the impact preview, use actual document findings and selected subject/policy where available. Do not claim Google Shared Drive or agent impact until Medusa/Cerberus contracts exist.

### Screen 4: View Generator (`/views/new`)

Provide a guided flow:

1. Select an uploaded document.
2. Select a policy from the live policy list.
3. Select a demo subject from the live subject list.
4. Show the expected entity actions before generation.
5. Submit `POST /api/views`.
6. Render progress and final verification.

Success state:

- verified badge
- view ID
- output digest
- operation counts
- warnings/review count
- preview, download, and manifest links

Failure state:

- preserve the HTTP status and safe backend detail
- distinguish fail-closed permission/safety blocks from malformed requests and server errors
- never offer the original document as a fallback download

### Screen 5: Agent Sandbox (`/sandbox`)

Keep this as a scenario simulator, not a claimed Cerberus gateway.

The sandbox should simulate a retrieval request against an uploaded document by:

- selecting a demo subject
- selecting a policy
- showing the selected identity context
- generating a RedactCore-derived view
- displaying the result as `VERIFIED VIEW`, `REVIEW REQUIRED`, or `BLOCKED`
- showing policy ID/version, decision/view IDs, operation counts, warnings, and verification details

The “what the LLM receives” panel must display only the verified derived artifact or safe metadata. Do not display original sensitive text beside it. Label runtime enforcement, MCP interception, and Cerberus decisions as future integration points.

---

## 3. API integration contract

Create a typed frontend API client around these existing endpoints:

- `GET /healthz`
- `GET /health`
- `GET /api/policies`
- `GET /api/subjects`
- `POST /api/upload`
- `POST /api/views`
- `GET /api/views/{view_id}/manifest`
- `GET /api/views/{view_id}/download`
- `GET /api/views/{view_id}/preview?page=N`

Keep API types aligned with the Pydantic models in `RedactCore/src/redact_core/models.py`, especially `EntityFinding`, `RedactionPlan`, `VerificationResult`, and `ViewManifest`.

The client must:

- centralize base URL configuration
- handle multipart upload safely
- preserve backend status codes
- parse validation errors into actionable UI messages
- avoid placing raw document text or credentials in browser logs
- treat source hashes, view IDs, and manifest data as opaque identifiers

If the frontend is served from a different origin, configure the backend `REDACTCORE_CORS_ORIGINS`; do not solve this by enabling a wildcard with credentials.

---

## 4. Suggested frontend structure

Use the following structure if the folder is currently empty; first inspect existing files before creating it:

```text
ArgusBC/
  app/
    dashboard/page.tsx
    documents/[sourceSha256]/page.tsx
    policies/page.tsx
    views/new/page.tsx
    sandbox/page.tsx
    layout.tsx
  components/
    AppShell.tsx
    HealthStatus.tsx
    PolicyRuleTable.tsx
    FindingTable.tsx
    DocumentStatusBadge.tsx
    VerificationCard.tsx
    ManifestDrawer.tsx
  lib/
    api.ts
    types.ts
    demo-translator.ts
    format-safe-data.ts
  state/
    demo-store.ts
  tests/
    api-client.test.ts
    policy-rendering.test.tsx
    safety-states.test.tsx
  implementation.md
```

Do not add dependencies until the actual frontend manifest has been inspected. Match the existing Argus Web design tokens only if the UI is intended to share that product surface; otherwise keep the new control-plane UI self-contained.

---

## 5. Implementation sequence

### Phase 1: Establish the real backend contract

1. Inspect the existing frontend/package manifest and determine whether this folder is an empty UI scaffold or needs initialization.
2. Add typed API models matching the current FastAPI responses.
3. Add health, policy, subject, upload, view-generation, manifest, preview, and download client methods.
4. Add safe error handling for 400, 403, 413, 500, and network failures.

### Phase 2: Build the RedactCore document flow

1. Implement upload and document summary state.
2. Render safe findings and structural metadata.
3. Implement policy and subject selection from live endpoints.
4. Implement view generation and verified-result states.
5. Add manifest and derived-preview views.

### Phase 3: Build the control-plane screens

1. Build the dashboard from live health and local session data.
2. Build the document inspector.
3. Build policy inspection with the three shipped YAML policies.
4. Add the explicitly non-persistent natural-language draft translator.
5. Build the sandbox around derived-view generation, not fabricated retrieval output.

### Phase 4: Prepare future module integration without faking it

Define frontend extension points for typed contracts that may later arrive from:

- Aristotle: policy consistency result and counterexample
- Medusa: impact report, quarantine state, and approval state
- Cerberus: authenticated access request and runtime decision

Until those contracts exist, show “not connected” or “planned” states. Do not create fake enforcement records that look like production audit events.

---

## 6. Verification requirements

Backend verification already exists in `RedactCore/tests/`, including:

- policy and subject listing
- PDF and DOCX upload
- derived-view generation
- absence of fixture PII in outputs
- scanned-document fail-closed behavior
- health and CORS behavior
- filename, size, fixture, and view-ID validation

The UI must add tests for:

1. Policy list rendering uses API data and includes all three current policy IDs.
2. Rule actions render correctly for allow, mask, redact/replace, and review.
3. Raw finding values never appear in rendered finding summaries or browser logs.
4. Scanned documents render a blocked state with the OCR explanation.
5. Figure warnings render as review-required rather than success-without-warning.
6. Successful generation renders `verification.passed`, output digest, operation counts, and manifest links.
7. Failed generation never exposes an original-document download action.
8. The natural-language translator is visibly draft-only and does not call a nonexistent save/enforce endpoint.
9. API errors preserve safe backend details and do not render stack traces or secrets.

Manual acceptance flow:

```text
Start RedactCore API
  -> open dashboard and verify /health data
  -> upload sample_report.pdf
  -> inspect findings without raw PII
  -> generate sales-quarterly view for demo_sales_viewer
  -> confirm verified derivative, preview, download, and manifest
  -> repeat with finance-full-access and compare operation counts
  -> upload scanned_sample.pdf
  -> confirm generation is blocked fail-closed
  -> select reviewer policy and confirm review/figure states
```

Run from `RedactCore` for backend verification:

```bash
uv run pytest -q
uv run python scripts/smoke_test_api.py
```

Run the frontend's configured lint, typecheck, unit tests, and production build from `ArgusBC` after the frontend manifest is known.

---

## 7. Security and product constraints

- Never put raw PII in React state when a digest, count, location, or safe summary is sufficient.
- Never log upload bodies, findings, prompts, API keys, or raw backend exceptions.
- Never make caller-provided demo roles look like authenticated production identity.
- Never allow a failed verification to appear as a downloadable success.
- Never treat visual masking as proof of redaction; only RedactCore verification establishes a safe derived view.
- Never bypass scanned-document or incomplete-OCR blocks from the UI.
- Keep cloud OCR and Gemini entity inspection consent-gated and visibly off by default.
- Keep immutable originals inaccessible through frontend routes; expose only verified derivative endpoints.
- Keep RedactCore policy semantics separate from future identity authorization, Medusa simulation, Aristotle proofs, and Cerberus runtime enforcement.

## 8. Open questions for later milestones

- What authenticated identity provider will supply production `SubjectContext` to Cerberus?
- What versioned policy-snapshot contract will Aristotle validate?
- What Medusa report schema will provide file/agent impact counts?
- Should production derived views move from local/ephemeral storage to object storage and a metadata database?
- Should natural-language policy drafting be implemented as an Aristotle-backed workflow or a separate policy authoring service?
- Which real source connector, if any, will replace the current upload-first demo flow?
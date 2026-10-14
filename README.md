# Argus

> **Give AI the context it needs—not the data it does not.**

Argus is a policy-governed data plane for humans and AI agents. It helps organizations use cross-department business data without giving every person, agent, or model unrestricted access to raw files.

## Core thesis

Traditional file permissions ask:

```text
Can this identity open this file?  ALLOW / DENY
```

That is too coarse for modern AI work. A useful task may need data from sales, operations, finance, customer service, or engineering, while the requester should not receive every field in every source.

Argus asks:

```text
What representation of this data may this identity receive
for this purpose, at this time?
```

This enables **allow with transformation**:

```text
allow the task
+ filter irrelevant records
+ mask identifiers
+ redact sensitive fields
+ aggregate where detail is unnecessary
+ require review when uncertainty remains
+ deny when safe delivery cannot be proven
```

Argus is not a replacement for an identity provider, DLP platform, object store, or vector database. It is the policy and verified-view layer between those systems and humans, AI agents, RAG systems, and tools.

## Why file-based IAM is not enough

File IAM usually cannot express all of these at the point where an AI answer is assembled:

```text
Allow order status but hide customer email.
Allow a warehouse lead to see assigned records but not other customers.
Allow an accountant to see this month's close data until the engagement ends.
Allow a supplier to see its own records but not competing supplier prices.
Allow an agent to use aggregated trends but not raw employee or customer rows.
```

Argus turns these requirements into policy-governed views. The same source can produce different safe representations for a warehouse lead, marketing analyst, finance reviewer, external partner, or company-wide AI agent.

## Cross-department example: manufacturing quality incident

A manufacturer asks:

> What is causing this quality incident, and what should each department do next?

The answer may require production batches, inspection results, machine maintenance, supplier lots, customer requirements, and service tickets.

Argus can deliver different representations:

```text
Quality engineer:
  defects, inspection evidence, and batch details

Production manager:
  line status, machine risk, and corrective actions

Procurement:
  supplier lot and delivery risk

Account manager:
  customer impact and delivery commitments

External customer:
  approved root-cause and corrective-action summary

Company-wide agent:
  aggregated risk, owner, and next steps
```

Everyone works from the same incident context without receiving the same raw data.

## System architecture

```text
Source connector / upload / Drive / internal system
                         │
                         ▼
              Consent, scope, and ingestion job
                         │
                         ▼
               Immutable source and metadata
                         │
                         ▼
              RedactCore normalize and detect
                         │
                         ▼
          Aristotle policy authoring and validation
                         │
                         ▼
              Medusa impact simulation / review
                         │
                         ▼
              Cerberus runtime enforcement point
                         │
                         ▼
        RedactCore transformation / structured projection
                         │
                         ▼
                 Verified derived data view
                         │
                         ▼
              RAG index / human or AI delivery
                         │
                         ▼
                 Answer, action, and audit event
```

### Module responsibilities

| Module | Responsibility | Current status |
|---|---|---|
| **RedactCore** | Parse documents, detect candidates, transform PDF/DOCX/data views, verify outputs, and create manifests. | Implemented Python/FastAPI service. |
| **Aristotle** | Author policies, create roles, simulate effects, draft policies from natural language, and export RedactCore-compatible policies. | MVP workbench; deterministic checks today. |
| **Medusa** | Simulate policy, agent, connector, and resource changes; calculate impact; quarantine risky changes; manage review. | Specification / planned implementation. |
| **Cerberus** | Authenticate principals, enforce runtime decisions, govern MCP/tool calls, and prevent agents exceeding delegated authority. | Specification / planned implementation. |
| **ArgusBC** | Control-plane UI for organizations, workspaces, roles, policies, sources, views, agents, and audit activity. | Implemented control-plane foundation. |

## Data ingress and verified-view workflow

Argus must distinguish these states:

```text
DISCOVERED
  ≠ CONSENTED
  ≠ DOWNLOADED
  ≠ STORED_IMMUTABLE
  ≠ NORMALIZED
  ≠ POLICY_EVALUATED
  ≠ DERIVED
  ≠ VERIFIED
  ≠ INDEXED
```

A typical source flow is:

```text
Google Drive / upload / SharePoint / S3
        ↓
Connector and explicit consent scope
        ↓
File discovery and ingestion job
        ↓
Download bytes and calculate real SHA-256
        ↓
Store immutable original
        ↓
RedactCore parsing, OCR, and candidate detection
        ↓
Policy evaluation using principal, purpose, resource, and workspace
        ↓
Derived view: filter, mask, redact, replace, aggregate, review, or deny
        ↓
Independent leak and integrity verification
        ↓
Manifest and status update
        ↓
Safe derived view becomes eligible for RAG indexing
```

Only a verified derived view should become model context. The original is never silently replaced by a redacted copy.

## RedactCore pipeline

```text
Upload PDF/DOCX/data
   │
   ├──► 1. Store immutable original by content SHA-256
   ├──► 2. Normalize text, tables, figures, metadata, and OCR state
   ├──► 3. Detect candidates with deterministic rules, optional NLP, and consent-gated LLM enrichment
   ├──► 4. Evaluate policy against subject, role, purpose, resource, and classification
   ├──► 5. Build ordered transformation plan
   ├──► 6. Transform a copy using true PDF/DOCX/data operations
   ├──► 7. Reopen and verify the derived artifact for leakage and integrity
   └──► 8. Emit derived view, manifest, status, and audit event
```

An LLM may suggest OCR, classification, or candidate entities. It never independently authorizes access. Policy evaluation and post-transformation verification remain authoritative.

## Security invariants

1. **Policy before model context:** raw documents and tool responses do not reach an AI model before policy evaluation and transformation.
2. **Detection is not authorization:** regex, OCR, NLP, and LLMs identify candidates; policies decide what may be delivered.
3. **True redaction:** PDF content streams and DOCX content are transformed, not covered by visual black boxes.
4. **Immutable originals:** source bytes remain unchanged and are addressable by SHA-256.
5. **Fail closed:** missing identity, purpose, classification, OCR coverage, policy, or verification causes review or denial rather than silent allowance.
6. **No raw PII in logs:** manifests and audit records use safe metadata and digests rather than raw sensitive values.
7. **Least-privilege actions:** tools are allowlisted and write actions require explicit approval where risk warrants it.
8. **Reviewable policy changes:** draft, validation, approval, activation, revocation, and rollback are distinct states.

## ArgusBC organization and workspace model

```text
Organization
├── subscription and seats
├── members and invitations
├── organization roles and permissions
├── dedicated storage boundary
├── Demo / Sandbox workspace
├── Production workspace
├── policies
└── workspace-scoped AI agents
```

ArgusBC is intended to:

- Connect and scope source systems.
- Track ingestion and review states.
- Author and compare policies.
- Create roles and principals in the sandbox.
- Inspect immutable sources and verified derived views.
- Configure agent data scope and purposes.
- Review policy decisions and audit events.

Demo identities and local fallback data must remain clearly labeled. Production identity authority belongs to Cerberus and the enterprise identity provider.

## Current policy examples

Argus demonstrates policies including:

| Policy | Example purpose | Representative controls |
|---|---|---|
| `sales-quarterly` | Sales reporting | Mask or redact employee/contact data while allowing approved business metrics. |
| `finance-full-access` | Finance audit | Allow authorized finance fields while protecting unrelated personal contact data. |
| `reviewer` | Compliance review | Route uncertain findings and figures to human review. |
| Victor warehouse / marketing / company-wide agent policies | Cross-functional operations | Allow role-specific fields, mask identifiers, aggregate results, and block private notes or supplier-sensitive data. |

## Getting started locally

### RedactCore

```bash
cd RedactCore
uv sync
uv run pytest -q
uv run uvicorn redact_core.api:app --reload --port 8000
```

Hosted API endpoints include:

```text
GET  /healthz
GET  /health
GET  /api/policies
GET  /api/subjects
POST /api/upload
POST /api/views
GET  /api/views/{view_id}/manifest
GET  /api/views/{view_id}/download
```

The hosted demo requires durable object storage, authenticated identity, signed URLs, and server-derived roles before it should be treated as production service.

### Aristotle

```bash
cd Aristotle
uv sync
uv run pytest -q
uv run aristotle validate-data
uv run aristotle list-templates
uv run aristotle serve --port 8787
```

Aristotle provides policy authoring, role/principal creation, deterministic sandbox simulation, RedactCore-compatible import/export, and optional natural-language policy drafting. Its sandbox identities are not production IAM.

### ArgusBC

```bash
cd ArgusBC
npm install
npm test
npm run typecheck
npm run dev
```

The frontend can run with local/demo fallback data when the live RedactCore URL or Firebase configuration is unavailable. It must label that boundary honestly.

## Roadmap

- [x] RedactCore deterministic parsing, physical redaction, verification, audit manifests, and hosted API packaging.
- [x] Aristotle policy-authoring and deterministic sandbox MVP.
- [x] ArgusBC organization/workspace/control-plane foundation.
- [ ] Complete backend ingestion jobs for Google Drive and other connectors.
- [ ] Durable source/view/manifest storage and signed artifact URLs.
- [ ] Connect ArgusBC source ingestion to live RedactCore upload/view APIs.
- [ ] Safe-view extraction, chunking, embeddings, and workspace-scoped RAG index.
- [ ] Cerberus authenticated MCP/tool gateway and delegated identity enforcement.
- [ ] Medusa blast-radius simulation, quarantine, access review, and rollback.
- [ ] Aristotle Z3/SMT policy consistency and counterexample analysis.
- [ ] Production tenant isolation, observability, retention, revocation, and cost controls.

## Product thesis

> **RAG finds relevant information. Argus decides what the principal may receive. RedactCore creates the verified view. Cerberus enforces the decision at runtime.**

Argus helps organizations give AI broader operational context without giving AI unrestricted access to raw company data.

## Status and boundaries

Argus is an actively developed prototype. RedactCore is the most mature executable subsystem; Aristotle, Cerberus, Medusa, ingestion, durable persistence, and production identity integration remain bounded development milestones rather than completed enterprise guarantees.

Victor examples are synthetic demonstrations and must never be represented as real customer, employee, financial, or operational records.

Never commit API keys, OAuth tokens, service-account credentials, `.env` files, Firebase deployment state, generated build caches, or temporary agent briefs. Verify external deployment claims with live health/API requests rather than relying on a tool summary.

## Repository structure

```text
Argus/
├── ArgusBC/             # Control-plane UI and organization/workspace foundation
├── RedactCore/          # Authoritative document transformation and verification service
├── Aristotle/           # Policy authoring and sandbox MVP
├── Cerberus/            # Runtime AI/MCP gateway specification
├── Medusa/              # Policy-change simulation specification
├── DemoData/            # Synthetic Victor organization data
├── Web/                 # Related web integration/submodule
└── ARCHITECTURE.md      # Module boundaries and control flow
```

## Competition demo direction

A small, credible competition demonstration should show one cross-department AI agent answering one operational question for three roles. The same synthetic sources should produce three different safe contexts, with visible policy decisions, transformations, citations, and an audit event. Planned Cerberus, Medusa, and formal Aristotle capabilities must be labelled as planned until independently implemented and verified.

## Detailed references

Implementation-specific commands and contracts remain in:

- `ARCHITECTURE.md`
- `RedactCore/README.md`
- `Aristotle/README.md`
- `Cerberus/README.md`
- `Medusa/README.md`
- `DemoData/Victor/README.md`

## License

MIT for current prototype code unless a subdirectory states otherwise.

# Argus

> *The Hundred-Eyed Giant, Guardian of Enterprise Data.*

**Argus** is an attribute-based access control (ABAC) and privacy-preservation platform designed for modern enterprises sharing data with both **human collaborators** and **autonomous AI agents**.

---

## The Core Thesis

Traditional access control systems ask a binary question:

```text
Can this identity access the document? (ALLOW / DENY)
```

In an era of ubiquitous AI agents, MCP tool execution, and cross-departmental collaboration, binary access control breaks down:
- **Too permissive:** Granting full access exposes sensitive PII, executive compensation, customer identifiers, or proprietary keys.
- **Too restrictive:** Denying access prevents humans and AI agents from performing their jobs with the subset of data they actually need.

Argus shifts the paradigm from binary gating to **policy-governed representation**:

```text
What representation of this document or data may this identity receive?
```

Argus delivers **"Allow with Transformation"**—automatically producing mathematically verified, role-tailored, privacy-preserved views (PDF, DOCX, and structured data) derived from immutable enterprise originals.

---

## System Architecture

Argus is organized into four specialized modules with strict separation of concerns, orchestrated through a centralized control plane:

```text
Policy / Agent Change
         │
         ▼
 ┌───────────────┐
 │    Medusa     │ ──► Change-impact simulation, blast radius analysis, and quarantine
 └───────┬───────┘
         │
         ▼
 ┌───────────────┐
 │   Aristotle   │ ──► Formal policy consistency, contradiction checks, and counterexamples
 └───────┬───────┘
         │
         ▼
 ┌───────────────┐
 │ Human Review  │ ──► Approvals & governance via Argus Control Plane (ArgusBC)
 └───────┬───────┘
         │
         ▼
 ┌───────────────┐
 │   Cerberus    │ ──► Runtime Policy Enforcement Point (PEP) & AI/MCP gateway
 └───────┬───────┘
         │
         ▼
 ┌───────────────┐
 │  RedactCore   │ ──► Parsing, entity detection, true redaction, and leak verification
 └───────┬───────┘
         │
         ▼
 [Derived View Delivered to Human / AI Agent]
```

### Module Responsibilities

| Module | Role | Core Responsibility | Status |
| :--- | :--- | :--- | :--- |
| **[RedactCore](file:///Users/jc/Code/Argus/RedactCore)** | **Transformation & Verification Engine** | Parses documents, detects sensitive entities, executes physical redaction, verifies zero post-transform leakage, and generates tamper-evident audit manifests. | **Implemented** (Python / FastAPI) |
| **[ArgusBC](file:///Users/jc/Code/Argus/ArgusBC)** | **Control Plane UI** | High-density enterprise dashboard for policy authoring, document inspection, multi-persona view comparison, and compliance auditing. | **Implemented** (Next.js / TypeScript) |
| **[Cerberus](file:///Users/jc/Code/Argus/Cerberus)** | **Runtime Gateway & PEP** | Authenticates humans/agents, enforces runtime access decisions, terminates MCP sessions, and ensures agents never exceed delegated permissions. | *Specification / In Progress* |
| **[Medusa](file:///Users/jc/Code/Argus/Medusa)** | **Simulation & Quarantine** | Pre-activation blast-radius simulator that evaluates access-graph impacts of proposed policy/agent changes before activation. | *Specification / In Progress* |
| **[Aristotle](file:///Users/jc/Code/Argus/Aristotle)** | **Formal Policy Prover** | Uses SMT/SAT solvers (e.g., Z3) to formally prove policy consistency, detect contradictions, and flag unreachable rules. | *Specification / In Progress* |

---

## Key Invariants & Security Guarantees

1. **True Physical Redaction (Never Visual Overlays):**
   - PDFs undergo content stream and xref purges via PyMuPDF. Live selectable text and vector objects are irrevocably removed, not masked with superficial black rectangles.
   - DOCX files undergo XML run replacements, table scrubbing, and core document property sanitization.
2. **Immutable Content-Addressed Originals:**
   - Raw source documents are stored strictly by their SHA-256 digest (`data/originals/<hash>.<ext>`) in append-only storage and are never modified in place.
3. **Automated Post-Transformation Leak Verification:**
   - Every generated view is independently re-parsed and scanned for candidate sensitive strings before delivery. If any candidate string remains detectable, the operation **fails closed**.
4. **Zero Raw PII in Logs and Audit Manifests:**
   - Findings, entity values, and subject IDs in audit manifests are recorded strictly as one-way SHA-256 cryptographic digests. Raw PII is never logged or exposed via public APIs.
5. **Fail-Closed Safety Defaults:**
   - Scanned or unparseable documents lacking selectable text fail closed. Ambiguous policy evaluations require explicit human compliance review.

---

## RedactCore Document Processing Pipeline

```text
Upload (PDF/DOCX)
   │
   ├──► 1. Store Original (Immutable SHA-256 hash address)
   │
   ├──► 2. Normalized Parse (Text blocks, coordinate bounding boxes, tables, figures)
   │
   ├──► 3. Entity Detection (Deterministic Regex + Presidio NLP + Consent-gated LLM)
   │
   ├──► 4. Policy Evaluation (Subject role/clearance vs. YAML rules)
   │
   ├──► 5. Redaction Planning (Rule ordering: Redact > Replace > Mask > Allow)
   │
   ├──► 6. Transform Copy (Byte-level stream purge / DOCX run reconstruction)
   │
   ├──► 7. Leak Verification (Re-parse artifact & assert absence of sensitive strings)
   │
   └──► 8. Emit Output & Manifest (Derived view artifact + Zero-raw-PII audit trail)
```

---

## Repository Structure

```text
Argus/
├── ArgusBC/             # Argus Business Center: Next.js control plane UI & dashboard
│   ├── app/             # Next.js App Router (pages: dashboard, policies, documents, signin)
│   ├── components/      # UI components & design system
│   └── lib/             # Firebase Auth integration, mock providers, and API clients
├── RedactCore/          # Authoritative document redaction & verification service
│   ├── src/             # Core Python engine (parsers, entity detectors, transforms)
│   ├── policies/        # Shipped YAML policy definitions
│   ├── tests/           # Deterministic test suite & leak verification assertions
│   └── fixtures/        # Sample PDFs, DOCX, and benchmark documents
├── Cerberus/            # Specification for runtime AI/MCP gateway & PEP
├── Medusa/              # Specification for policy change simulation & quarantine
├── Aristotle/           # Specification for formal policy consistency proving
├── DemoData/            # Realistic enterprise documents for demonstrations
└── ARCHITECTURE.md      # Detailed system architecture and module boundaries
```

---

## Shipped Policies & Personas

Argus includes out-of-the-box policies demonstrated in `RedactCore/policies/`:

| Policy | Target Persona | Rule Highlights | Figure Handling |
| :--- | :--- | :--- | :--- |
| **`sales-quarterly`** | Sales Representative | Redacts employee salaries, IDs, phone numbers, passwords, and API keys; masks emails and physical addresses. | Requires manual figure review |
| **`finance-full-access`** | Finance Auditor | Allows salary, employee IDs, and names; redacts personal phone numbers; masks addresses. | Direct allow (no review required) |
| **`reviewer`** | Compliance Officer | Flags salaries, phone numbers, and names for human review; masks employee IDs. | Requires manual figure review |

---

## Getting Started

### 1. Running the RedactCore Backend

Requirements: Python 3.11+, [`uv`](https://github.com/astral-sh/uv) (recommended) or `pip`.

```bash
cd RedactCore

# Install dependencies
uv sync

# Run the test suite (verifies parsers, transforms, and leak detection)
uv run pytest

# Start the FastAPI service (default: http://localhost:8000)
uv run uvicorn redact_core.api:app --reload --port 8000
```

### 2. Running the ArgusBC Control Plane UI

Requirements: Node.js 18.17+, npm 9+.

```bash
cd ArgusBC

# Install dependencies
npm install

# Run the smoke tests & typecheck
npm test
npm run typecheck

# Start Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the active port reported by Next.js) to inspect documents, compare subject policies, and generate verified views.

---

## Roadmap

- [x] **RedactCore Pipeline**: Deterministic document parsing, PDF stream purging, DOCX transformation, and post-transform leak verification.
- [x] **ArgusBC Control Plane**: High-density dashboard, multi-persona view simulator, policy matrix explorer, and Firebase Auth scaffolding.
- [ ] **Cerberus MCP Gateway**: Model Context Protocol (MCP) server adapter intercepting LLM tool calls and streaming redacted payloads downstream.
- [ ] **Medusa Blast-Radius Simulation**: Automated access-graph impact analysis for candidate policy updates.
- [ ] **Aristotle Policy Prover**: Z3-backed SMT validation to eliminate unreachable and contradictory rules.

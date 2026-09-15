# RedactCore from Hermes Agent
⚕ *Hermes Agent*
────────────
Current RedactCore is structured as a _document transformation pipeline_, with clear extension points for an AI agent.

*High-level architecture*

```text
Web UI / CLI / API
        ↓
RedactPipeline
        ↓
┌───────────────────────┐
│ 1. Ingest + storage   │
│ 2. Parse document     │
│ 3. Detect entities    │
│ 4. Evaluate policy    │
│ 5. Plan operations    │
│ 6. Transform copy     │
│ 7. Verify no leaks    │
│ 8. Write manifest     │
└───────────────────────┘
        ↓
Derived privacy-preserved view
```

The main orchestration is:

```text
src/redact_core/pipeline.py
```

Its `generate_derived_view()` method controls:

1. Load immutable original
2. Verify source hash
3. Parse PDF/DOCX
4. Detect sensitive entities
5. Load policy
6. Generate redaction plan
7. Transform a copy
8. Verify output
9. Verify original was unchanged
10. Store output + manifest

That is the central security boundary.

---

*Current modules*

*`models.py`*

Defines the shared contracts between modules.

Important models:

```text
SubjectContext
ResourceContext
NormalizedDocument
TextBlock
TextSpan
TableBlock
FigureBlock
EntityFinding
RedactionPolicy
PolicyRule
RedactionOperation
RedactionPlan
VerificationResult
ViewManifest
```

This is the most important integration surface for future modules.

For example, an AI agent should consume:

```python
NormalizedDocument
SubjectContext
ResourceContext
```

and return structured results rather than directly editing files.

---

*`storage.py`*

Responsible for immutable content-addressed storage:

```text
data/originals/<sha256>.pdf
data/originals/<sha256>.docx
data/views/<view_id>.pdf
data/views/<view_id>.docx
data/manifests/<view_id>.json
```

Important principle:

```text
Original ≠ View
```

An AI agent must never write directly into `data/originals/`.

It may request a derived view through the pipeline, but it should not have direct filesystem authority over originals.

---

*`pdf_parser.py`*

Parses PDFs into `NormalizedDocument`:

- Text blocks
- Word coordinates
- Page references
- Figures/images
- Metadata
- Scanned-document warnings

Current primary guarantee is for _text-native PDFs_. Scanned PDFs are detected and fail closed without OCR.

---

*`docx_parser.py`*

Parses DOCX files:

- Paragraphs
- Runs
- Tables
- Headers/footers
- Inline images
- Metadata

DOCX support currently produces a normalized representation, but layout-preserving transformation is less strong than the PDF path.

---

*`entities.py`*

Detects candidate sensitive entities.

Current design:

```text
Deterministic regex recognizers
        +
Optional Presidio recognizer
```

Current deterministic types include:

- `EMAIL_ADDRESS`
- `PHONE_NUMBER`
- `EMPLOYEE_ID`
- `SALARY`
- `PROJECT_CODE`
- `PERSON`
- `ADDRESS`

Presidio is optional. If no local spaCy model is available, RedactCore continues using the offline regex baseline.

This is an ideal place for an AI-assisted detector, but the AI detector should return candidates only:

```python
list[EntityFinding]
```

It must not decide whether an entity is allowed to be visible.

---

*`policy.py`*

Loads YAML policies and evaluates access rules.

Current policy files:

```text
policies/sales-quarterly.yaml
policies/finance-full-access.yaml
policies/reviewer.yaml
```

Current policy engine determines the action for an entity:

```text
allow
redact
mask
replace
review
```

It uses:

```text
SubjectContext
ResourceContext
EntityFinding
RedactionPolicy
```

This is where Argus ABAC logic belongs.

---

*`planner.py`*

Converts detection findings plus policy decisions into a `RedactionPlan`.

```text
EntityFinding
    +
PolicyRule
    +
SubjectContext
    +
ResourceContext
        ↓
RedactionOperation[]
```

It also enforces fail-closed behavior for:

- Scanned documents
- Unverified figures
- `review` outcomes
- Unsupported content

The planner is an excellent boundary for an AI agent because it can provide the agent with a controlled task:
(1/4)

⚕ *Hermes Agent*
────────────
```text
Here is the parsed document.
Here are the authorized policy constraints.
Suggest candidate operations.
```

Then a deterministic policy validator can approve or reject those suggestions.

---

*`pdf_transform.py`*

Applies actual PDF redactions to a copy.

The important distinction is:

```text
Not this:
draw black rectangle over text

But this:
apply PDF redaction annotation and purge underlying content
```

The AI agent should never directly manipulate PDF bytes. It should only produce structured `RedactionOperation` objects that this trusted transformer applies.

---

*`docx_transform.py`*

Creates a new DOCX with text replacements/removals.

It does not mutate the source file.

The output is later checked by:

```text
verifier.py
```

---

*`verifier.py`*

Reopens the generated document and checks:

- Sensitive values are absent
- Output can be opened
- Page count is preserved for PDF
- Original integrity is preserved
- Output hash is recorded

This is the final security gate:

```text
If verifier fails:
    do not publish or serve the view
```

Any AI agent-generated result must pass through this module.

---

*`manifests.py`*

Creates the audit manifest:

```text
source hash
output hash
policy ID/version
subject digest
decision ID
operation counts
warnings
verification result
```

It deliberately avoids storing raw PII.

This is important for explaining:

```text
Why did this user receive this particular view?
```

---

*`api.py`*

Current endpoints include:

```text
GET  /health
GET  /api/policies
GET  /api/subjects
POST /api/upload
POST /api/views
GET  /api/views/{view_id}/manifest
GET  /api/views/{view_id}/download
GET  /api/views/{view_id}/preview
```

The normal download endpoint exposes only the derived view, not the original.

---

*`web/`*

The local demo UI:

```text
web/index.html
web/app.js
web/styles.css
```

It demonstrates:

- Upload
- Document inspection
- Entity findings
- Subject/policy selection
- Derived view creation
- Preview
- Download
- Verification status

---

*Best locations for an AI agent*

There are four good integration patterns.

*Option 1: AI-assisted entity detection*

Add:

```text
src/redact_core/ai/
__init__.py
detector.py
schemas.py
prompts.py
```

Interface:

```python
class CandidateDetector(Protocol):
    def detect(
        self,
        document: NormalizedDocument,
        context: SubjectContext | None = None,
    ) -> list[EntityFinding]:
        ...
```

The AI detector could identify:

- Contextual names
- Project-sensitive concepts
- Confidential business terms
- Sensitive clauses
- Legal sections
- Internal product code names
- Implicit PII not captured by regex

However, its result must be treated as _untrusted suggestions_.

Recommended flow:

```text
Regex / Presidio findings
        +
AI candidate findings
        ↓
Finding validator
        ↓
Policy planner
```

The AI should not receive or return authorization decisions.

---

*Option 2: AI-assisted policy authoring*

This is probably the safest and most valuable first AI feature.

User says:

```text
Hide employee personal information from Sales,
but allow Finance to see compensation.
```

The AI generates a draft policy:

```yaml
policy_id: sales-quarterly
rules:
- entity_type: PERSON
    action: redact
    conditions:
    roles:
        - finance
```

Then the system:

1. Validates the generated schema.
2. Shows a human-readable diff.
3. Requires user approval.
4. Saves a versioned policy.
5. Runs policy tests against fixtures.

Architecture:

```text
User natural language
        ↓
AI Policy Drafting Agent
        ↓
Pydantic/YAML validation
        ↓
Policy simulator
        ↓
Human approval
        ↓
policies/*.yaml
```

This avoids giving the AI direct authority over document output.

---

*Option 3: AI-assisted review*

The existing planner can mark operations as:

```text
review
```

An agent can help a reviewer understand the finding:
(2/4)


⚕ *Hermes Agent*
────────────
```text
Finding:
- Entity: PROJECT_CODE
- Page: 2
- Confidence: 0.61
- Context: “Project PRJ-ALPHA is delayed”
- Proposed action: redact
```

The AI could explain:

```text
This appears to be an internal project code because it matches the PRJ-* convention
and appears near schedule risk language. Recommend redaction for Sales viewers.
```

But the final decision remains with:

```text
Policy + deterministic reviewer action
```

The agent should not directly approve or release a document.

---

*Option 4: AI-generated derived summaries*

This is the most advanced and riskiest path.

Your original example:

```text
Give PM enough information to request a schedule speedup
without showing details of other projects.
```

This is not ordinary redaction. It is a privacy-preserving projection:

```text
Raw schedule
    ↓
Allowed facts
    ↓
AI summary
    ↓
Leakage checker
    ↓
Derived view
```

A future module could be:

```text
src/redact_core/projection/
summarizer.py
allowed_facts.py
leakage_check.py
```

The AI should only receive an already-filtered representation, not the unrestricted original.

Bad architecture:

```text
Original document → LLM → supposedly safe summary
```

Better architecture:

```text
Original document
    ↓
Policy filter
    ↓
Authorized fact set
    ↓
LLM summary
    ↓
Leakage and policy verification
    ↓
Output
```

This prevents the model from seeing data it was never authorized to use.

---

*Recommended AI agent architecture*

I would add a separate agent layer:

```text
src/redact_core/agents/
__init__.py
base.py
policy_author.py
finding_reviewer.py
document_analyst.py
projection_agent.py
tools.py
schemas.py
guardrails.py
```

*`base.py`*

Define the agent contract:

```python
class RedactAgent(Protocol):
    name: str
    version: str

    def run(self, request: AgentRequest) -> AgentResponse:
        ...
```

*`schemas.py`*

All agent input/output must be typed:

```python
class AgentRequest(BaseModel):
    task: str
    document_id: str | None
    policy_id: str | None
    subject: SubjectContext | None
    allowed_tools: set[str]

class AgentResponse(BaseModel):
    status: Literal["proposed", "blocked", "needs_review"]
    findings: list[EntityFinding] = []
    operations: list[RedactionOperation] = []
    policy_draft: dict | None = None
    rationale: str
    warnings: list[str] = []
```

*`tools.py`*

Give agents narrowly scoped tools:

```text
inspect_document_structure
list_candidate_findings
simulate_policy
compare_policy_versions
request_derived_preview
search_allowed_text
```

Avoid exposing:

```text
read_original_bytes
write_original
serve_original
arbitrary filesystem access
execute shell
```

*`guardrails.py`*

Validate every agent response:

```text
- Schema validation
- Entity coordinates in document bounds
- Operations reference existing findings
- Action is in allowed enum
- No arbitrary output paths
- No raw PII in logs
- No policy escalation
- No original-file mutation
```

---

*Where the agent should sit in the pipeline*

Recommended:

```text
Ingest
↓
Parse
↓
Deterministic detection
↓
AI candidate analysis (optional)
↓
Finding normalization
↓
Policy evaluation
↓
AI recommendation/review (optional)
↓
Deterministic redaction planner
↓
Trusted transformer
↓
Verifier
↓
Manifest
```

The critical rule:

```text
AI may propose.
Policy decides.
Trusted transformer applies.
Verifier releases.
```

The AI should not sit after policy and directly write files.

---

*Suggested module boundaries*

```text
redact_core/
pipeline.py
    orchestrates everything

models.py
    shared contracts

entities.py
    deterministic and optional ML candidate detection

agents/
    optional intelligent suggestions

policy.py
    authorization and policy evaluation

planner.py
    deterministic findings-to-operation conversion

pdf_transform.py
docx_transform.py
    trusted artifact transformation

verifier.py
    security release gate
```

Potential future interface change:
(3/4)

⚕ *Hermes Agent*
────────────
```python
def generate_derived_view(
    source_sha256: str,
    ext: str,
    policy_id: str,
    subject: SubjectContext,
    resource: ResourceContext | None = None,
    agent_mode: str = "disabled",
) -> tuple[ViewManifest, Path]:
    ...
```

But I would avoid coupling the pipeline directly to one agent implementation. Prefer dependency injection:

```python
pipeline = RedactionPipeline(
    detector=hybrid_detector,
    reviewer=optional_agent_reviewer,
    policy_engine=policy_engine,
)
```

---

*Recommended implementation order*

*Phase 1: AI policy author*

Lowest risk and highest product value:

```text
Natural language requirement
→ draft YAML policy
→ validation
→ simulation
→ human approval
```

This demonstrates agent value without allowing uncontrolled document access.

*Phase 2: AI finding reviewer*

Use AI to prioritize uncertain findings:

```text
high confidence → auto-policy
medium confidence → AI explanation/recommendation
low confidence → human review
```

*Phase 3: AI contextual detector*

Add detection for context-dependent sensitive concepts:

- Trade secrets
- Project names
- Strategic plans
- Customer names
- Internal architecture
- Contract clauses

*Phase 4: Privacy-preserving projection agent*

Build the schedule-summary use case with:

```text
policy-filtered facts
→ constrained generation
→ leakage verification
```

*Most important recommendation*

Do not make RedactCore an “LLM reads everything and redacts it” system.

Make it:

```text
Policy-governed document security system
with optional AI proposal and review modules.
```

The core trust boundary should remain deterministic:

```text
Policy decides authorization.
Transformer creates the view.
Verifier decides whether the view may be released.
```

That architecture gives you a credible path toward:

- Enterprise document access control
- AI-assisted policy authoring
- Privacy-preserving document views
- Human-in-the-loop review
- Derived summaries
- Integration with SailPoint/Entra/OIDC later
- Strong auditability and explainability (4/4)

⚕ *Hermes Agent*
────────────
Yes, but with an important distinction:

_spaCy/Presidio is currently the entity-detection layer_, not the final redaction decision layer.

Current flow:

```text
Document text
    ↓
Regex recognizers
    ↓
Optional Presidio + spaCy NER
    ↓
EntityFinding candidates
    ↓
Policy engine
    ↓
RedactionPlan
    ↓
PDF/DOCX transformer
    ↓
Leak verifier
```

*Where another AI model can plug in*

The ideal location is alongside the current detector:

```text
src/redact_core/entities.py
```

or, better, a future module such as:

```text
src/redact_core/detectors/
base.py
regex_detector.py
presidio_detector.py
llm_detector.py
layout_detector.py
ensemble.py
```

Each detector should produce the same structured output:

```python
EntityFinding(
    entity_type="PROJECT_CODE",
    value_digest="...",
    page_or_section="page_1",
    source_ref="block_12",
    bbox=[x0, y0, x1, y1],
    confidence=0.91,
    source="ai_model",
    requires_review=False,
)
```

The AI model can improve detection of context-sensitive material such as:

- Person names
- Internal project names
- Trade secrets
- Customer names
- Confidential business terms
- Sensitive contract clauses
- Context-dependent salary/compensation data
- Internal architecture details

*What the model should _not_ decide alone*

The model should not directly decide:

```text
“This user is allowed to see this.”
```

That belongs to:

```text
policy.py
planner.py
```

The model should answer:

```text
“This span appears to be a confidential project identifier with 0.91 confidence.”
```

Then the policy engine determines whether that entity should be:

- Allowed
- Redacted
- Masked
- Replaced
- Sent for review

For example:

```text
AI detection:
“Project Argus Apollo” → CONFIDENTIAL_PROJECT, confidence 0.91

Policy:
Sales role cannot see CONFIDENTIAL_PROJECT

Planner:
action = redact
```

*spaCy is not really a general AI model plug-in*

spaCy is a framework/runtime for NLP pipelines. You can use:

- spaCy NER models
- Custom spaCy entity recognizers
- Transformer-backed spaCy pipelines
- Presidio recognizers
- External model adapters

But for modern document understanding, other model types may be more accurate depending on the task.

*Lightweight local options*

For your Mac mini/laptop:

- spaCy NER for ordinary names, locations, organizations
- Presidio custom recognizers for PII patterns
- `GLiNER` for zero-shot entity detection
- Small Hugging Face token-classification models
- Small local instruction model for contextual classification
- PaddleOCR/docTR for scanned documents and coordinates

*More capable options*

For context-heavy documents:

- Layout-aware models such as LayoutLM-style models
- Local vision-language models for figures/tables
- A hosted LLM, if the document is allowed to leave the environment
- A local model through Ollama or llama.cpp

*The coordinate problem*

A text model can identify:

```text
“Project Apollo”
```

But RedactCore also needs to know _where it appears on the page_.

For text-native PDF:

```text
PDF word coordinates
        +
model character offsets
        ↓
redaction bounding box
```

For scanned documents:

```text
OCR text + OCR bounding boxes
        +
entity detection
        ↓
image region to redact
```

So the best architecture is:

```text
Parser/OCR
→ text + coordinates
Detector/model
→ entity type + character span + confidence
Span mapper
→ page bounding box
Policy engine
→ allowed/redact/mask/review
Transformer
→ derived document
Verifier
→ safe or blocked
```

*Recommended detector interface*

```python
class EntityDetector(Protocol):
    name: str
    version: str

    def detect(
        self,
        document: NormalizedDocument,
    ) -> list[EntityFinding]:
        ...
```

Then use an ensemble:

```python
detectors = [
    RegexDetector(),
    PresidioDetector(),
    OptionalAIContextDetector(),
]
```

Merge results by:

```text
document location
+ entity type
+ overlapping span
```

Possible confidence logic:
(1/2)

⚕ *Hermes Agent*
────────────
```text
Regex EMAIL:             0.99
Presidio PERSON:         0.82
Local AI PROJECT_CODE:   0.91
Human reviewer:          1.00
```

For security-sensitive cases, do not simply average confidence. Use a conservative rule:

```text
If any detector identifies high-risk content:
    redact or review according to policy
```

A false positive is usually preferable to a false negative for sensitive documents, although excessive redaction reduces usability.

*Best next model for Argus*

I would not replace the current regex baseline immediately. Use a layered detector:

```text
1. Regex/custom recognizers
High precision for emails, phones, IDs, money

2. Presidio/spaCy
Names, locations, organizations, generic PII

3. Context model
Project names, trade secrets, confidential clauses

4. Human review
Low-confidence or high-impact findings
```

Then let policy decide:

```text
detection ≠ authorization
```

So your understanding is essentially correct: another AI model can plug into the current spaCy/Presidio detection stage to improve _where and what_ should be considered sensitive. But the final decision about _whether to redact_ should remain in the deterministic policy and redaction pipeline. (2/2)
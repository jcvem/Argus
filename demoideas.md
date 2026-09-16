# Argus Demo Ideas

Argus is strongest wherever the recipient needs *enough information to act*, but not the complete underlying record.

Core pattern:

```text
Original information
  ↓
Identity + purpose + policy
  ↓
Redaction / masking / aggregation / projection
  ↓
Recipient-specific view
```

## 1. HR business-partner assistant

**Question:** Which teams are overloaded and where should we add capacity?

**Allowed view:**
- Team-level headcount
- Utilization
- Hiring gaps
- Attrition trends
- Aggregate compensation bands

**Redacted:**
- Individual salaries
- Medical information
- Performance reviews
- Personal contact details
- Names of employees on leave

Transformation: employee records → department-level aggregate.

## 2. Finance reporting for non-finance teams

**Question:** How is the regional business performing?

**Allowed view:**
- Revenue by region
- Growth rate
- Budget variance
- Forecast confidence
- Aggregated margin

**Redacted:**
- Individual customer revenue
- Employee compensation
- Bank details
- Contract pricing
- Sensitive acquisition costs

Recipients may include Sales, Product, Executives, and AI reporting agents.

## 3. Customer-support AI

**Question:** Summarize this customer’s issue and recommend the next action.

**Allowed view:**
- Ticket history
- Product/version
- Technical symptoms
- Customer tier
- Previous resolution steps

**Redacted:**
- Credit-card information
- Personal phone numbers
- Private internal notes
- Other customers’ records
- Contract pricing
- Sensitive identity documents

Flow: CRM/ticket system → Argus policy view → support AI.

## 4. Sales intelligence assistant

**Question:** Prepare a briefing before my customer meeting.

**Allowed view:**
- Public company information
- Approved CRM history
- Open opportunities
- Relevant product usage
- Allowed customer contacts

**Redacted:**
- Internal deal margin
- Competitor strategy
- Legal disputes
- Other account owners’ private notes
- Unapproved pricing concessions
- Sensitive executive commentary

Purpose-sensitive views:
- Meeting preparation → account summary
- Pricing negotiation → approved pricing range
- General browsing → narrower view

## 5. Legal document collaboration

**Question:** Summarize the obligations in this contract.

**Allowed view:**
- Deliverables
- Deadlines
- General obligations
- Renewal terms
- Non-sensitive clauses

**Redacted:**
- Personal addresses
- Bank account details
- Attorney work product
- Negotiation history
- Privileged comments
- Other parties’ confidential schedules

Recipient views:
- Project manager → operational obligations
- Finance → payment terms
- Procurement → vendor risk
- External supplier → only their obligations

## 6. Security-operations assistant

**Question:** What happened during this incident, and what should we do next?

**Allowed view:**
- Event timeline
- Affected service
- Severity
- Indicators of compromise
- Remediation status

**Redacted:**
- Victim identities
- Personal employee data
- Secrets and tokens
- Unrelated customers
- Internal infrastructure details
- Unapproved forensic evidence

Possible views: SOC analyst, executive, legal team, customer-support team, external customer, AI incident assistant.

## 7. Healthcare operations

**Question:** Which clinics have appointment capacity problems?

**Allowed view:**
- Clinic-level capacity
- Wait times
- Staffing ratios
- Aggregate patient volume
- Resource utilization

**Redacted:**
- Patient names
- Diagnoses
- Medical record numbers
- Individual appointments
- Insurance information

High-value but high-liability; not recommended as the first market.

## 8. Vendor and procurement assistant

**Question:** Which vendors are at risk of missing delivery commitments?

**Allowed view:**
- Vendor performance score
- Delivery status
- Contract milestones
- Aggregate spend category
- Risk classification

**Redacted:**
- Bank details
- Negotiated unit prices
- Internal legal comments
- Competitor bids
- Individual procurement staff notes

Possible views: Procurement, Finance, Operations, vendor-facing portal.

## 9. Product analytics assistant

**Question:** What are the biggest sources of customer churn?

**Allowed view:**
- Aggregated usage patterns
- Cohort retention
- Feature adoption
- Industry/region breakdown
- Churn reasons

**Redacted:**
- Individual customer identities
- Raw event-level behavior
- Personal identifiers
- Unreleased product plans
- Customer-specific commercial terms

Main transformation: row-level events → cohort aggregate.

## 10. Board and executive reporting

**Question:** Give me the business risk summary for this quarter.

**Allowed view:**
- Aggregated KPIs
- Material risks
- High-level trends
- Approved forecast
- Major incidents

**Redacted:**
- Individual personnel matters
- Unresolved legal privilege
- Customer-level data
- Security secrets
- Draft/non-approved numbers

Possible views: draft board report, executive view, internal analyst view, external investor view.

## 11. Engineering knowledge assistant

**Question:** How does this service work and where should I make this change?

**Allowed view:**
- Architecture documentation
- Public/internal API contracts
- Approved code
- Runbooks
- Non-secret configuration

**Redacted:**
- API keys
- Credentials
- Private customer identifiers
- Production secrets
- Unapproved security findings
- Other teams’ restricted projects

Natural MCP use case:

```text
Claude/Cursor/AI agent
  → Argus MCP
  → authorized repository/docs/tool view
```

## 12. Project portfolio and scheduling

**Question:** Can Project X be accelerated by three days?

**Allowed view:**
- Aggregate team availability
- Milestone dependencies
- Capacity pressure
- Schedule risk
- Estimated acceleration cost

**Redacted:**
- Other project names
- Individual employee schedules
- Customer identities
- Private performance information
- Sensitive project details

This is a differentiated example because it requires policy-aware aggregation rather than simply replacing names with `[REDACTED]`.

## 13. M&A / due-diligence data room

**Question:** Summarize the target company’s technology and financial risks.

**Allowed view:**
- Approved documents
- Aggregated financial figures
- Technology inventory
- Contract obligations
- Risk summaries

**Redacted:**
- Personally identifiable employee data
- Customer identities
- Bank details
- Privileged legal advice
- Unannounced transaction details
- Sensitive third-party contracts

Possible views: internal deal team, external advisor, legal counsel, potential buyer, board.

## 14. Insurance claims assistant

**Question:** Summarize this claim and identify missing evidence.

**Allowed view:**
- Claim status
- Incident description
- Required documents
- Risk indicators
- Aggregate policy information

**Redacted:**
- Unnecessary medical details
- National IDs
- Bank details
- Internal fraud notes
- Other policyholders’ records

Good fit for document redaction plus structured field masking.

## 15. Education / university assistant

**Question:** Which courses need more teaching support?

**Allowed view:**
- Course-level enrollment
- Aggregate performance
- Capacity
- Attendance trends
- Resource needs

**Redacted:**
- Student names
- Disability/health information
- Individual grades
- Disciplinary records
- Personal contact details

## 16. Government/public-sector information sharing

**Question:** Share the case status with the relevant agency.

**Allowed view:**
- Case status
- Authorized facts
- Required dates
- Relevant jurisdiction
- Next action

**Redacted:**
- Protected witness identity
- Unrelated household members
- Confidential source information
- Internal investigative notes

Access may depend on agency, case assignment, clearance, purpose, jurisdiction, and time window.

## Best three initial use cases

### 1. Internal AI assistant for finance/HR reports

- Easy to explain
- Clear raw-versus-safe difference
- Strong business value
- Works with PDF/DOCX and RAG
- Easy to demo with synthetic data

### 2. Customer-support AI

- Frequent AI adoption use case
- Strong PII/privacy need
- Clear human and agent identity model
- Structured data plus documents
- Measurable reduction in overexposure

### 3. Engineering AI/MCP gateway

- Natural fit for Cerberus
- Developers understand MCP
- Easy to demonstrate tool-level policy
- Sensitive secrets and project boundaries are obvious
- Argus can control both human and agent access

## Transformation taxonomy

Argus should expose four explicit transformations:

```text
1. Filter
   Remove records, fields, or sections.

2. Redact
   Remove sensitive text or document regions.

3. Mask
   Preserve structure while hiding values.

4. Project
   Create an aggregate or purpose-specific view.
```

Example:

```text
Finance report:
filter customer rows
mask account IDs
redact employee names
project regional totals
```

## Product message

> Argus lets organizations share useful information without sharing the entire underlying record.

For AI specifically:

> Give AI agents the context they need—not the raw data they do not.

## Product principles

- Do not promise that no sensitive information can ever leak.
- Say that Argus applies policy-controlled transformations and verifies that protected fields are absent from generated views.
- Use the same policy model for human users and AI agents.
- Keep authorization separate from entity detection.
- Treat aggregation and projection as first-class privacy transformations.
- For AI-generated summaries, run a separate output leakage check; guarantees are weaker than deterministic redaction.

## Recommended first demo

```text
A Sales employee asks an internal AI assistant
about the quarterly report.

The assistant answers with revenue and forecast information,
while Argus automatically removes employee PII,
salary data, and confidential project details.

A Finance user asking the same question receives a richer view.

An AI agent receives the most restricted view unless explicitly authorized.
```

## Core Argus architecture

```text
Policy-aware data view layer
  ├── Identity/context adapter
  ├── ABAC policy engine
  ├── RedactCore document view engine
  ├── Structured-data projection engine
  ├── AI/MCP adapter
  ├── Leakage verifier
  └── Audit/replay log
```

## Source categories to research later

- Claude/MCP custom connectors
- Microsoft Purview AI data security
- SailPoint agent identity security
- Varonis data access governance
- BigID/Cyera DSPM
- Google Cloud RAG and Agent Gateway

## Decision

Argus should be positioned as a *policy-aware information-view layer*, not merely an AI redaction product.

The strongest framing is:

> Authorization determines not only whether a user or agent may access information, but which representation of that information they are allowed to receive.

---

## End-to-end flow

```text
Original information
  ↓
Identity + purpose + policy
  ↓
Redaction / masking / aggregation / projection
  ↓
Recipient-specific view
```

This file is a demo-idea backlog for future Argus demos and product discovery.

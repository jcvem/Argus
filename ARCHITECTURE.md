# Argus Module Architecture

```text
Aristotle  → formal policy consistency and counterexamples
Medusa     → change-impact simulation, quarantine, and access review
Cerberus   → runtime AI/MCP gateway enforcement
RedactCore → privacy-preserved document and data views
```

## Recommended control flow

```text
Policy/agent change
    ↓
Medusa simulation and quarantine
    ↓
Aristotle consistency check
    ↓
Human approval
    ↓
Cerberus activation/enforcement
    ↓
RedactCore or structured projection
    ↓
Human / AI agent receives scoped view
```

## Naming feedback

The names are memorable and communicate distinct control-plane responsibilities. Keep the boundaries strict:

- Aristotle proves policy properties; it should not become a runtime PDP.
- Medusa evaluates blast radius and holds changes for review; it should not become a general threat simulator.
- Cerberus is the gateway/PEP; it should not own policy authoring or document redaction logic.
- RedactCore is the trusted transformation/verifier; it should not decide identity authorization.

All inter-module communication should use versioned typed contracts and immutable IDs/hashes rather than importing private implementation details.

## Suggested repository layout

```text
Argus/
  Aristotle/
  Medusa/
  Cerberus/
  RedactCore/
  contracts/
  docs/
```

A shared `contracts/` module may eventually hold:

- PolicySnapshot
- AccessRequest
- Decision
- SimulationReport
- QuarantineState
- RedactionPlan
- AuditEvent

Do not introduce shared code until at least two modules need the same stable contract; avoid a premature monorepo framework.

## First build sequence

1. Stabilize RedactCore document view contracts.
2. Define a Cerberus `AccessRequest`/`Decision` contract.
3. Build a small Medusa deterministic simulator against fixture access graphs.
4. Build Aristotle checks for policy contradictions and unreachable rules.
5. Connect Cerberus to RedactCore derived views.
6. Add identity-provider and MCP adapters.

The first end-to-end demo should show a new agent being quarantined, reviewed, then allowed to receive only a RedactCore-derived view.

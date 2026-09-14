# Medusa

Policy-change simulation, quarantine, and access-review engine for Argus.

## Responsibility

Medusa simulates the impact of a proposed policy, identity, agent, connector, or resource change before activation:

```text
candidate change
    ↓
access-impact simulation
    ↓
quarantine / block activation
    ↓
access-review case
    ↓
human approval or rollback
```

It should answer:

- Which users and agents gain or lose access?
- Which sensitive resources become reachable?
- Which existing document views change?
- Which policies or access paths are affected?
- Does the change exceed a configured risk threshold?

## Boundary

- Aristotle checks formal policy consistency and produces counterexamples.
- Medusa simulates change impact, quarantines risky changes, and manages review state.
- Cerberus enforces runtime gateway decisions.
- RedactCore creates privacy-preserved document views.

Medusa must not become a generic attack simulator. Its scope is authorization-change impact analysis.

## Planned state machine

```text
DRAFT → SIMULATING → QUARANTINED → UNDER_REVIEW → APPROVED → ACTIVE
                                      └──────────→ REJECTED
```

No new policy or agent becomes active merely because it was created.

## Planned inputs

- `policy.proposed`
- `policy.changed`
- `agent.registered`
- `agent.permission_changed`
- `resource.classification_changed`
- `connector.added`
- Immutable policy/resource/access-graph snapshots

## Planned outputs

- Before/after access-decision diff
- Affected principals and resources
- New access paths and high-risk paths
- Risk score and reasons
- Quarantine action
- Access-review case
- Approval, rejection, or rollback event

Every report should include snapshot hashes, policy versions, simulator version, and reproducible input metadata.

## Example

```text
Register report-bot
  ↓
Medusa discovers access to employee-report.pdf
  ↓
Risk exceeds threshold
  ↓
Cerberus blocks token issuance
  ↓
Review case created
  ↓
Reviewer approves only a RedactCore-derived view
  ↓
Cerberus permits scoped access
```

## Initial implementation boundary

The first implementation should expose a library API under `src/medusa/` and a CLI report before adding a worker or message broker. Keep event transport replaceable; do not require Kafka/NATS for the prototype.

Suggested contracts:

```python
class MedusaSimulator(Protocol):
    def simulate(self, change: CandidateChange, snapshot: PolicySnapshot) -> SimulationReport:
        ...

class QuarantineController(Protocol):
    def quarantine(self, report: SimulationReport) -> QuarantineAction:
        ...
```

## Safety requirements

- Fail closed when simulation inputs are incomplete.
- Never activate a new agent without simulation and required review.
- Treat missing policies as deny, not allow.
- Preserve before/after snapshots immutably.
- Do not log raw document content or secrets.
- Make approval, rejection, and rollback explicit auditable events.
- If Aristotle is unavailable, do not silently proceed.
- If Cerberus cannot apply quarantine, retain the change in a blocked state.

## Future integrations

- Aristotle formal consistency results
- Cerberus gateway quarantine hooks
- RedactCore derived-view generation
- Entra/SailPoint identity events
- OIDC agent registration
- Enterprise access-review systems

## Status

Documented module boundary only. Runtime implementation should follow a dedicated implementation plan.

## Core principle

**Medusa: simulate, quarantine, review, then activate.**

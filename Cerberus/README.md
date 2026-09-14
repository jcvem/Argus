# Cerberus

Runtime AI/MCP gateway infrastructure for Argus.

## Responsibility

Cerberus is the enforcement point between human/AI-agent requests and enterprise data or tools.

It should:

- Authenticate and identify humans, agents, service accounts, and delegated principals.
- Evaluate runtime access decisions using Aristotle-approved policies.
- Enforce Medusa quarantine states for new or changed agents/policies.
- Invoke RedactCore to return privacy-preserved document views.
- Filter structured data and tool responses by policy.
- Enforce purpose, scope, rate, time, and resource constraints.
- Produce audit events without logging raw sensitive content.
- Support MCP while keeping authorization downstream of the agent orchestrator.

## Boundary

Cerberus enforces decisions; it does not own the organization-wide policy proof model (Aristotle), change-impact simulation (Medusa), or document transformation implementation (RedactCore).

## Planned request flow

```text
Human / AI agent / MCP client
          ↓
Identity + delegation validation
          ↓
Request normalization
          ↓
Aristotle policy decision
          ↓
Medusa quarantine check
          ↓
RedactCore / structured-data projection
          ↓
Tool or data connector
          ↓
Filtered response + audit event
```

## Security invariants

- No raw document or tool response is returned before policy evaluation.
- No agent receives a broader scope than its delegated human or service identity.
- Quarantined agents cannot obtain active data/tool tokens.
- Missing policy, identity, or context fails closed.
- Every decision is attributable to a principal, policy version, resource, purpose, and request ID.
- AI-generated recommendations cannot bypass deterministic authorization.

## Planned adapters

- OIDC / OAuth2 / JWT validation
- Microsoft Entra and SailPoint identity context
- MCP server/client transport
- RedactCore document views
- Cloud storage and internal APIs
- OpenTelemetry/audit sinks

## Status

Placeholder module boundary. Implementation to follow.

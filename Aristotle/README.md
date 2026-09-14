# Aristotle

Formal policy analysis and consistency checking for Argus.

## Responsibility

Aristotle analyzes the organization-wide policy set before policies are activated. It should detect:

- Contradictory allow/deny rules
- Unreachable policies
- Overlapping rules with ambiguous precedence
- Separation-of-duties conflicts
- Privilege escalation paths
- Missing default-deny behavior
- Inconsistent identity/resource attribute assumptions
- Policies that cannot be satisfied by the available enforcement points

## Boundary

Aristotle validates and explains policy behavior; it does not serve documents, transform content, or act as the runtime gateway.

## Planned adapters

- Policy normalization from YAML/JSON
- SMT/SAT checking, initially Z3
- OPA/Rego or Cedar compatibility later
- Counterexample generation for conflicting policies
- CI/pre-activation policy checks

## Status

Placeholder module boundary. Implementation to follow.

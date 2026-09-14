"""Redaction planner.

Converts normalized document findings and evaluated policy into an ordered,
auditable plan of operations. Enforces fail-closed behavior for unverified content.
"""

import uuid
from redact_core.hashing import hash_sensitive_value, mask_string
from redact_core.models import (
    EntityFinding,
    NormalizedDocument,
    RedactionOperation,
    RedactionPlan,
    RedactionPolicy,
    ResourceContext,
    SubjectContext,
)
from redact_core.policy import default_policy_engine


def plan_redactions(
    doc: NormalizedDocument,
    findings: list[EntityFinding],
    policy: RedactionPolicy,
    subject: SubjectContext,
    resource: ResourceContext | None = None,
) -> RedactionPlan:
    """Creates a deterministic redaction plan from findings and policy rules."""
    decision_seed = f"{doc.source_sha256}:{policy.policy_id}:{policy.version}:{subject.subject_id}"
    decision_id = f"dec_{hash_sensitive_value(decision_seed)[:12]}"
    plan_id = f"plan_{uuid.uuid4().hex[:12]}"

    operations: list[RedactionOperation] = []
    warnings: list[str] = list(doc.warnings)
    blocked = False
    block_reason = None
    requires_review_count = 0

    # 1. Fail-closed check: Scanned or image-only documents without OCR
    if doc.is_scanned:
        blocked = True
        block_reason = (
            "Fail-closed: Document appears to be scanned or image-only without selectable text. "
            "OCR is not enabled; redaction cannot be guaranteed."
        )
        return RedactionPlan(
            plan_id=plan_id,
            policy_id=policy.policy_id,
            policy_version=policy.version,
            subject_id=subject.subject_id,
            decision_id=decision_id,
            operations=[],
            blocked=blocked,
            block_reason=block_reason,
            requires_review_count=len(doc.figures),
            warnings=warnings,
        )

    # 2. Figure review checks
    if doc.figures:
        requires_review_count += len(doc.figures)
        if policy.require_figure_review and "reviewer" not in subject.roles:
            warnings.append(
                f"Document contains {len(doc.figures)} unreviewed figure(s). "
                "Subject lacks compliance clearance; visual elements marked for review."
            )

    # 3. Evaluate each finding against the policy
    for f in findings:
        rule = default_policy_engine.evaluate_rule(
            policy=policy,
            entity_type=f.entity_type,
            subject=subject,
            resource=resource,
        )

        action = rule.action.lower()
        if action == "allow":
            continue

        if action == "review":
            requires_review_count += 1
            # If subject is not authorized to bypass review, we still track it
            operations.append(
                RedactionOperation(
                    operation_id=f"op_{len(operations)}_{f.finding_id}",
                    finding_id=f.finding_id,
                    entity_type=f.entity_type,
                    action="review",
                    page_or_section=f.page_or_section,
                    source_ref=f.source_ref,
                    bbox=f.bbox,
                    target_text=f.raw_value,
                    replacement_text=rule.replacement or f"[{f.entity_type} PENDING REVIEW]",
                    mask_char=rule.mask_char,
                )
            )
        elif action == "mask":
            masked_val = mask_string(f.raw_value, entity_type=f.entity_type, mask_char=rule.mask_char)
            operations.append(
                RedactionOperation(
                    operation_id=f"op_{len(operations)}_{f.finding_id}",
                    finding_id=f.finding_id,
                    entity_type=f.entity_type,
                    action="mask",
                    page_or_section=f.page_or_section,
                    source_ref=f.source_ref,
                    bbox=f.bbox,
                    target_text=f.raw_value,
                    replacement_text=masked_val,
                    mask_char=rule.mask_char,
                )
            )
        elif action in ("redact", "replace"):
            repl = rule.replacement or f"[{f.entity_type} REDACTED]"
            operations.append(
                RedactionOperation(
                    operation_id=f"op_{len(operations)}_{f.finding_id}",
                    finding_id=f.finding_id,
                    entity_type=f.entity_type,
                    action=action,
                    page_or_section=f.page_or_section,
                    source_ref=f.source_ref,
                    bbox=f.bbox,
                    target_text=f.raw_value,
                    replacement_text=repl,
                    mask_char=rule.mask_char,
                )
            )

    return RedactionPlan(
        plan_id=plan_id,
        policy_id=policy.policy_id,
        policy_version=policy.version,
        subject_id=subject.subject_id,
        decision_id=decision_id,
        operations=operations,
        blocked=blocked,
        block_reason=block_reason,
        requires_review_count=requires_review_count,
        warnings=warnings,
    )

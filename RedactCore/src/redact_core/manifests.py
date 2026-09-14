"""Audit manifest generator for derived document views."""

from datetime import datetime, timezone
import uuid
from redact_core.hashing import hash_sensitive_value
from redact_core.models import RedactionPlan, VerificationResult, ViewManifest


def create_view_manifest(
    view_id: str,
    source_sha256: str,
    output_sha256: str,
    input_format: str,
    output_format: str,
    plan: RedactionPlan,
    verification: VerificationResult,
) -> ViewManifest:
    """Creates a sealed audit manifest for a derived privacy-preserved view.
    
    Contains cryptographic hashes, policy identifiers, operation counts, and verification
    results. Contains ZERO raw sensitive values.
    """
    op_counts: dict[str, int] = {}
    for op in plan.operations:
        op_counts[op.action] = op_counts.get(op.action, 0) + 1

    return ViewManifest(
        schema_version="1.0.0",
        view_id=view_id,
        source_sha256=source_sha256,
        output_sha256=output_sha256,
        policy_id=plan.policy_id,
        policy_version=plan.policy_version,
        subject_id_digest=hash_sensitive_value(plan.subject_id),
        decision_id=plan.decision_id,
        created_at=datetime.now(timezone.utc).isoformat(),
        input_format=input_format.lower(),
        output_format=output_format.lower(),
        operation_counts=op_counts,
        warnings=plan.warnings,
        verification={
            "passed": verification.passed,
            "checked_findings_count": verification.checked_findings_count,
            "leak_count": len(verification.leaks_found),
            "page_count_verified": verification.page_count_verified,
            "integrity_verified": verification.integrity_verified,
            "details": verification.details,
        },
    )

"""End-to-end document redaction and derived view generation pipeline."""

from pathlib import Path
import uuid
from redact_core.docx_parser import parse_docx
from redact_core.docx_transform import transform_docx
from redact_core.entities import default_detector
from redact_core.hashing import compute_sha256_bytes
from redact_core.manifests import create_view_manifest
from redact_core.models import (
    EntityFinding,
    NormalizedDocument,
    RedactionPlan,
    ResourceContext,
    SubjectContext,
    VerificationResult,
    ViewManifest,
)
from redact_core.pdf_parser import parse_pdf
from redact_core.pdf_transform import transform_pdf
from redact_core.policy import default_policy_engine
from redact_core.planner import plan_redactions
from redact_core.storage import DocumentStore, default_store
from redact_core.verifier import verify_docx_output, verify_pdf_output


MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


class RedactionPipeline:
    """Orchestrates ingestion, parsing, detection, policy evaluation,
    transformation, verification, and manifest creation.
    """

    def __init__(self, store: DocumentStore | None = None):
        self.store = store or default_store
        self._findings_cache: dict[tuple[str, str], list[EntityFinding]] = {}

    def cache_findings(
        self,
        source_sha256: str,
        detector_mode: str,
        findings: list[EntityFinding],
    ) -> None:
        """Caches detected entities for a source document and detector mode to reuse during view generation."""
        key = (source_sha256.lower().strip(), detector_mode.lower().strip())
        self._findings_cache[key] = findings

    def get_cached_findings(
        self,
        source_sha256: str,
        detector_mode: str,
    ) -> list[EntityFinding] | None:
        """Retrieves cached findings if available."""
        key = (source_sha256.lower().strip(), detector_mode.lower().strip())
        return self._findings_cache.get(key)

    def ingest_document(self, data: bytes, filename: str) -> tuple[str, Path, NormalizedDocument]:
        """Validates, stores immutable original, and parses into normalized model."""
        if len(data) > MAX_FILE_SIZE_BYTES:
            raise ValueError(f"File exceeds maximum allowed size ({MAX_FILE_SIZE_BYTES} bytes)")

        ext = Path(filename).suffix.lstrip(".").lower()
        if ext not in ("pdf", "docx"):
            raise ValueError(f"Unsupported file format '.{ext}'. Only PDF and DOCX are supported.")

        # Store immutable original
        source_sha256, original_path = self.store.store_original(data, ext)

        # Parse normalized representation
        if ext == "pdf":
            norm_doc = parse_pdf(data, filename=filename)
        else:
            norm_doc = parse_docx(data, filename=filename)

        return source_sha256, original_path, norm_doc

    def parse_existing(self, source_sha256: str, ext: str) -> NormalizedDocument:
        """Parses an already stored original document without re-uploading."""
        path = self.store.get_original_path(source_sha256, ext)
        if not path or not path.exists():
            raise FileNotFoundError(f"Original document {source_sha256}.{ext} not found")

        data = path.read_bytes()
        if ext.lower() == "pdf":
            return parse_pdf(data, filename=path.name)
        elif ext.lower() == "docx":
            return parse_docx(data, filename=path.name)
        else:
            raise ValueError(f"Unsupported extension: {ext}")

    def generate_derived_view(
        self,
        source_sha256: str,
        ext: str,
        policy_id: str,
        subject: SubjectContext,
        resource: ResourceContext | None = None,
        detector_mode: str = "deterministic",
    ) -> tuple[ViewManifest, Path]:
        """Generates, verifies, and stores an auditable privacy-preserved document view."""
        path = self.store.get_original_path(source_sha256, ext)
        if not path or not path.exists():
            raise FileNotFoundError(f"Original document with hash {source_sha256} not found in store")

        original_bytes = path.read_bytes()
        initial_hash = compute_sha256_bytes(original_bytes)
        if initial_hash != source_sha256:
            raise ValueError("Original file integrity failure before processing")

        # 1. Parse document
        clean_ext = ext.lstrip(".").lower()
        if clean_ext == "pdf":
            norm_doc = parse_pdf(original_bytes, filename=path.name)
        else:
            norm_doc = parse_docx(original_bytes, filename=path.name)

        # 2. Detect candidate entities (reusing cached findings from upload if available, or detecting)
        resolved_mode = (detector_mode or "deterministic").lower().strip()
        cached = self.get_cached_findings(source_sha256, resolved_mode)
        if cached is not None:
            findings = cached
        else:
            findings = default_detector.detect_in_document(norm_doc, detector_mode=resolved_mode)
            self.cache_findings(source_sha256, resolved_mode, findings)

        # 3. Fetch policy
        policy = default_policy_engine.get_policy(policy_id)

        # 4. Plan redactions
        if resource is None:
            resource = ResourceContext(document_id=source_sha256[:16], classification="internal")

        plan = plan_redactions(
            doc=norm_doc,
            findings=findings,
            policy=policy,
            subject=subject,
            resource=resource,
        )

        # 5. Fail-closed check
        if plan.blocked:
            raise PermissionError(f"Generation blocked by policy/safety rule: {plan.block_reason}")

        # 6. Apply transformation to a copy
        if clean_ext == "pdf":
            transformed_bytes = transform_pdf(original_bytes, plan)
            verification = verify_pdf_output(
                original_bytes=original_bytes,
                transformed_bytes=transformed_bytes,
                plan=plan,
                expected_page_count=norm_doc.page_count,
            )
        else:
            transformed_bytes = transform_docx(original_bytes, plan)
            verification = verify_docx_output(
                original_bytes=original_bytes,
                transformed_bytes=transformed_bytes,
                plan=plan,
                expected_page_count=norm_doc.page_count,
            )

        # 7. Fail-closed verification
        if not verification.passed:
            raise RuntimeError(
                f"Post-transformation verification failed: {verification.leaks_found}. "
                "Derived view suppressed to prevent leak."
            )

        # 8. Verify original bytes were never mutated during transformation
        post_hash = compute_sha256_bytes(path.read_bytes())
        if post_hash != source_sha256:
            raise RuntimeError("CRITICAL: Original file was mutated during processing! Storage corrupted.")

        # 9. Store derived view and manifest
        view_id = f"view_{uuid.uuid4().hex[:12]}"
        output_hash, view_path = self.store.store_view(view_id, transformed_bytes, clean_ext)

        manifest = create_view_manifest(
            view_id=view_id,
            source_sha256=source_sha256,
            output_sha256=output_hash,
            input_format=clean_ext,
            output_format=clean_ext,
            plan=plan,
            verification=verification,
        )
        self.store.store_manifest(manifest)

        return manifest, view_path


default_pipeline = RedactionPipeline()

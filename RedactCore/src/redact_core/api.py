import os
from pathlib import Path
import re
from typing import Any
from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
import pymupdf

from redact_core.entities import default_detector
from redact_core.env import load_env_safely
from redact_core.models import RedactionPolicy, ResourceContext, SubjectContext
from redact_core.ocr import default_ocr_router
from redact_core.pipeline import default_pipeline
from redact_core.policy import default_policy_engine
from redact_core.storage import default_store

load_env_safely()


def get_default_web_dir() -> Path:
    env_dir = os.environ.get("REDACTCORE_WEB_DIR")
    if env_dir:
        return Path(env_dir)
    cwd_web = Path.cwd() / "web"
    if cwd_web.exists():
        return cwd_web
    app_web = Path("/app/web")
    if app_web.exists():
        return app_web
    return Path(__file__).resolve().parent.parent.parent / "web"


def get_default_fixtures_dir() -> Path:
    env_dir = os.environ.get("REDACTCORE_FIXTURES_DIR")
    if env_dir:
        return Path(env_dir)
    cwd_fixtures = Path.cwd() / "fixtures"
    if cwd_fixtures.exists():
        return cwd_fixtures
    app_fixtures = Path("/app/fixtures")
    if app_fixtures.exists():
        return app_fixtures
    return Path(__file__).resolve().parent.parent.parent / "fixtures"


WEB_DIR = get_default_web_dir()
FIXTURES_DIR = get_default_fixtures_dir()

DEFAULT_MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB


def get_max_upload_bytes() -> int:
    """Returns configured max upload size in bytes, defaulting to 20MB."""
    raw = os.environ.get("REDACTCORE_MAX_UPLOAD_BYTES", "").strip()
    if raw:
        try:
            return int(raw)
        except ValueError:
            pass
    return DEFAULT_MAX_UPLOAD_BYTES


def get_cors_origins() -> list[str]:
    """Returns allowed CORS origins configured by environment or safe localhost defaults."""
    raw_cors = os.environ.get("REDACTCORE_CORS_ORIGINS", "").strip()
    if raw_cors:
        return [origin.strip() for origin in raw_cors.split(",") if origin.strip()]
    return [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]


def validate_safe_filename(filename: str | None) -> str:
    """Validates that filename is safe, non-empty, and free of path traversal sequences."""
    if not filename or not filename.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename missing")

    # Reject null bytes, URL-encoded null bytes, path traversal sequences, and directory separators
    if "\x00" in filename or "%00" in filename or ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename: path traversal characters are not permitted",
        )

    safe_name = Path(filename).name
    if not safe_name or safe_name != filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename: path traversal characters are not permitted",
        )

    ext = Path(safe_name).suffix.lstrip(".").lower()
    if ext not in ("pdf", "docx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Only PDF and DOCX documents are supported.",
        )
    return safe_name


def validate_view_id(view_id: str) -> str:
    """Validates that a view_id conforms to a safe alphanumeric identifier format."""
    if not view_id or "\x00" in view_id or ".." in view_id or "/" in view_id or "\\" in view_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid view_id")
    if not re.match(r"^[a-zA-Z0-9_-]+$", view_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid view_id")
    return view_id


app = FastAPI(
    title="Argus RedactCore API",
    description="Policy-driven privacy-preserved document views",
    version="0.1.0",
)

cors_origins = get_cors_origins()
allow_credentials = "*" not in cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Mount static web directory if it exists
if WEB_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(WEB_DIR)), name="static")


DEMO_SUBJECTS = [
    {
        "subject_id": "demo_sales_viewer",
        "name": "Sales Representative (Standard)",
        "roles": ["sales", "viewer"],
        "clearance": "standard",
        "description": "Restricted view: all employee PII, contacts, and compensation redacted or masked.",
    },
    {
        "subject_id": "demo_finance_viewer",
        "name": "Finance Auditor",
        "roles": ["finance", "viewer"],
        "clearance": "confidential",
        "description": "Authorized for compensation & staff IDs; telephone numbers redacted; emails allowed.",
    },
    {
        "subject_id": "demo_reviewer",
        "name": "Compliance Reviewer",
        "roles": ["reviewer", "compliance"],
        "clearance": "compliance",
        "description": "Inspects findings and review states; can inspect unverified figures.",
    },
]


class GenerateViewRequest(BaseModel):
    source_sha256: str
    ext: str = "pdf"
    policy_id: str = "sales-quarterly"
    subject_id: str = "demo_sales_viewer"
    roles: list[str] = Field(default_factory=lambda: ["sales", "viewer"])

    @field_validator("source_sha256")
    @classmethod
    def validate_sha(cls, v: str) -> str:
        if not re.match(r"^[a-fA-F0-9]{64}$", v):
            raise ValueError("Invalid source_sha256: must be a 64-character hexadecimal SHA-256 hash")
        return v.lower()

    @field_validator("ext")
    @classmethod
    def validate_ext(cls, v: str) -> str:
        clean = v.lstrip(".").lower()
        if clean not in ("pdf", "docx"):
            raise ValueError(f"Unsupported extension '{v}'. Must be 'pdf' or 'docx'.")
        return clean

    @field_validator("policy_id", "subject_id")
    @classmethod
    def validate_identifiers(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Identifier contains invalid characters")
        return v


@app.get("/healthz")
def get_healthz() -> dict[str, str]:
    """Lightweight liveness and readiness probe for Cloud Run and container runtimes."""
    return {"status": "ok"}


@app.get("/health")
def get_health() -> dict[str, Any]:
    """Health check endpoint exposing engine, storage, and recognizer status."""
    policies = default_policy_engine.list_policies()
    is_ephemeral = getattr(default_store, "is_ephemeral", False)
    return {
        "status": "healthy",
        "version": "0.1.0",
        "storage_root": str(default_store.root_dir),
        "storage_ephemeral": is_ephemeral,
        "storage_warning": (
            "Local container storage is ephemeral; derived views and uploaded originals "
            "will not persist across container restarts. Production deployments require "
            "durable object storage (e.g., Google Cloud Storage) and database persistence."
            if is_ephemeral else None
        ),
        "storage_metadata": (
            default_store.get_storage_metadata()
            if hasattr(default_store, "get_storage_metadata")
            else None
        ),
        "policies": [p.policy_id for p in policies],
        "presidio": {
            "active": default_detector.presidio_available,
            "limitation": default_detector.presidio_limitation,
        },
        "baseline_detector": "regex_deterministic",
        "ocr": default_ocr_router.get_health_summary(),
        "llm_inspector": default_detector.llm_inspector.check_health(),
    }


@app.get("/api/fixtures/{fixture_name}")
def get_fixture(fixture_name: str) -> FileResponse:
    """Provides access to synthetic test fixtures for demonstration and smoke tests."""
    demo_enabled = os.environ.get("REDACTCORE_ENABLE_DEMO_FIXTURES", "").lower() in ("true", "1", "yes")
    if not demo_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Synthetic fixture endpoint is disabled in hosted environments. Enable REDACTCORE_ENABLE_DEMO_FIXTURES=true for demo use only.",
        )

    if "\x00" in fixture_name or ".." in fixture_name or "/" in fixture_name or "\\" in fixture_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid fixture name")

    safe_name = Path(fixture_name).name
    if safe_name != fixture_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid fixture name")

    p = (FIXTURES_DIR / safe_name).resolve()
    if not str(p).startswith(str(FIXTURES_DIR.resolve())) or not p.exists() or not p.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fixture not found")

    return FileResponse(path=str(p), filename=safe_name)


@app.get("/api/policies")
def list_policies() -> list[dict[str, Any]]:
    """Lists all available redaction policies."""
    policies = default_policy_engine.list_policies()
    return [
        {
            "policy_id": p.policy_id,
            "name": p.name,
            "version": p.version,
            "description": p.description,
            "default_action": p.default_action,
            "require_figure_review": p.require_figure_review,
            "rules_count": len(p.rules),
        }
        for p in policies
    ]


@app.post("/api/policies", status_code=status.HTTP_201_CREATED)
def activate_policy(policy: RedactionPolicy) -> dict[str, Any]:
    """Activates and persists a declarative redaction policy into the enclave repository.
    
    1. Validates policy schema and entity types.
    2. Writes canonical YAML definition to disk policies directory.
    3. If Cloud Storage is connected, syncs to the organization enclave bucket (gs://.../policies/).
    4. Reloads the active policy engine so it is instantly available for view transformations.
    """
    safe_id = "".join(c for c in policy.policy_id if c.isalnum() or c in ("-", "_")).strip()
    if not safe_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid policy_id: must contain alphanumeric, hyphen, or underscore characters",
        )

    # Save to local enclave directory & memory
    file_path = default_policy_engine.save_policy(policy)

    # If GCS store is active, sync policy YAML to tenant bucket
    gcs_target = None
    if hasattr(default_store, "bucket") and getattr(default_store, "bucket", None) is not None:
        try:
            gcs_blob_name = f"policies/{safe_id}.yaml"
            blob = default_store.bucket.blob(gcs_blob_name)
            blob.upload_from_filename(str(file_path), content_type="application/x-yaml")
            gcs_target = f"gs://{default_store.bucket_name}/{gcs_blob_name}"
        except Exception as e:
            print(f"Warning: Could not sync policy {safe_id} to GCS: {e}")

    return {
        "status": "active",
        "policy_id": policy.policy_id,
        "name": policy.name,
        "version": policy.version,
        "rules_count": len(policy.rules),
        "gcs_target": gcs_target,
        "local_path": str(file_path),
        "message": f"Policy '{policy.policy_id}' successfully activated in RedactCore enclave.",
    }


SYSTEM_RESERVED_POLICIES: set[str] = {
    "engineering-internal-strict",
    "creative-partner-minimal",
    "thirdparty-vendor-restricted",
    "public-relations-safe",
    "sales-quarterly",
    "finance-full-access",
    "reviewer",
    "market-full-access",
}


@app.delete("/api/policies/{policy_id}")
def delete_policy(policy_id: str) -> dict[str, Any]:
    """Deletes a custom policy from the RedactCore enclave repository and GCS sync bucket.

    System-reserved demo policies are immutable and protected against deletion.
    """
    safe_id = "".join(c for c in policy_id if c.isalnum() or c in ("-", "_")).strip()
    if not safe_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid policy_id format: must contain alphanumeric, hyphen, or underscore characters",
        )

    if safe_id in SYSTEM_RESERVED_POLICIES or policy_id in SYSTEM_RESERVED_POLICIES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Policy '{policy_id}' is a system-reserved demo policy and cannot be deleted.",
        )

    # Delete from local directory and in-memory engine
    existed = default_policy_engine.delete_policy(safe_id)

    # If GCS store is active, delete YAML blob from tenant bucket
    gcs_deleted = False
    if hasattr(default_store, "bucket") and getattr(default_store, "bucket", None) is not None:
        try:
            gcs_blob_name = f"policies/{safe_id}.yaml"
            blob = default_store.bucket.blob(gcs_blob_name)
            if blob.exists():
                blob.delete()
                gcs_deleted = True
        except Exception as e:
            print(f"Warning: Could not delete policy {safe_id} from GCS: {e}")

    if not existed and not gcs_deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Policy '{policy_id}' not found in enclave repository.",
        )

    return {
        "status": "deleted",
        "policy_id": safe_id,
        "gcs_deleted": gcs_deleted,
        "message": f"Policy '{safe_id}' successfully removed from enclave.",
    }


@app.get("/api/subjects")
def list_subjects() -> list[dict[str, Any]]:
    """Lists preconfigured demo subjects demonstrating role-based view differentiation."""
    return DEMO_SUBJECTS


@app.post("/api/upload")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
) -> dict[str, Any]:
    """Uploads document into immutable original store and parses normalized structure.
    
    Security note: Original document bytes are NEVER returned by this endpoint.
    Only safe structural summaries and sanitized finding digests are returned.
    """
    safe_filename = validate_safe_filename(file.filename)
    max_bytes = get_max_upload_bytes()

    # Fast check on Content-Length header if provided
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > max_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail=f"File exceeds maximum allowed upload size of {max_bytes} bytes",
                )
        except ValueError:
            pass

    # Stream read in chunks to prevent unbounded memory allocation
    chunk_size = 64 * 1024
    total_read = 0
    chunks = []
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_read += len(chunk)
        if total_read > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"File exceeds maximum allowed upload size of {max_bytes} bytes",
            )
        chunks.append(chunk)

    content = b"".join(chunks)
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    try:
        source_sha256, _, norm_doc = default_pipeline.ingest_document(content, safe_filename)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to parse document: invalid or corrupted file format",
        )

    # Detect entities in document
    findings = default_detector.detect_in_document(norm_doc)

    return {
        "source_sha256": source_sha256,
        "filename": norm_doc.filename,
        "file_type": norm_doc.file_type,
        "page_count": norm_doc.page_count,
        "text_block_count": len(norm_doc.text_blocks),
        "table_count": len(norm_doc.tables),
        "figure_count": len(norm_doc.figures),
        "is_scanned": norm_doc.is_scanned,
        "ocr_status": norm_doc.ocr_status,
        "ocr_provider": norm_doc.ocr_provider,
        "ocr_coverage": norm_doc.ocr_coverage,
        "ocr_warnings": norm_doc.ocr_warnings,
        "warnings": norm_doc.warnings,
        "metadata": norm_doc.metadata,
        "findings_count": len(findings),
        "findings_summary": [f.safe_summary() for f in findings],
    }


@app.post("/api/views")
def generate_view(req: GenerateViewRequest) -> dict[str, Any]:
    """Generates an auditable privacy-preserved view for a subject under a selected policy."""
    subject = SubjectContext(
        subject_id=req.subject_id,
        roles=set(req.roles),
    )
    resource = ResourceContext(
        document_id=req.source_sha256[:16],
        classification="internal",
    )

    try:
        manifest, _ = default_pipeline.generate_derived_view(
            source_sha256=req.source_sha256,
            ext=req.ext,
            policy_id=req.policy_id,
            subject=subject,
            resource=resource,
        )
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    return {
        "view_id": manifest.view_id,
        "source_sha256": manifest.source_sha256,
        "output_sha256": manifest.output_sha256,
        "policy_id": manifest.policy_id,
        "policy_version": manifest.policy_version,
        "operation_counts": manifest.operation_counts,
        "verification": manifest.verification,
        "warnings": manifest.warnings,
        "download_url": f"/api/views/{manifest.view_id}/download",
        "preview_url": f"/api/views/{manifest.view_id}/preview",
        "manifest_url": f"/api/views/{manifest.view_id}/manifest",
    }


@app.get("/api/views/{view_id}/manifest")
def get_view_manifest(view_id: str) -> dict[str, Any]:
    """Retrieves the immutable audit manifest for a derived view."""
    safe_id = validate_view_id(view_id)
    manifest = default_store.get_manifest(safe_id)
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Manifest for view '{safe_id}' not found")
    return manifest.model_dump()


@app.get("/api/views/{view_id}/download")
def download_derived_view(view_id: str) -> FileResponse:
    """Downloads the verified derived document view.
    
    Security note: Only the transformed derivative view is served; original files
    are never reachable through this endpoint.
    """
    safe_id = validate_view_id(view_id)
    manifest = default_store.get_manifest(safe_id)
    if not manifest:
        raise HTTPException(status_code=404, detail="View not found")

    ext = manifest.output_format
    view_path = default_store.get_view_path(safe_id, ext)
    if not view_path or not view_path.exists():
        raise HTTPException(status_code=404, detail="Derived view file missing from store")

    media_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=str(view_path),
        media_type=media_type,
        filename=f"derived_{safe_id}.{ext}",
    )


@app.get("/api/views/{view_id}/signed-url")
def get_view_signed_url(
    view_id: str,
    role: str | None = None,
    agent: bool = False,
) -> dict[str, Any]:
    """Generates a direct V4 signed URL for zero-intermediary streaming.
    
    TTL: 30 minutes for human inspection, 10 minutes for AI agent context ingestion.
    """
    safe_id = validate_view_id(view_id)
    manifest = default_store.get_manifest(safe_id)
    if not manifest:
        raise HTTPException(status_code=404, detail=f"View '{safe_id}' not found")

    ext = manifest.output_format
    if hasattr(default_store, "generate_signed_url"):
        return default_store.generate_signed_url(safe_id, ext, role_id=role, is_agent=agent)

    ttl_minutes = 10 if agent else 30
    return {
        "view_id": safe_id,
        "signed_url": f"/api/views/{safe_id}/download",
        "expires_in_seconds": ttl_minutes * 60,
        "ttl_minutes": ttl_minutes,
        "target_object": f"views/{safe_id}.{ext}",
        "bucket": "local-filesystem",
        "is_agent": agent,
    }


@app.get("/api/storage/info")
def get_storage_info() -> dict[str, Any]:
    """Exposes cloud storage enclave telemetry, bucket namespace, and WORM retention settings."""
    if hasattr(default_store, "get_storage_metadata"):
        return default_store.get_storage_metadata()
    return {
        "backend": "filesystem",
        "bucket_name": "local-filesystem",
        "tenant_prefix": None,
        "worm_retention_days": 365,
        "connected": True,
        "cache_dir": str(getattr(default_store, "root_dir", "")),
        "human_ttl_minutes": 30,
        "agent_ttl_minutes": 10,
    }



@app.get("/api/views/{view_id}/preview")
def preview_derived_view(view_id: str, page: int = 1) -> Response:
    """Renders a thumbnail preview of the derived view (first page as PNG for PDF, text summary for DOCX)."""
    safe_id = validate_view_id(view_id)
    manifest = default_store.get_manifest(safe_id)
    if not manifest:
        raise HTTPException(status_code=404, detail="View not found")

    ext = manifest.output_format
    view_path = default_store.get_view_path(safe_id, ext)
    if not view_path or not view_path.exists():
        raise HTTPException(status_code=404, detail="Derived view file missing")

    if ext == "pdf":
        doc = pymupdf.open(str(view_path))
        page_idx = max(0, min(page - 1, len(doc) - 1))
        pix = doc[page_idx].get_pixmap(dpi=150)
        img_bytes = pix.tobytes("png")
        doc.close()
        return Response(content=img_bytes, media_type="image/png")
    else:
        # DOCX preview: return json of paragraph snippets
        import docx
        doc = docx.Document(str(view_path))
        paras = [p.text for p in doc.paragraphs if p.text.strip()][:20]
        return Response(
            content=f"DOCX Derived Preview:\n\n" + "\n\n".join(paras),
            media_type="text/plain",
        )


@app.get("/", response_class=HTMLResponse)
def index():
    """Serves the local demonstration UI."""
    index_file = WEB_DIR / "index.html"
    if index_file.exists():
        return HTMLResponse(content=index_file.read_text(encoding="utf-8"))
    return HTMLResponse(content="<h1>Argus RedactCore API running. UI index.html not found.</h1>")

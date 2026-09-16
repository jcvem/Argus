"""FastAPI application for Argus RedactCore."""

from io import BytesIO
from pathlib import Path
from typing import Any
from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import pymupdf

from redact_core.entities import default_detector
from redact_core.models import ResourceContext, SubjectContext
from redact_core.ocr import default_ocr_router
from redact_core.pipeline import default_pipeline
from redact_core.policy import default_policy_engine
from redact_core.storage import default_store


WEB_DIR = Path(__file__).resolve().parent.parent.parent / "web"
FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent / "fixtures"

app = FastAPI(
    title="Argus RedactCore API",
    description="Policy-driven privacy-preserved document views",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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


@app.get("/health")
def get_health() -> dict[str, Any]:
    """Health check endpoint exposing engine, storage, and recognizer status."""
    policies = default_policy_engine.list_policies()
    return {
        "status": "healthy",
        "version": "0.1.0",
        "storage_root": str(default_store.root_dir),
        "policies": [p.policy_id for p in policies],
        "presidio": {
            "active": default_detector.presidio_available,
            "limitation": default_detector.presidio_limitation,
        },
        "baseline_detector": "regex_deterministic",
        "ocr": default_ocr_router.get_health_summary(),
    }


@app.get("/api/fixtures/{fixture_name}")
def get_fixture(fixture_name: str) -> FileResponse:
    """Provides access to synthetic test fixtures for demonstration and smoke tests."""
    p = FIXTURES_DIR / fixture_name
    if not p.exists():
        raise HTTPException(status_code=404, detail="Fixture not found")
    return FileResponse(path=str(p), filename=fixture_name)


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


@app.get("/api/subjects")
def list_subjects() -> list[dict[str, Any]]:
    """Lists preconfigured demo subjects demonstrating role-based view differentiation."""
    return DEMO_SUBJECTS


@app.post("/api/upload")
async def upload_document(file: UploadFile = File(...)) -> dict[str, Any]:
    """Uploads document into immutable original store and parses normalized structure.
    
    Security note: Original document bytes are NEVER returned by this endpoint.
    Only safe structural summaries and sanitized finding digests are returned.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing")

    ext = Path(file.filename).suffix.lstrip(".").lower()
    if ext not in ("pdf", "docx"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Only PDF and DOCX documents are supported.",
        )

    content = await file.read()
    try:
        source_sha256, _, norm_doc = default_pipeline.ingest_document(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

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
    manifest = default_store.get_manifest(view_id)
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Manifest for view '{view_id}' not found")
    return manifest.model_dump()


@app.get("/api/views/{view_id}/download")
def download_derived_view(view_id: str) -> FileResponse:
    """Downloads the verified derived document view.
    
    Security note: Only the transformed derivative view is served; original files
    are never reachable through this endpoint.
    """
    manifest = default_store.get_manifest(view_id)
    if not manifest:
        raise HTTPException(status_code=404, detail="View not found")

    ext = manifest.output_format
    view_path = default_store.get_view_path(view_id, ext)
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
        filename=f"derived_{view_id}.{ext}",
    )


@app.get("/api/views/{view_id}/preview")
def preview_derived_view(view_id: str, page: int = 1) -> Response:
    """Renders a thumbnail preview of the derived view (first page as PNG for PDF, text summary for DOCX)."""
    manifest = default_store.get_manifest(view_id)
    if not manifest:
        raise HTTPException(status_code=404, detail="View not found")

    ext = manifest.output_format
    view_path = default_store.get_view_path(view_id, ext)
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

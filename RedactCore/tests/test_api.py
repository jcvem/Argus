import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from fastapi.testclient import TestClient
import pytest
import pymupdf
import docx

from redact_core.api import app
from scripts.generate_fixtures import FIXTURE_PII

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"


@pytest.fixture
def client():
    return TestClient(app)


def test_api_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "sales-quarterly" in data["policies"]


def test_api_policies_and_subjects(client):
    p_resp = client.get("/api/policies")
    assert p_resp.status_code == 200
    policies = p_resp.json()
    policy_ids = [p["policy_id"] for p in policies]
    assert "sales-quarterly" in policy_ids
    assert "finance-full-access" in policy_ids
    assert "reviewer" in policy_ids

    s_resp = client.get("/api/subjects")
    assert s_resp.status_code == 200
    subjects = s_resp.json()
    subj_ids = [s["subject_id"] for s in subjects]
    assert "demo_sales_viewer" in subj_ids


def test_api_upload_and_create_view_pdf(client):
    pdf_path = FIXTURES_DIR / "sample_report.pdf"
    assert pdf_path.exists()

    with open(pdf_path, "rb") as f:
        files = {"file": ("sample_report.pdf", f, "application/pdf")}
        up_resp = client.post("/api/upload", files=files)
    assert up_resp.status_code == 200
    up_data = up_resp.json()
    assert up_data["file_type"] == "pdf"
    assert up_data["page_count"] == 2
    assert up_data["findings_count"] > 0
    source_sha256 = up_data["source_sha256"]

    # Generate view
    view_req = {
        "source_sha256": source_sha256,
        "ext": "pdf",
        "policy_id": "sales-quarterly",
        "subject_id": "demo_sales_viewer",
        "roles": ["sales", "viewer"],
    }
    v_resp = client.post("/api/views", json=view_req)
    assert v_resp.status_code == 200
    v_data = v_resp.json()
    assert v_data["verification"]["passed"] is True
    assert "view_id" in v_data
    view_id = v_data["view_id"]

    # Check manifest
    m_resp = client.get(f"/api/views/{view_id}/manifest")
    assert m_resp.status_code == 200
    m_data = m_resp.json()
    assert m_data["view_id"] == view_id
    assert m_data["source_sha256"] == source_sha256

    # Download and verify sensitive PII absence
    dl_resp = client.get(f"/api/views/{view_id}/download")
    assert dl_resp.status_code == 200
    derived_bytes = dl_resp.content

    doc = pymupdf.open(stream=derived_bytes, filetype="pdf")
    all_text = " ".join(page.get_text() for page in doc)
    doc.close()

    for pii_key in ["salary_1", "salary_2", "emp_id_1", "emp_id_2", "phone_1", "phone_2"]:
        val = FIXTURE_PII[pii_key]
        assert val not in all_text, f"PII leak detected: {pii_key} ('{val}') found in PDF output"


def test_api_upload_and_create_view_docx(client):
    docx_path = FIXTURES_DIR / "sample_report.docx"
    assert docx_path.exists()

    with open(docx_path, "rb") as f:
        files = {"file": ("sample_report.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        up_resp = client.post("/api/upload", files=files)
    assert up_resp.status_code == 200
    up_data = up_resp.json()
    assert up_data["file_type"] == "docx"
    assert up_data["findings_count"] > 0
    source_sha256 = up_data["source_sha256"]

    # Generate view
    view_req = {
        "source_sha256": source_sha256,
        "ext": "docx",
        "policy_id": "sales-quarterly",
        "subject_id": "demo_sales_viewer",
        "roles": ["sales", "viewer"],
    }
    v_resp = client.post("/api/views", json=view_req)
    assert v_resp.status_code == 200
    v_data = v_resp.json()
    assert v_data["verification"]["passed"] is True
    view_id = v_data["view_id"]

    # Download and verify
    dl_resp = client.get(f"/api/views/{view_id}/download")
    assert dl_resp.status_code == 200
    from io import BytesIO
    d = docx.Document(BytesIO(dl_resp.content))
    all_text = " ".join(p.text for p in d.paragraphs) + " " + " ".join(
        c.text for t in d.tables for r in t.rows for c in r.cells
    )

    for pii_key in ["salary_1", "salary_2", "emp_id_1", "emp_id_2", "phone_1", "phone_2"]:
        val = FIXTURE_PII[pii_key]
        assert val not in all_text, f"PII leak detected: {pii_key} ('{val}') found in DOCX output"


def test_api_scanned_fail_closed(client):
    scanned_path = FIXTURES_DIR / "scanned_sample.pdf"
    assert scanned_path.exists()

    with open(scanned_path, "rb") as f:
        files = {"file": ("scanned_sample.pdf", f, "application/pdf")}
        up_resp = client.post("/api/upload", files=files)
    assert up_resp.status_code == 200
    up_data = up_resp.json()
    assert up_data["is_scanned"] is True
    source_sha256 = up_data["source_sha256"]

    # Generation should be blocked fail-closed (HTTP 403)
    view_req = {
        "source_sha256": source_sha256,
        "ext": "pdf",
        "policy_id": "sales-quarterly",
        "subject_id": "demo_sales_viewer",
        "roles": ["sales", "viewer"],
    }
    v_resp = client.post("/api/views", json=view_req)
    assert v_resp.status_code == 403
    assert "blocked" in v_resp.json()["detail"].lower()

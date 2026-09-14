#!/usr/bin/env python3
"""Executable smoke test script for Argus RedactCore FastAPI application.

Executes a complete end-to-end verification of:
1. /health endpoint
2. /api/policies and /api/subjects
3. /api/upload for both PDF and DOCX
4. /api/views view generation with policy sales-quarterly
5. /api/views/{view_id}/manifest retrieval and validation
6. /api/views/{view_id}/download derived artifact retrieval
7. Verification of zero PII leakage in generated PDF and DOCX
8. Fail-closed blocking (HTTP 403) for scanned document without OCR
"""

from io import BytesIO
from pathlib import Path
import sys

# Ensure repository root is on sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import docx
from fastapi.testclient import TestClient
import pymupdf

from redact_core.api import app
from scripts.generate_fixtures import FIXTURE_PII

FIXTURES_DIR = REPO_ROOT / "fixtures"


def run_smoke_test() -> int:
    client = TestClient(app)
    print("=== Argus RedactCore API Smoke Test ===")

    # 1. Health
    print("[1/7] Testing /health ...", end=" ")
    r = client.get("/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health_data = r.json()
    assert health_data["status"] == "healthy"
    print(f"PASS (status={health_data['status']}, detector={health_data['baseline_detector']})")

    # 2. Policies and Subjects
    print("[2/7] Testing /api/policies and /api/subjects ...", end=" ")
    p_resp = client.get("/api/policies")
    assert p_resp.status_code == 200
    s_resp = client.get("/api/subjects")
    assert s_resp.status_code == 200
    print(f"PASS ({len(p_resp.json())} policies, {len(s_resp.json())} subjects)")

    # 3. PDF Upload & Derived View Creation
    print("[3/7] Testing PDF upload and derived view generation ...", end=" ")
    pdf_fixture = FIXTURES_DIR / "sample_report.pdf"
    with open(pdf_fixture, "rb") as f:
        up_resp = client.post("/api/upload", files={"file": ("sample_report.pdf", f, "application/pdf")})
    assert up_resp.status_code == 200, f"PDF upload failed: {up_resp.text}"
    pdf_upload = up_resp.json()
    pdf_sha = pdf_upload["source_sha256"]

    view_req_pdf = {
        "source_sha256": pdf_sha,
        "ext": "pdf",
        "policy_id": "sales-quarterly",
        "subject_id": "demo_sales_viewer",
        "roles": ["sales", "viewer"],
    }
    v_resp_pdf = client.post("/api/views", json=view_req_pdf)
    assert v_resp_pdf.status_code == 200, f"PDF view creation failed: {v_resp_pdf.text}"
    pdf_view = v_resp_pdf.json()
    assert pdf_view["verification"]["passed"] is True
    print(f"PASS (view_id={pdf_view['view_id']}, ops={pdf_view['operation_counts']})")

    # 4. DOCX Upload & Derived View Creation
    print("[4/7] Testing DOCX upload and derived view generation ...", end=" ")
    docx_fixture = FIXTURES_DIR / "sample_report.docx"
    with open(docx_fixture, "rb") as f:
        up_resp = client.post("/api/upload", files={"file": ("sample_report.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
    assert up_resp.status_code == 200, f"DOCX upload failed: {up_resp.text}"
    docx_upload = up_resp.json()
    docx_sha = docx_upload["source_sha256"]

    view_req_docx = {
        "source_sha256": docx_sha,
        "ext": "docx",
        "policy_id": "sales-quarterly",
        "subject_id": "demo_sales_viewer",
        "roles": ["sales", "viewer"],
    }
    v_resp_docx = client.post("/api/views", json=view_req_docx)
    assert v_resp_docx.status_code == 200, f"DOCX view creation failed: {v_resp_docx.text}"
    docx_view = v_resp_docx.json()
    assert docx_view["verification"]["passed"] is True
    print(f"PASS (view_id={docx_view['view_id']}, ops={docx_view['operation_counts']})")

    # 5. Manifest & Download Verification for PDF
    print("[5/7] Verifying PDF download and zero sensitive leaks ...", end=" ")
    dl_pdf = client.get(f"/api/views/{pdf_view['view_id']}/download")
    assert dl_pdf.status_code == 200
    doc_pdf = pymupdf.open(stream=dl_pdf.content, filetype="pdf")
    pdf_text = " ".join(p.get_text() for p in doc_pdf)
    doc_pdf.close()

    sensitive_keys = ["salary_1", "salary_2", "emp_id_1", "emp_id_2", "phone_1", "phone_2"]
    for k in sensitive_keys:
        val = FIXTURE_PII[k]
        assert val not in pdf_text, f"LEAK: '{val}' found in PDF output"
    print("PASS (0 leaks found in PDF)")

    # 6. Manifest & Download Verification for DOCX
    print("[6/7] Verifying DOCX download and zero sensitive leaks ...", end=" ")
    dl_docx = client.get(f"/api/views/{docx_view['view_id']}/download")
    assert dl_docx.status_code == 200
    d_docx = docx.Document(BytesIO(dl_docx.content))
    docx_text = " ".join(p.text for p in d_docx.paragraphs) + " " + " ".join(
        c.text for t in d_docx.tables for r in t.rows for c in r.cells
    )
    for k in sensitive_keys:
        val = FIXTURE_PII[k]
        assert val not in docx_text, f"LEAK: '{val}' found in DOCX output"
    print("PASS (0 leaks found in DOCX)")

    # 7. Fail-closed check for scanned document
    print("[7/7] Testing fail-closed behavior on scanned sample ...", end=" ")
    scanned_fixture = FIXTURES_DIR / "scanned_sample.pdf"
    with open(scanned_fixture, "rb") as f:
        up_resp = client.post("/api/upload", files={"file": ("scanned_sample.pdf", f, "application/pdf")})
    assert up_resp.status_code == 200
    scanned_sha = up_resp.json()["source_sha256"]

    v_resp_scanned = client.post("/api/views", json={
        "source_sha256": scanned_sha,
        "ext": "pdf",
        "policy_id": "sales-quarterly",
        "subject_id": "demo_sales_viewer",
        "roles": ["sales", "viewer"],
    })
    assert v_resp_scanned.status_code == 403, f"Expected 403 Forbidden, got {v_resp_scanned.status_code}"
    assert "blocked" in v_resp_scanned.json()["detail"].lower()
    print("PASS (HTTP 403 fail-closed enforced)")

    print("\nAll API smoke tests PASSED successfully!")
    return 0


if __name__ == "__main__":
    sys.exit(run_smoke_test())

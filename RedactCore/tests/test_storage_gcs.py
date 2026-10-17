"""Unit tests for GCSDocumentStore, Option A namespace partitioning, WORM holds, and signed URLs."""

import json
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock
import pytest
from fastapi.testclient import TestClient

from redact_core.api import app
from redact_core.models import ViewManifest
from redact_core.storage import DocumentStore, get_document_store
from redact_core.storage_gcs import (
    DEFAULT_AGENT_SIGNED_URL_TTL_MINUTES,
    DEFAULT_HUMAN_SIGNED_URL_TTL_MINUTES,
    GCSDocumentStore,
)


def make_dummy_manifest(view_id: str) -> ViewManifest:
    return ViewManifest(
        schema_version="1.0.0",
        view_id=view_id,
        source_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        output_sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        policy_id="default-strict",
        policy_version="1.0.0",
        subject_id_digest="subjh12345",
        decision_id="dec_123",
        created_at="2026-10-17T00:00:00Z",
        input_format="pdf",
        output_format="pdf",
        operation_counts={"redact": 2},
        warnings=[],
        verification={"passed": True, "leaks_found": []},
    )


class MockGCSBlob:
    def __init__(self, name: str, bucket: Any = None):
        self.name = name
        self.bucket = bucket
        self.data: bytes = b""
        self.metadata: dict[str, str] = {}
        self._exists = False
        self.temporary_hold = False

    def exists(self) -> bool:
        return self._exists

    def upload_from_string(self, data: bytes | str, content_type: str | None = None):
        if isinstance(data, str):
            self.data = data.encode("utf-8")
        else:
            self.data = data
        self._exists = True

    def download_as_bytes(self) -> bytes:
        if not self._exists:
            raise FileNotFoundError(f"Blob {self.name} does not exist")
        return self.data

    def download_as_text(self) -> str:
        return self.download_as_bytes().decode("utf-8")

    def patch(self):
        pass

    def generate_signed_url(self, version: str = "v4", expiration: Any = None, method: str = "GET") -> str:
        secs = int(expiration.total_seconds()) if hasattr(expiration, "total_seconds") else 1800
        return f"https://storage.googleapis.com/{self.bucket.name}/{self.name}?X-Goog-Expires={secs}&v={version}"


class MockGCSBucket:
    def __init__(self, name: str):
        self.name = name
        self.blobs: dict[str, MockGCSBlob] = {}

    def blob(self, blob_name: str) -> MockGCSBlob:
        if blob_name not in self.blobs:
            self.blobs[blob_name] = MockGCSBlob(blob_name, bucket=self)
        return self.blobs[blob_name]


class MockGCSClient:
    def __init__(self):
        self.buckets: dict[str, MockGCSBucket] = {}

    def bucket(self, name: str) -> MockGCSBucket:
        if name not in self.buckets:
            self.buckets[name] = MockGCSBucket(name)
        return self.buckets[name]


def test_gcs_store_tenant_prefix_and_paths(tmp_path: Path):
    """Verifies that GCSDocumentStore partitions objects under tenant namespace according to Option A."""
    mock_client = MockGCSClient()
    store = GCSDocumentStore(
        bucket_name="argus-tenant-org-hukurou",
        tenant_prefix="org-hukurou",
        client=mock_client,
        cache_dir=tmp_path,
    )

    sample_bytes = b"%PDF-1.4 Hello Enterprise Safe Document"
    sha, local_path = store.store_original(sample_bytes, "pdf")

    assert len(sha) == 64
    assert local_path.exists()
    assert local_path.read_bytes() == sample_bytes

    # Verify GCS blob placement
    expected_blob_name = f"org-hukurou/originals/{sha}.pdf"
    bucket = mock_client.bucket("argus-tenant-org-hukurou")
    assert expected_blob_name in bucket.blobs
    blob = bucket.blobs[expected_blob_name]
    assert blob.exists()
    assert blob.data == sample_bytes
    assert blob.metadata["sha256"] == sha
    assert blob.temporary_hold is True  # WORM hold applied


def test_gcs_store_deduplication(tmp_path: Path):
    """Verifies that duplicate content hashes are deduplicated without re-upload."""
    mock_client = MockGCSClient()
    store = GCSDocumentStore(
        bucket_name="argus-tenant-org-hukurou",
        client=mock_client,
        cache_dir=tmp_path,
    )

    data = b"Immutable Document Payload 12345"
    sha1, path1 = store.store_original(data, "pdf")
    sha2, path2 = store.store_original(data, "pdf")

    assert sha1 == sha2
    assert path1 == path2


def test_gcs_store_view_and_role_guarding(tmp_path: Path):
    """Verifies that derived views are persisted to both canonical and role-partitioned keys."""
    mock_client = MockGCSClient()
    store = GCSDocumentStore(
        bucket_name="argus-tenant-org-hukurou",
        tenant_prefix="org-hukurou",
        client=mock_client,
        cache_dir=tmp_path,
    )

    view_data = b"Redacted Sanitized Content"
    view_id = "view_test_sales_001"
    output_hash, path = store.store_view(view_id, view_data, "pdf", role_id="role_sales")

    assert path.exists()
    assert path.read_bytes() == view_data

    bucket = mock_client.bucket("argus-tenant-org-hukurou")
    canonical_key = f"org-hukurou/views/{view_id}.pdf"
    role_key = f"org-hukurou/views/role_sales/{view_id}.pdf"

    assert canonical_key in bucket.blobs
    assert role_key in bucket.blobs
    assert bucket.blobs[canonical_key].metadata["output_sha256"] == output_hash


def test_gcs_store_manifest_roundtrip(tmp_path: Path):
    """Verifies that cryptographic manifests serialize and deserialize accurately."""
    mock_client = MockGCSClient()
    store = GCSDocumentStore(
        bucket_name="argus-tenant-org-hukurou",
        client=mock_client,
        cache_dir=tmp_path,
    )

    manifest = make_dummy_manifest("view_manifest_roundtrip")
    saved_path = store.store_manifest(manifest)
    assert saved_path.exists()

    fetched = store.get_manifest("view_manifest_roundtrip")
    assert fetched is not None
    assert fetched.view_id == "view_manifest_roundtrip"
    assert fetched.source_sha256 == manifest.source_sha256


def test_signed_url_ttl_standards(tmp_path: Path):
    """Verifies signed URL TTL: 30 minutes for human inspection, 10 minutes for AI agent."""
    mock_client = MockGCSClient()
    store = GCSDocumentStore(
        bucket_name="argus-tenant-org-hukurou",
        client=mock_client,
        cache_dir=tmp_path,
    )

    # Human inspection
    human_url_info = store.generate_signed_url(
        view_id="view_human_test",
        extension="pdf",
        role_id="role_auditor",
        is_agent=False,
    )
    assert human_url_info["ttl_minutes"] == DEFAULT_HUMAN_SIGNED_URL_TTL_MINUTES
    assert human_url_info["expires_in_seconds"] == 1800  # 30 * 60
    assert "X-Goog-Expires=1800" in human_url_info["signed_url"]

    # AI Agent context ingestion
    agent_url_info = store.generate_signed_url(
        view_id="view_agent_test",
        extension="pdf",
        role_id="role_agent",
        is_agent=True,
    )
    assert agent_url_info["ttl_minutes"] == DEFAULT_AGENT_SIGNED_URL_TTL_MINUTES
    assert agent_url_info["expires_in_seconds"] == 600  # 10 * 60
    assert "X-Goog-Expires=600" in agent_url_info["signed_url"]


def test_api_storage_info_and_signed_url_endpoint():
    """Tests the new /api/storage/info and /api/views/{view_id}/signed-url endpoints."""
    client = TestClient(app)

    # 1. Storage info
    res = client.get("/api/storage/info")
    assert res.status_code == 200
    info = res.json()
    assert "backend" in info
    assert "worm_retention_days" in info
    assert info["worm_retention_days"] == 365
    assert info["human_ttl_minutes"] == 30
    assert info["agent_ttl_minutes"] == 10

    # 2. Signed URL for non-existent view returns 404
    missing_res = client.get("/api/views/view_nonexistent/signed-url")
    assert missing_res.status_code == 404

"""Tests for hashing, masking, and immutable storage."""

import os
from pathlib import Path
import pytest
from redact_core.hashing import (
    compute_sha256_bytes,
    compute_sha256_file,
    hash_sensitive_value,
    mask_string,
)
from redact_core.models import RedactionPlan, VerificationResult, ViewManifest
from redact_core.storage import DocumentStore


def test_compute_sha256():
    data = b"Hello Privacy World"
    h1 = compute_sha256_bytes(data)
    assert len(h1) == 64
    assert h1 == "c9fd5455234c94fc884fe9129f217d688400fb77a2e3d8e073e772a5a3fcfbec"


def test_hash_sensitive_value():
    val = "alice@example.com"
    d1 = hash_sensitive_value(val)
    d2 = hash_sensitive_value(val)
    assert d1 == d2
    assert len(d1) == 64
    assert val not in d1  # One-way digest


def test_mask_string():
    assert mask_string("alice.montgomery@example.com", "EMAIL_ADDRESS") == "a**************y@example.com"
    assert mask_string("EMP-84920", "EMPLOYEE_ID") == "EMP-***20"
    assert mask_string("+1-555-234-5678", "PHONE_NUMBER") == "+1-5**-***-**78"
    assert mask_string("Secret", "GENERAL") == "S****t"


def test_mask_string_edge_cases():
    # Email edge cases
    assert mask_string("bob@example.com", "EMAIL_ADDRESS") == "b*b@example.com"
    assert mask_string("ab@example.com", "EMAIL_ADDRESS") == "a**b@example.com"
    assert mask_string("a@example.com", "EMAIL_ADDRESS") == "a***@example.com"
    assert mask_string("@example.com", "EMAIL_ADDRESS") == "***@example.com"
    assert mask_string("", "EMAIL_ADDRESS") == "***"
    assert mask_string("   ", "EMAIL_ADDRESS") == "***"

    # General / fallback edge cases
    assert mask_string("A", "GENERAL") == "*"
    assert mask_string("AB", "GENERAL") == "**"
    assert mask_string("ABC", "GENERAL") == "***"
    assert mask_string("ABCD", "GENERAL") == "A**D"

    # Custom mask character
    assert mask_string("alice@example.com", "EMAIL_ADDRESS", mask_char="#") == "a###e@example.com"


def test_immutable_storage(tmp_path: Path):
    store = DocumentStore(root_dir=tmp_path)
    data = b"Original Document Content 123"
    sha, path = store.store_original(data, "pdf")

    assert path.exists()
    assert sha == compute_sha256_bytes(data)

    # Immutability: storing again returns same path without changing bytes
    sha2, path2 = store.store_original(data, "pdf")
    assert sha2 == sha
    assert path2 == path
    assert path.read_bytes() == data

    # Verify original unmodified
    assert store.verify_original_unmodified(sha, "pdf")


def test_store_view_and_manifest(tmp_path: Path):
    store = DocumentStore(root_dir=tmp_path)
    view_data = b"Redacted Derived View Content"
    view_id = "view_test_123"
    out_hash, view_path = store.store_view(view_id, view_data, "pdf")

    assert view_path.exists()
    assert out_hash == compute_sha256_bytes(view_data)
    assert store.get_view_path(view_id, "pdf") == view_path

    # Manifest storage
    manifest = ViewManifest(
        schema_version="1.0.0",
        view_id=view_id,
        source_sha256="sourcehash123456",
        output_sha256=out_hash,
        policy_id="sales-quarterly",
        policy_version="1.0.0",
        subject_id_digest="subjh12345",
        decision_id="dec_123",
        created_at="2026-09-14T00:00:00Z",
        input_format="pdf",
        output_format="pdf",
        operation_counts={"redact": 5},
        warnings=[],
        verification={"passed": True},
    )
    m_path = store.store_manifest(manifest)
    assert m_path.exists()

    loaded_m = store.get_manifest(view_id)
    assert loaded_m is not None
    assert loaded_m.view_id == view_id
    assert loaded_m.output_sha256 == out_hash
    assert loaded_m.verification["passed"] is True

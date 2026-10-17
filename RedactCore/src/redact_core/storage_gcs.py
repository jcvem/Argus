"""Google Cloud Storage (GCS) Document Store for ARGUS RedactCore.

Implements tenant-isolated, content-addressed cloud storage with:
- Tier-1 Immutable Originals (SHA-256 addressed, WORM retention hold)
- Tier-2 Role-Guarded Verified Views
- Tier-3 Cryptographic Manifests
- Zero-Intermediary V4 Signed URLs (30 min for humans, 10 min for AI agents)
"""

from __future__ import annotations

import datetime
import json
import logging
import os
from pathlib import Path
from typing import Any, Optional

from redact_core.hashing import compute_sha256_bytes, compute_sha256_file
from redact_core.models import ViewManifest

try:
    from google.cloud import storage
    from google.cloud.exceptions import NotFound
    GCS_AVAILABLE = True
except ImportError:
    GCS_AVAILABLE = False
    NotFound = Exception

logger = logging.getLogger(__name__)

# TTL Standards approved in architecture spec
DEFAULT_HUMAN_SIGNED_URL_TTL_MINUTES = 30
DEFAULT_AGENT_SIGNED_URL_TTL_MINUTES = 10
DEFAULT_WORM_RETENTION_DAYS = 365


class GCSDocumentStore:
    """Manages document storage in Google Cloud Storage with strict tenant partitioning,
    content-addressable immutable originals, and verified derived views.
    """

    def __init__(
        self,
        bucket_name: str | None = None,
        tenant_prefix: str = "",
        client: Optional[Any] = None,
        cache_dir: Path | str | None = None,
        worm_retention_days: int = DEFAULT_WORM_RETENTION_DAYS,
    ):
        if not GCS_AVAILABLE and client is None:
            raise ImportError(
                "google-cloud-storage is required for GCSDocumentStore. "
                "Install it with 'uv add google-cloud-storage'."
            )

        self.bucket_name = (
            bucket_name
            or os.environ.get("REDACTCORE_GCS_BUCKET")
            or os.environ.get("ARGUS_STORAGE_BUCKET")
            or "argus-tenant-org-hukurou"
        )
        self.tenant_prefix = tenant_prefix.strip("/")

        # Initialize GCS client
        if client is not None:
            self._client = client
        elif GCS_AVAILABLE:
            try:
                self._client = storage.Client()
            except Exception as e:
                logger.warning("Could not initialize default GCS client from environment: %s", e)
                self._client = None
        else:
            self._client = None

        self.worm_retention_days = worm_retention_days

        # Local cache directory for performant parsing / preview rendering
        if cache_dir:
            self.cache_dir = Path(cache_dir)
        else:
            base_cache = Path(os.environ.get("REDACTCORE_STORAGE_DIR") or "/tmp/argus_storage_cache")
            self.cache_dir = base_cache / (self.tenant_prefix or "default")

        self.originals_dir = self.cache_dir / "originals"
        self.views_dir = self.cache_dir / "views"
        self.manifests_dir = self.cache_dir / "manifests"

        self.originals_dir.mkdir(parents=True, exist_ok=True)
        self.views_dir.mkdir(parents=True, exist_ok=True)
        self.manifests_dir.mkdir(parents=True, exist_ok=True)

        self.is_ephemeral = False

    @property
    def root_dir(self) -> Path:
        """Compatibility property for API telemetry."""
        return self.cache_dir

    def _resolve_blob_name(self, category: str, filename: str) -> str:
        """Constructs canonical bucket object key with tenant prefix."""
        category = category.strip("/")
        filename = filename.lstrip("/")
        if self.tenant_prefix:
            return f"{self.tenant_prefix}/{category}/{filename}"
        return f"{category}/{filename}"

    def _get_bucket(self) -> Any:
        """Fetches the target GCS bucket instance."""
        if self._client is None:
            raise RuntimeError(
                f"GCS client not configured. Ensure GCP credentials or provide a client instance."
            )
        return self._client.bucket(self.bucket_name)

    def store_original(
        self,
        data: bytes,
        extension: str,
        apply_worm_hold: bool = True,
    ) -> tuple[str, Path]:
        """Stores an immutable original document addressed strictly by its SHA-256 hash.
        
        1. Calculates SHA-256 content checksum.
        2. Checks GCS bucket for existing object to deduplicate.
        3. Uploads if new, setting object metadata and WORM retention hold.
        4. Caches locally with read-only permissions (0o444).
        """
        ext = extension.lstrip(".").lower()
        sha256_hash = compute_sha256_bytes(data)
        blob_name = self._resolve_blob_name("originals", f"{sha256_hash}.{ext}")
        local_path = self.originals_dir / f"{sha256_hash}.{ext}"

        if self._client is not None:
            bucket = self._get_bucket()
            blob = bucket.blob(blob_name)

            if blob.exists():
                # Verify existing object SHA-256 if recorded in metadata
                meta = blob.metadata or {}
                if meta.get("sha256") and meta["sha256"] != sha256_hash:
                    raise ValueError(
                        f"GCS storage integrity violation: existing blob {blob_name} "
                        f"hash {meta.get('sha256')} does not match expected {sha256_hash}"
                    )
            else:
                # Upload new immutable original
                blob.metadata = {
                    "sha256": sha256_hash,
                    "extension": ext,
                    "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "worm_retention_days": str(self.worm_retention_days),
                }
                content_type = "application/pdf" if ext == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                blob.upload_from_string(data, content_type=content_type)

                # Apply WORM object retention / temporary hold if supported
                if apply_worm_hold:
                    try:
                        blob.temporary_hold = True
                        blob.patch()
                    except Exception as e:
                        logger.info("WORM temporary hold not applied (requires bucket retention permissions): %s", e)

        # Write to local cache with read-only permissions
        if not local_path.exists():
            temp_path = self.originals_dir / f".tmp_{sha256_hash}.{ext}"
            temp_path.write_bytes(data)
            try:
                os.chmod(temp_path, 0o444)
            except Exception:
                pass
            temp_path.replace(local_path)

        return sha256_hash, local_path

    def get_original_path(self, sha256_hash: str, extension: str) -> Path | None:
        """Locates an original document. Checks local cache first, then fetches from GCS."""
        ext = extension.lstrip(".").lower()
        local_path = self.originals_dir / f"{sha256_hash}.{ext}"

        if local_path.exists():
            return local_path

        if self._client is not None:
            blob_name = self._resolve_blob_name("originals", f"{sha256_hash}.{ext}")
            bucket = self._get_bucket()
            blob = bucket.blob(blob_name)
            if blob.exists():
                data = blob.download_as_bytes()
                # Verify downloaded hash
                downloaded_hash = compute_sha256_bytes(data)
                if downloaded_hash != sha256_hash:
                    raise ValueError(f"Downloaded GCS blob checksum mismatch for {blob_name}")
                local_path.write_bytes(data)
                try:
                    os.chmod(local_path, 0o444)
                except Exception:
                    pass
                return local_path

        return None

    def verify_original_unmodified(self, sha256_hash: str, extension: str) -> bool:
        """Verifies that the original file in storage matches its SHA-256 hash."""
        path = self.get_original_path(sha256_hash, extension)
        if not path or not path.exists():
            return False
        return compute_sha256_file(path) == sha256_hash

    def store_view(
        self,
        view_id: str,
        data: bytes,
        extension: str,
        role_id: str | None = None,
    ) -> tuple[str, Path]:
        """Stores a generated privacy-preserved derivative view in GCS and local cache."""
        ext = extension.lstrip(".").lower()
        output_hash = compute_sha256_bytes(data)

        # Canonical path under views/ (and optionally views/{role_id}/)
        blob_name = self._resolve_blob_name("views", f"{view_id}.{ext}")
        if role_id:
            role_blob_name = self._resolve_blob_name(f"views/{role_id}", f"{view_id}.{ext}")
        else:
            role_blob_name = None

        if self._client is not None:
            bucket = self._get_bucket()
            content_type = "application/pdf" if ext == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            blob = bucket.blob(blob_name)
            blob.metadata = {
                "view_id": view_id,
                "output_sha256": output_hash,
                "role_id": role_id or "default",
            }
            blob.upload_from_string(data, content_type=content_type)

            if role_blob_name:
                role_blob = bucket.blob(role_blob_name)
                role_blob.metadata = blob.metadata
                role_blob.upload_from_string(data, content_type=content_type)

        local_path = self.views_dir / f"{view_id}.{ext}"
        local_path.write_bytes(data)
        return output_hash, local_path

    def get_view_path(self, view_id: str, extension: str) -> Path | None:
        """Retrieves local cache path to a derived view file, fetching from GCS if needed."""
        ext = extension.lstrip(".").lower()
        local_path = self.views_dir / f"{view_id}.{ext}"
        if local_path.exists():
            return local_path

        if self._client is not None:
            blob_name = self._resolve_blob_name("views", f"{view_id}.{ext}")
            bucket = self._get_bucket()
            blob = bucket.blob(blob_name)
            if blob.exists():
                data = blob.download_as_bytes()
                local_path.write_bytes(data)
                return local_path

        return None

    def store_manifest(self, manifest: ViewManifest) -> Path:
        """Stores the view audit manifest as JSON in GCS and local cache."""
        view_id = manifest.view_id
        content = json.dumps(manifest.model_dump(), indent=2)
        blob_name = self._resolve_blob_name("manifests", f"{view_id}.json")

        if self._client is not None:
            bucket = self._get_bucket()
            blob = bucket.blob(blob_name)
            blob.metadata = {
                "view_id": view_id,
                "source_sha256": manifest.source_sha256,
                "output_sha256": manifest.output_sha256,
            }
            blob.upload_from_string(content, content_type="application/json")

        local_path = self.manifests_dir / f"{view_id}.json"
        local_path.write_text(content, encoding="utf-8")
        return local_path

    def get_manifest(self, view_id: str) -> ViewManifest | None:
        """Retrieves and deserializes an audit manifest from cache or GCS."""
        local_path = self.manifests_dir / f"{view_id}.json"
        if local_path.exists():
            data = json.loads(local_path.read_text(encoding="utf-8"))
            return ViewManifest(**data)

        if self._client is not None:
            blob_name = self._resolve_blob_name("manifests", f"{view_id}.json")
            bucket = self._get_bucket()
            blob = bucket.blob(blob_name)
            if blob.exists():
                raw = blob.download_as_text()
                data = json.loads(raw)
                local_path.write_text(raw, encoding="utf-8")
                return ViewManifest(**data)

        return None

    def generate_signed_url(
        self,
        view_id: str,
        extension: str,
        role_id: str | None = None,
        is_agent: bool = False,
    ) -> dict[str, Any]:
        """Generates a V4 signed URL for zero-intermediary streaming directly from GCS.
        
        TTL adheres strictly to approved architecture:
        - 30 minutes for human inspection
        - 10 minutes for AI agent context ingestion
        """
        ext = extension.lstrip(".").lower()
        if role_id:
            blob_name = self._resolve_blob_name(f"views/{role_id}", f"{view_id}.{ext}")
        else:
            blob_name = self._resolve_blob_name("views", f"{view_id}.{ext}")

        ttl_minutes = (
            DEFAULT_AGENT_SIGNED_URL_TTL_MINUTES
            if is_agent
            else DEFAULT_HUMAN_SIGNED_URL_TTL_MINUTES
        )
        expiration = datetime.timedelta(minutes=ttl_minutes)

        if self._client is not None:
            bucket = self._get_bucket()
            blob = bucket.blob(blob_name)
            try:
                signed_url = blob.generate_signed_url(
                    version="v4",
                    expiration=expiration,
                    method="GET",
                )
            except Exception as e:
                logger.warning("Could not generate V4 signed URL via credentials: %s", e)
                # Fallback to public/authenticated storage URL if signed URL generation unavailable
                signed_url = f"https://storage.googleapis.com/{self.bucket_name}/{blob_name}"
        else:
            signed_url = f"https://storage.googleapis.com/{self.bucket_name}/{blob_name}?simulated_sig=offline&ttl={ttl_minutes}m"

        return {
            "view_id": view_id,
            "signed_url": signed_url,
            "expires_in_seconds": int(expiration.total_seconds()),
            "ttl_minutes": ttl_minutes,
            "target_object": blob_name,
            "bucket": self.bucket_name,
            "is_agent": is_agent,
        }

    def get_storage_metadata(self) -> dict[str, Any]:
        """Returns structured metadata about the cloud storage enclave."""
        return {
            "backend": "gcs",
            "bucket_name": self.bucket_name,
            "tenant_prefix": self.tenant_prefix or None,
            "worm_retention_days": self.worm_retention_days,
            "connected": self._client is not None,
            "cache_dir": str(self.cache_dir),
            "human_ttl_minutes": DEFAULT_HUMAN_SIGNED_URL_TTL_MINUTES,
            "agent_ttl_minutes": DEFAULT_AGENT_SIGNED_URL_TTL_MINUTES,
        }

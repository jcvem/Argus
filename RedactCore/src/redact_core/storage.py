"""Storage manager for immutable original documents, derived views, and manifests."""

import json
import os
from pathlib import Path
from typing import Any
from redact_core.hashing import compute_sha256_bytes, compute_sha256_file
from redact_core.models import ViewManifest


DEFAULT_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


def get_default_data_dir() -> Path:
    """Returns the configured data directory from environment or default repo location."""
    env_dir = os.environ.get("REDACTCORE_STORAGE_DIR") or os.environ.get("REDACTCORE_DATA_DIR")
    if env_dir:
        return Path(env_dir)
    return DEFAULT_DATA_DIR


def is_storage_ephemeral(path: Path) -> bool:
    """Determines whether the given storage root is ephemeral (e.g. /tmp, container root)."""
    p_str = str(path.resolve())
    if p_str.startswith("/tmp") or p_str.startswith("/var/tmp") or "/tmp/" in p_str:
        return True
    if os.environ.get("REDACTCORE_STORAGE_EPHEMERAL", "").lower() in ("true", "1", "yes"):
        return True
    return False


class DocumentStore:
    """Manages immutable content-addressed storage for original documents,
    isolated derived views, and audit manifests.
    """

    def __init__(self, root_dir: Path | str | None = None):
        if root_dir is None:
            self.root_dir = get_default_data_dir()
        else:
            self.root_dir = Path(root_dir)

        self.is_ephemeral = is_storage_ephemeral(self.root_dir)
        self.originals_dir = self.root_dir / "originals"
        self.views_dir = self.root_dir / "views"
        self.manifests_dir = self.root_dir / "manifests"

        self.originals_dir.mkdir(parents=True, exist_ok=True)
        self.views_dir.mkdir(parents=True, exist_ok=True)
        self.manifests_dir.mkdir(parents=True, exist_ok=True)

    def store_original(self, data: bytes, extension: str) -> tuple[str, Path]:
        """Stores an immutable original document addressed by its SHA-256 hash.
        
        If the file already exists, confirms hash match and leaves it untouched.
        File permissions are set to read-only (0o444).
        """
        ext = extension.lstrip(".").lower()
        sha256_hash = compute_sha256_bytes(data)
        dest_path = self.originals_dir / f"{sha256_hash}.{ext}"

        if dest_path.exists():
            # Verify integrity of existing stored original
            existing_hash = compute_sha256_file(dest_path)
            if existing_hash != sha256_hash:
                raise ValueError(
                    f"Storage integrity violation: existing file {dest_path} hash {existing_hash} "
                    f"does not match expected hash {sha256_hash}"
                )
            return sha256_hash, dest_path

        # Write data to a temporary file, lock to read-only, and atomically place
        temp_path = self.originals_dir / f".tmp_{sha256_hash}.{ext}"
        try:
            temp_path.write_bytes(data)
            # Make read-only to enforce immutability at OS level
            os.chmod(temp_path, 0o444)
            temp_path.replace(dest_path)
        except Exception:
            if temp_path.exists():
                temp_path.unlink()
            raise

        return sha256_hash, dest_path

    def get_original_path(self, sha256_hash: str, extension: str) -> Path | None:
        """Locates an original document by hash. Returns None if not found."""
        ext = extension.lstrip(".").lower()
        path = self.originals_dir / f"{sha256_hash}.{ext}"
        if path.exists():
            return path
        return None

    def verify_original_unmodified(self, sha256_hash: str, extension: str) -> bool:
        """Verifies that the original file on disk matches its expected SHA-256 hash."""
        path = self.get_original_path(sha256_hash, extension)
        if not path or not path.exists():
            return False
        return compute_sha256_file(path) == sha256_hash

    def store_view(self, view_id: str, data: bytes, extension: str) -> tuple[str, Path]:
        """Stores a generated privacy-preserved derivative view."""
        ext = extension.lstrip(".").lower()
        dest_path = self.views_dir / f"{view_id}.{ext}"
        dest_path.write_bytes(data)
        output_hash = compute_sha256_bytes(data)
        return output_hash, dest_path

    def get_view_path(self, view_id: str, extension: str) -> Path | None:
        """Retrieves path to a derived view file."""
        ext = extension.lstrip(".").lower()
        path = self.views_dir / f"{view_id}.{ext}"
        if path.exists():
            return path
        return None

    def store_manifest(self, manifest: ViewManifest) -> Path:
        """Stores the view audit manifest as JSON."""
        dest_path = self.manifests_dir / f"{manifest.view_id}.json"
        content = json.dumps(manifest.model_dump(), indent=2)
        dest_path.write_text(content, encoding="utf-8")
        return dest_path

    def get_manifest(self, view_id: str) -> ViewManifest | None:
        """Retrieves and deserializes a stored audit manifest."""
        path = self.manifests_dir / f"{view_id}.json"
        if not path.exists():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        return ViewManifest(**data)

    def generate_signed_url(
        self,
        view_id: str,
        extension: str,
        role_id: str | None = None,
        is_agent: bool = False,
    ) -> dict[str, Any]:
        """Simulates or formats a local download endpoint response with TTL."""
        ttl_minutes = 10 if is_agent else 30
        return {
            "view_id": view_id,
            "signed_url": f"/api/views/{view_id}/download",
            "expires_in_seconds": ttl_minutes * 60,
            "ttl_minutes": ttl_minutes,
            "target_object": f"views/{view_id}.{extension.lstrip('.')}",
            "bucket": "local-filesystem",
            "is_agent": is_agent,
        }

    def get_storage_metadata(self) -> dict[str, Any]:
        """Returns structured metadata about local file storage."""
        return {
            "backend": "filesystem",
            "bucket_name": "local-filesystem",
            "tenant_prefix": None,
            "worm_retention_days": 365,
            "connected": True,
            "cache_dir": str(self.root_dir),
            "human_ttl_minutes": 30,
            "agent_ttl_minutes": 10,
        }


def get_document_store() -> DocumentStore | Any:
    """Factory creating configured DocumentStore or GCSDocumentStore."""
    backend = os.environ.get("REDACTCORE_STORAGE_BACKEND", "local").lower().strip()
    if backend == "gcs":
        try:
            from redact_core.storage_gcs import GCSDocumentStore
            return GCSDocumentStore()
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Failed to initialize GCSDocumentStore, falling back to local: %s", e)
    return DocumentStore()


# Global default store instance
default_store = get_document_store()


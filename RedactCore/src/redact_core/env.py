"""Environment loading utilities for Argus RedactCore.

Provides safe, optional loading of local .env files for developer workflows.
Production deployments should supply configuration via container environment
variables, secrets managers, or runtime platforms directly.

Security Guarantees:
- Secrets from .env are never logged, printed, or serialized.
- Existing environment variables are never overwritten.
- Missing or malformed .env files fail safely without crashing.
"""

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)


def load_env_safely(env_file_path: Path | str | None = None) -> bool:
    """Loads environment variables from a .env file if present.

    Returns True if an environment file was found and loaded, False otherwise.
    Never prints or logs secret keys or values.
    """
    target_path: Path | None = None

    if env_file_path:
        target_path = Path(env_file_path)
    else:
        # Check explicit environment override
        custom_env = os.environ.get("REDACTCORE_ENV_FILE")
        if custom_env:
            target_path = Path(custom_env)
        else:
            # Check current working directory
            cwd_env = Path.cwd() / ".env"
            if cwd_env.exists() and cwd_env.is_file():
                target_path = cwd_env
            else:
                # Check repo root
                repo_root_env = Path(__file__).resolve().parent.parent.parent / ".env"
                if repo_root_env.exists() and repo_root_env.is_file():
                    target_path = repo_root_env

    if not target_path or not target_path.exists() or not target_path.is_file():
        return False

    # Try python-dotenv if installed
    try:
        from dotenv import load_dotenv

        load_dotenv(dotenv_path=target_path, override=False)
        return True
    except ImportError:
        pass

    # Built-in lightweight fallback parser
    try:
        content = target_path.read_text(encoding="utf-8")
        for line in content.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, _, v = line.partition("=")
                key = k.strip()
                val = v.strip()
                if (val.startswith('"') and val.endswith('"')) or (
                    val.startswith("'") and val.endswith("'")
                ):
                    val = val[1:-1]
                if key and key not in os.environ:
                    os.environ[key] = val
        return True
    except Exception as e:
        logger.debug("Failed reading .env file: %s", type(e).__name__)
        return False

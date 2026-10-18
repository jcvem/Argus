import sys
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.generate_fixtures import main as generate_fixtures_main

FIXTURES_DIR = REPO_ROOT / "fixtures"


@pytest.fixture(scope="session", autouse=True)
def ensure_fixtures():
    """Ensure test fixtures exist deterministically before running test suite."""
    required_files = [
        FIXTURES_DIR / "sample_report.pdf",
        FIXTURES_DIR / "sample_report.docx",
        FIXTURES_DIR / "scanned_sample.pdf",
    ]
    if not all(p.exists() for p in required_files):
        generate_fixtures_main()


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from redact_core.api import app
    return TestClient(app)

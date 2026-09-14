"""Package entry point for `python -m redact_core`."""

import sys
from redact_core.cli import main

if __name__ == "__main__":
    sys.exit(main())

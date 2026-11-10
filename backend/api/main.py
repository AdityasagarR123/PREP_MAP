"""Alias module to ensure compatibility if Start Command is set to 'api.main:app'."""

import sys
from pathlib import Path

# Add backend directory to sys.path so loader and schemas can be imported
backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app  # noqa: F401, E402

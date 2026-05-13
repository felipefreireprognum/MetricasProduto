"""Compatibility entrypoint for local Uvicorn commands.

Keep supporting:
    uvicorn api:app --reload --port 8001

The actual FastAPI application lives in app/main.py.
"""

try:
    from app.main import app
except ModuleNotFoundError:
    from backend.app.main import app

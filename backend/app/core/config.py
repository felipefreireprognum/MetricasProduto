from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
CACHE_DIR = BACKEND_DIR / 'CONSULTAS'
CACHE_DIR.mkdir(exist_ok=True)


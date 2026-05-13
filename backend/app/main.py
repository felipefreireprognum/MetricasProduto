from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers.metrics import router as metrics_router


app = FastAPI(title="Metricas API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(metrics_router)
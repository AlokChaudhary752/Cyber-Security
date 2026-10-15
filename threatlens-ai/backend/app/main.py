import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.init_db import init_database
from app.api import auth, detector, telemetry
from app.services.ml_service import ml_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("threatlens")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing ThreatLens AI Backend Engine...")
    await init_database()
    logger.info("Machine Learning service status: Ready.")
    yield
    logger.info("Shutting down ThreatLens AI Backend...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-Grade AI Cybersecurity Operations Platform for Real-Time Network Anomaly Detection",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS configuration
origins = settings.get_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if "*" in origins else origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(detector.router, prefix=settings.API_V1_STR)
app.include_router(telemetry.router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "OPERATIONAL",
        "docs": "/docs",
        "ml_model_loaded": ml_service.is_loaded
    }


@app.get("/health")
async def health_check():
    return {
        "status": "HEALTHY",
        "service": "ThreatLens AI Engine",
        "ml_isolation_forest": "LOADED" if ml_service.is_loaded else "STANDBY"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl
from typing import List, Union
import json


class Settings(BaseSettings):
    PROJECT_NAME: str = "ThreatLens AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database - Default to self-contained SQLite with async support (or PostgreSQL via .env)
    DATABASE_URL: str = "sqlite+aiosqlite:///./threatlens.db"

    # JWT
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    # ML Model
    MODEL_PATH: str = "app/models/isolation_forest_final.pkl"
    SCALER_PATH: str = "app/models/if_scaler.pkl"
    ANOMALY_THRESHOLD: float = -0.1

    class Config:
        env_file = ".env"
        case_sensitive = True

    def get_cors_origins(self) -> List[str]:
        if isinstance(self.BACKEND_CORS_ORIGINS, str):
            try:
                return json.loads(self.BACKEND_CORS_ORIGINS)
            except Exception:
                return [self.BACKEND_CORS_ORIGINS]
        return self.BACKEND_CORS_ORIGINS


settings = Settings()

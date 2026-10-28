import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AICTE CASELINK"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./caselink.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "caselink-sih-2026-tech-spartans-secret-key-aicte-secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

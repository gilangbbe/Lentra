"""
Application Configuration

Centralized configuration management using Pydantic Settings.
All configuration values are loaded from environment variables
with sensible defaults for development.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    All settings can be overridden via .env file or environment variables.
    Variable names are case-insensitive and match the attribute names.
    """
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )
    
    # -------------------------------------------------------------------------
    # Application
    # -------------------------------------------------------------------------
    APP_NAME: str = "Lentra"
    APP_ENV: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    
    # -------------------------------------------------------------------------
    # Server
    # -------------------------------------------------------------------------
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    BACKEND_WORKERS: int = 1
    
    # -------------------------------------------------------------------------
    # CORS
    # -------------------------------------------------------------------------
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # -------------------------------------------------------------------------
    # Ollama
    # -------------------------------------------------------------------------
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_DEFAULT_MODEL: str = "llama3.1:8b"
    
    # -------------------------------------------------------------------------
    # RAG Configuration
    # -------------------------------------------------------------------------
    RAG_ENABLED: bool = True
    RAG_TOP_K: int = Field(default=5, ge=1, le=20)
    RAG_CHUNK_SIZE: int = Field(default=512, ge=100, le=2000)
    RAG_CHUNK_OVERLAP: int = Field(default=50, ge=0, le=500)
    
    # -------------------------------------------------------------------------
    # Vector Store
    # -------------------------------------------------------------------------
    VECTOR_STORE_TYPE: Literal["faiss", "chroma"] = "faiss"
    FAISS_INDEX_PATH: str = "./data/faiss_index"
    
    # -------------------------------------------------------------------------
    # Embedding
    # -------------------------------------------------------------------------
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    
    # -------------------------------------------------------------------------
    # Evaluation
    # -------------------------------------------------------------------------
    EVALUATION_MODE: Literal[
        "heuristic",
        "embedding_similarity", 
        "llm_judge",
        "human_vote",
        "ensemble"
    ] = "heuristic"
    
    # -------------------------------------------------------------------------
    # Security
    # -------------------------------------------------------------------------
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds
    
    # -------------------------------------------------------------------------
    # Telemetry
    # -------------------------------------------------------------------------
    TELEMETRY_ENABLED: bool = False
    
    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Warn if using default secret key in non-development environment."""
        # Note: In production, this should raise an error
        return v


@lru_cache
def get_settings() -> Settings:
    """
    Get cached settings instance.
    
    Returns:
        Settings: Application settings singleton.
    """
    return Settings()


# Global settings instance
settings = get_settings()

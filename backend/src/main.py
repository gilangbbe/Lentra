"""
Lentra Backend - Main Application Entry Point

This module initializes the FastAPI application with all routes,
middleware, and startup/shutdown handlers.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import evaluate, models, prompt, rag
from src.core.config import settings
from src.core.logging import get_logger, setup_logging

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan handler for startup and shutdown events.
    
    Startup:
        - Initialize logging
        - Warm up model connections
        - Initialize vector store
    
    Shutdown:
        - Cleanup resources
        - Close connections
    """
    # Startup
    setup_logging()
    logger.info(
        "Starting Lentra API",
        app_name=settings.APP_NAME,
        environment=settings.APP_ENV,
        debug=settings.DEBUG,
    )
    
    # TODO: Initialize model adapters
    # TODO: Initialize RAG engine if enabled
    
    yield
    
    # Shutdown
    logger.info("Shutting down Lentra API")
    # TODO: Cleanup resources


def create_app() -> FastAPI:
    """
    Application factory for creating the FastAPI instance.
    
    Returns:
        FastAPI: Configured application instance.
    """
    app = FastAPI(
        title=settings.APP_NAME,
        description="Local multi-model RAG playground with side-by-side evaluation",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Register routes
    app.include_router(prompt.router, tags=["Prompt"])
    app.include_router(models.router, prefix="/models", tags=["Models"])
    app.include_router(rag.router, prefix="/rag", tags=["RAG"])
    app.include_router(evaluate.router, tags=["Evaluation"])
    
    @app.get("/health", tags=["Health"])
    async def health_check() -> dict[str, str]:
        """Health check endpoint for monitoring."""
        return {"status": "healthy", "service": settings.APP_NAME}
    
    return app


# Create application instance
app = create_app()

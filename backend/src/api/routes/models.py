"""
Models Routes

Handles endpoints for listing and inspecting available models.
"""

from typing import Any

from fastapi import APIRouter, HTTPException

from src.core.logging import get_logger
from src.models.runner import ModelRunner
from src.schemas.model import ModelInfo, ModelListResponse

logger = get_logger(__name__)
router = APIRouter()


def get_model_runner() -> ModelRunner:
    """Get the model runner instance."""
    # Reuse the same pattern from prompt routes
    from src.api.routes.prompt import get_model_runner as _get_runner
    return _get_runner()


@router.get("", response_model=ModelListResponse)
async def list_models() -> ModelListResponse:
    """
    List all available models.
    
    Returns models from all configured backends (Ollama, llama.cpp, etc.)
    with their current status and capabilities.
    
    Returns:
        ModelListResponse: List of available models with metadata.
    """
    logger.info("Listing available models")

    runner = get_model_runner()
    models = await runner.list_available_models()

    logger.info("Models retrieved", count=len(models))

    return ModelListResponse(
        models=models,
        total=len(models),
    )


@router.get("/{model_id}", response_model=ModelInfo)
async def get_model(model_id: str) -> ModelInfo:
    """
    Get detailed information about a specific model.
    
    Includes model stats, character definition, and capabilities.
    
    Args:
        model_id: Unique model identifier.
    
    Returns:
        ModelInfo: Detailed model information.
    
    Raises:
        HTTPException: If model not found.
    """
    logger.info("Getting model info", model_id=model_id)

    runner = get_model_runner()
    model_info = await runner.get_model_info(model_id)

    if model_info is None:
        raise HTTPException(
            status_code=404,
            detail=f"Model '{model_id}' not found",
        )

    return model_info


@router.post("/{model_id}/load")
async def load_model(model_id: str) -> dict[str, str]:
    """
    Pre-load a model into memory.
    
    Useful for warming up models before use to reduce first-request latency.
    
    Args:
        model_id: Model to load.
    
    Returns:
        Status message.
    """
    logger.info("Loading model", model_id=model_id)

    runner = get_model_runner()

    try:
        await runner.load_model(model_id)
        return {"status": "loaded", "model_id": model_id}
    except Exception as e:
        logger.error("Failed to load model", model_id=model_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load model: {e}",
        )


@router.post("/{model_id}/unload")
async def unload_model(model_id: str) -> dict[str, str]:
    """
    Unload a model from memory.
    
    Frees up resources when a model is no longer needed.
    
    Args:
        model_id: Model to unload.
    
    Returns:
        Status message.
    """
    logger.info("Unloading model", model_id=model_id)

    runner = get_model_runner()

    try:
        await runner.unload_model(model_id)
        return {"status": "unloaded", "model_id": model_id}
    except Exception as e:
        logger.error("Failed to unload model", model_id=model_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to unload model: {e}",
        )


@router.post("/pull/{model_id:path}")
async def pull_model(model_id: str) -> dict[str, Any]:
    """
    Pull a model from the Ollama registry.
    
    Downloads the model if not already present.
    
    Args:
        model_id: Model to pull (e.g., 'llama3.2:latest').
    
    Returns:
        Status message with pull result.
    """
    logger.info("Pulling model", model_id=model_id)
    
    runner = get_model_runner()
    
    # Access the Ollama adapter directly for pull functionality
    adapter = runner._adapters.get("ollama")
    if not adapter:
        raise HTTPException(
            status_code=503,
            detail="Ollama backend not available",
        )
    
    try:
        success = await adapter.pull_model(model_id)
        if success:
            return {"status": "pulled", "model_id": model_id}
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to pull model: {model_id}",
            )
    except Exception as e:
        logger.error("Failed to pull model", model_id=model_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Failed to pull model: {e}",
        )


@router.get("/health")
async def models_health() -> dict[str, Any]:
    """
    Check health of model backends.
    
    Returns status of all configured backends.
    """
    runner = get_model_runner()
    backends = await runner.check_backends()
    
    all_healthy = all(backends.values())
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "backends": backends,
    }

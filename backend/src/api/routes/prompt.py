"""
Prompt Routes

Handles the main /prompt endpoint for submitting prompts
to multiple models simultaneously.
"""

import asyncio
import time

from fastapi import APIRouter, HTTPException

from src.core.logging import get_logger
from src.models.runner import ModelRunner
from src.schemas.prompt import PromptRequest, PromptResponse
from src.schemas.model import ModelResponse

logger = get_logger(__name__)
router = APIRouter()

# Model runner instance (initialized at startup)
_model_runner: ModelRunner | None = None


def get_model_runner() -> ModelRunner:
    """Get or create the model runner instance."""
    global _model_runner
    if _model_runner is None:
        _model_runner = ModelRunner()
    return _model_runner


@router.post("/prompt", response_model=PromptResponse)
async def submit_prompt(request: PromptRequest) -> PromptResponse:
    """
    Submit a prompt to one or more models.
    
    This endpoint is the core of Lentra's multi-model comparison feature.
    It sends the same prompt to multiple models in parallel and returns
    all responses for comparison.
    
    Args:
        request: Prompt request with model IDs and parameters.
    
    Returns:
        PromptResponse: Responses from all queried models.
    
    Raises:
        HTTPException: If no models are available or all fail.
    """
    start_time = time.perf_counter()
    logger.info(
        "Processing prompt request",
        prompt_length=len(request.prompt),
        model_count=len(request.model_ids),
        use_rag=request.use_rag,
    )
    
    runner = get_model_runner()
    
    # Get target models
    model_ids = request.model_ids
    if not model_ids:
        # Use all available models if none specified
        available = await runner.list_available_models()
        model_ids = [m.id for m in available]
        if not model_ids:
            raise HTTPException(
                status_code=503,
                detail="No models available. Ensure Ollama is running.",
            )
    
    # RAG context retrieval (if enabled)
    rag_context: str | None = None
    if request.use_rag:
        # TODO: Implement RAG retrieval
        # from src.rag.engine import RAGEngine
        # rag_engine = RAGEngine()
        # rag_result = await rag_engine.retrieve(request.prompt)
        # rag_context = rag_result.assembled_context
        logger.info("RAG enabled but not yet implemented")
    
    # Generate responses in parallel
    generation_params = request.params.model_dump()
    
    async def generate_for_model(model_id: str) -> ModelResponse | None:
        """Generate response for a single model."""
        try:
            return await runner.generate(
                model_id=model_id,
                prompt=request.prompt,
                context=rag_context,
                params=generation_params,
            )
        except Exception as e:
            logger.error(
                "Model generation failed",
                model_id=model_id,
                error=str(e),
            )
            return None
    
    # Run all generations in parallel
    tasks = [generate_for_model(mid) for mid in model_ids]
    results = await asyncio.gather(*tasks)
    
    # Filter out failed responses
    responses = [r for r in results if r is not None]
    
    if not responses:
        raise HTTPException(
            status_code=500,
            detail="All model generations failed.",
        )
    
    total_latency = (time.perf_counter() - start_time) * 1000
    
    logger.info(
        "Prompt request completed",
        response_count=len(responses),
        total_latency_ms=round(total_latency, 2),
    )
    
    return PromptResponse(
        prompt=request.prompt,
        responses=responses,
        rag_context=rag_context,
        total_latency_ms=total_latency,
    )

"""
Prompt Routes

Handles the main /prompt endpoint for submitting prompts
to multiple models simultaneously.
"""

import asyncio
import time

from fastapi import APIRouter, HTTPException

from src.core.config import settings
from src.core.logging import get_logger
from src.models.runner import ModelRunner
from src.rag.engine import get_rag_engine
from src.schemas.model import ModelResponse
from src.schemas.prompt import PromptRequest, PromptResponse

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


def build_prompt_with_context(
    user_prompt: str,
    context: str | None,
    system_prompt: str | None,
    instruction_prompt: str | None,
) -> str:
    """
    Build the final prompt with system prompt, context, and instruction.
    
    Args:
        user_prompt: The user's question/prompt.
        context: Retrieved RAG context or direct context.
        system_prompt: Optional system-level instructions.
        instruction_prompt: Optional template with placeholders.
    
    Returns:
        Complete prompt string for the model.
    """
    parts = []

    # Add system prompt if provided
    if system_prompt:
        parts.append(f"System: {system_prompt}\n")

    # Build the main content using instruction template or default
    if instruction_prompt and context:
        # Use custom instruction template with placeholders
        main_content = instruction_prompt
        main_content = main_content.replace("{context}", context)
        main_content = main_content.replace("{question}", user_prompt)
        parts.append(main_content)
    elif context:
        # Default RAG template
        parts.append(f"""Use the following context to answer the question. If the context doesn't contain relevant information, say so.

Context:
{context}

Question: {user_prompt}

Answer:""")
    else:
        # No context, just the user prompt
        parts.append(user_prompt)

    return "\n".join(parts)


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

    # Determine context: either from RAG retrieval or direct context_text
    rag_context: str | None = None
    retrieved_chunks: list = []

    if request.context_text:
        # Direct context provided (bypasses RAG)
        rag_context = request.context_text
        logger.info("Using direct context text", context_length=len(rag_context))
    elif request.use_rag and settings.RAG_ENABLED:
        # RAG retrieval
        try:
            rag_engine = get_rag_engine()
            rag_result = await rag_engine.retrieve(
                query=request.prompt,
                top_k=request.rag_params.top_k,
                collection=request.rag_params.collection,
                score_threshold=request.rag_params.score_threshold,
            )
            rag_context = rag_result.assembled_context
            retrieved_chunks = [
                {
                    "content": chunk.content[:200] + "..." if len(chunk.content) > 200 else chunk.content,
                    "score": chunk.score,
                    "source": chunk.metadata.get("source", "unknown"),
                }
                for chunk in rag_result.chunks
            ]
            logger.info(
                "RAG retrieval successful",
                chunks_retrieved=len(rag_result.chunks),
                latency_ms=rag_result.retrieval_latency_ms,
            )
        except Exception as e:
            logger.warning(
                "RAG retrieval failed, continuing without context",
                error=str(e),
            )
    elif request.use_rag:
        logger.warning("RAG requested but not enabled in configuration")

    # Build the final prompt with context and system/instruction prompts
    final_prompt = build_prompt_with_context(
        user_prompt=request.prompt,
        context=rag_context,
        system_prompt=request.system_prompt,
        instruction_prompt=request.instruction_prompt,
    )

    # Generate responses in parallel
    generation_params = request.params.model_dump()

    async def generate_for_model(model_id: str) -> ModelResponse | None:
        """Generate response for a single model."""
        try:
            return await runner.generate(
                model_id=model_id,
                prompt=final_prompt,
                context=None,  # Context already embedded in prompt
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

"""
Prompt Schemas

Request and response models for the /prompt endpoint.
"""

from pydantic import BaseModel, Field

from src.schemas.model import ModelResponse


class GenerationParams(BaseModel):
    """Parameters for text generation."""

    temperature: float = Field(
        default=0.7,
        ge=0.0,
        le=2.0,
        description="Sampling temperature. Higher = more random.",
    )
    max_tokens: int = Field(
        default=1024,
        ge=1,
        le=32768,
        description="Maximum tokens to generate.",
    )
    top_p: float = Field(
        default=0.9,
        ge=0.0,
        le=1.0,
        description="Nucleus sampling probability.",
    )
    top_k: int = Field(
        default=40,
        ge=1,
        le=100,
        description="Top-k sampling.",
    )
    stop: list[str] | None = Field(
        default=None,
        description="Stop sequences.",
    )
    repeat_penalty: float = Field(
        default=1.1,
        ge=1.0,
        le=2.0,
        description="Repetition penalty. Higher = less repetition.",
    )
    presence_penalty: float = Field(
        default=0.0,
        ge=-2.0,
        le=2.0,
        description="Presence penalty for new tokens.",
    )
    frequency_penalty: float = Field(
        default=0.0,
        ge=-2.0,
        le=2.0,
        description="Frequency penalty based on token count.",
    )


class RAGParams(BaseModel):
    """Parameters for RAG (Retrieval-Augmented Generation) behavior."""

    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of chunks to retrieve.",
    )
    score_threshold: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Minimum relevance score for chunks.",
    )
    collection: str | None = Field(
        default=None,
        description="Specific collection to search.",
    )
    include_sources: bool = Field(
        default=True,
        description="Whether to include source citations in context.",
    )
    context_template: str = Field(
        default="",
        description="Custom template for assembling context. Use {chunks} placeholder.",
    )


class PromptRequest(BaseModel):
    """
    Request body for submitting a prompt to multiple models.
    
    Example:
        {
            "prompt": "Explain quantum computing in simple terms",
            "model_ids": ["llama3.1:8b", "mistral:7b"],
            "use_rag": true,
            "system_prompt": "You are a helpful assistant.",
            "params": {"temperature": 0.7}
        }
    """

    prompt: str = Field(
        ...,
        min_length=1,
        max_length=32768,
        description="The user prompt/question to send to models.",
    )
    system_prompt: str | None = Field(
        default=None,
        description="System prompt to set model behavior and context.",
    )
    instruction_prompt: str | None = Field(
        default=None,
        description="Instruction template. Use {context} and {question} placeholders.",
    )
    model_ids: list[str] = Field(
        default_factory=list,
        description="List of model IDs to query. Empty = use all available.",
    )
    use_rag: bool = Field(
        default=False,
        description="Whether to use RAG for context retrieval.",
    )
    rag_params: RAGParams = Field(
        default_factory=RAGParams,
        description="RAG retrieval parameters.",
    )
    context_text: str | None = Field(
        default=None,
        description="Direct context text (bypasses RAG retrieval).",
    )
    params: GenerationParams = Field(
        default_factory=GenerationParams,
        description="Generation parameters.",
    )
    stream: bool = Field(
        default=False,
        description="Whether to stream responses.",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "prompt": "Explain quantum computing in simple terms",
                    "model_ids": ["llama3.1:8b"],
                    "use_rag": False,
                    "params": {"temperature": 0.7, "max_tokens": 512},
                }
            ]
        }
    }


class PromptResponse(BaseModel):
    """
    Response containing outputs from all queried models.
    
    Each model's response includes the generated text, latency,
    token count, and optional RAG context used.
    """

    prompt: str = Field(description="Original prompt submitted.")
    responses: list[ModelResponse] = Field(
        description="Responses from each model."
    )
    rag_context: str | None = Field(
        default=None,
        description="RAG context if used.",
    )
    total_latency_ms: float = Field(
        description="Total request latency in milliseconds."
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "prompt": "Explain quantum computing",
                    "responses": [
                        {
                            "model_id": "llama3.1:8b",
                            "text": "Quantum computing uses...",
                            "latency_ms": 1234.5,
                            "tokens": 128,
                        }
                    ],
                    "rag_context": None,
                    "total_latency_ms": 1250.0,
                }
            ]
        }
    }

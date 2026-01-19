"""
Model Schemas

Request and response models for the /models endpoints.
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ModelResponse(BaseModel):
    """
    Response from a single model generation.
    
    This is the normalized output format that all model adapters
    must return, regardless of the underlying backend.
    """
    
    model_id: str = Field(description="Unique identifier for the model.")
    text: str = Field(description="Generated text response.")
    latency_ms: float = Field(
        ge=0,
        description="Generation latency in milliseconds.",
    )
    tokens: int = Field(
        ge=0,
        description="Number of tokens generated.",
    )
    prompt_tokens: int | None = Field(
        default=None,
        description="Number of tokens in the prompt.",
    )
    finish_reason: Literal["stop", "length", "error"] | None = Field(
        default=None,
        description="Reason generation stopped.",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional model-specific metadata.",
    )


class ModelConfig(BaseModel):
    """
    Configuration for a model in the system.
    
    Defines which backend adapter to use and any model-specific settings.
    """
    
    id: str = Field(description="Unique model identifier.")
    backend: Literal["ollama", "llama_cpp", "huggingface", "text_gen_webui"] = Field(
        description="Backend adapter to use.",
    )
    name: str | None = Field(
        default=None,
        description="Human-readable model name.",
    )
    description: str | None = Field(
        default=None,
        description="Model description.",
    )
    parameters: dict[str, Any] = Field(
        default_factory=dict,
        description="Model-specific parameters.",
    )
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "llama3.1:8b",
                    "backend": "ollama",
                    "name": "LLaMA 3.1 8B",
                    "description": "Meta's LLaMA 3.1 8B parameter model",
                }
            ]
        }
    }


class CharacterVisual(BaseModel):
    """Visual configuration for model character representation."""
    
    type: Literal["2D", "2.5D", "3D"] = Field(
        default="2D",
        description="Visual rendering type.",
    )
    primary_color: str = Field(
        default="#4F8EF7",
        description="Primary character color (hex).",
    )
    aura: str | None = Field(
        default=None,
        description="Aura style.",
    )
    animation: str = Field(
        default="idle",
        description="Default animation state.",
    )
    avatar_url: str | None = Field(
        default=None,
        description="URL to avatar image.",
    )


class ModelCharacter(BaseModel):
    """
    Character definition for a model.
    
    Per architecture: visuals are metadata-driven, not hardcoded.
    UI must function without visuals.
    """
    
    name: str = Field(description="Character name.")
    traits: list[str] = Field(
        default_factory=list,
        description="Personality traits.",
    )
    visual: CharacterVisual = Field(
        default_factory=CharacterVisual,
        description="Visual configuration.",
    )


class ModelInfo(BaseModel):
    """
    Full model information including stats and character.
    
    Returned by GET /models/{id}.
    """
    
    id: str = Field(description="Unique model identifier.")
    backend: str = Field(description="Backend adapter name.")
    name: str = Field(description="Human-readable name.")
    description: str | None = Field(default=None)
    
    # Status
    available: bool = Field(
        default=True,
        description="Whether model is currently available.",
    )
    loaded: bool = Field(
        default=False,
        description="Whether model is loaded in memory.",
    )
    
    # Stats
    total_requests: int = Field(
        default=0,
        description="Total requests served.",
    )
    avg_latency_ms: float | None = Field(
        default=None,
        description="Average response latency.",
    )
    last_used: datetime | None = Field(
        default=None,
        description="Last usage timestamp.",
    )
    
    # Character
    character: ModelCharacter | None = Field(
        default=None,
        description="Character definition for UI.",
    )
    
    # Capabilities
    context_length: int = Field(
        default=4096,
        description="Maximum context length.",
    )
    supports_streaming: bool = Field(
        default=True,
        description="Whether streaming is supported.",
    )


class ModelListResponse(BaseModel):
    """Response for GET /models."""
    
    models: list[ModelInfo] = Field(description="Available models.")
    total: int = Field(description="Total model count.")

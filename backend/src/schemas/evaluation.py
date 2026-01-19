"""
Evaluation Schemas

Request and response models for the /evaluate endpoint.
"""

from typing import Any, Literal

from pydantic import BaseModel, Field

from src.schemas.model import ModelResponse


class EvaluationScore(BaseModel):
    """
    Scoring result for a single model response.
    
    Based on the architecture's evaluation schema:
    - relevance: How relevant to the prompt
    - clarity: How clear and well-structured
    - hallucination_risk: Likelihood of hallucination
    - final_score: Weighted overall score
    """

    model_id: str = Field(description="Model that generated the response.")
    relevance: float = Field(
        ge=0.0,
        le=1.0,
        description="Relevance score (0-1).",
    )
    clarity: float = Field(
        ge=0.0,
        le=1.0,
        description="Clarity score (0-1).",
    )
    hallucination_risk: float = Field(
        ge=0.0,
        le=1.0,
        description="Hallucination risk (0=safe, 1=high risk).",
    )
    final_score: float = Field(
        ge=0.0,
        le=1.0,
        description="Weighted final score (0-1).",
    )
    reasoning: str | None = Field(
        default=None,
        description="Explanation for the scores.",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional evaluation data.",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "model_id": "llama3.1:8b",
                    "relevance": 0.91,
                    "clarity": 0.87,
                    "hallucination_risk": 0.12,
                    "final_score": 0.88,
                    "reasoning": "Clear, relevant response with low hallucination indicators.",
                }
            ]
        }
    }


class EvaluateRequest(BaseModel):
    """
    Request to evaluate and compare model responses.
    
    Supports multiple evaluation modes per architecture:
    - heuristic: Length, structure, latency
    - embedding_similarity: Semantic relevance
    - llm_judge: Meta-model scoring
    - human_vote: Manual selection (returns prepared ballot)
    - ensemble: Merge multiple outputs
    """

    prompt: str = Field(description="Original prompt.")
    responses: list[ModelResponse] = Field(
        min_length=1,
        description="Model responses to evaluate.",
    )
    mode: Literal[
        "heuristic",
        "embedding_similarity",
        "llm_judge",
        "human_vote",
        "ensemble",
    ] = Field(
        default="heuristic",
        description="Evaluation strategy.",
    )
    reference_text: str | None = Field(
        default=None,
        description="Reference text for similarity comparison.",
    )
    weights: dict[str, float] | None = Field(
        default=None,
        description="Custom weights for scoring components.",
    )
    judge_model_id: str | None = Field(
        default=None,
        description="Model to use as judge (for llm_judge mode).",
    )


class EvaluateResponse(BaseModel):
    """Response from evaluation."""

    mode: str = Field(description="Evaluation mode used.")
    scores: list[EvaluationScore] = Field(
        description="Scores for each response."
    )
    winner: str | None = Field(
        default=None,
        description="Model ID with highest score.",
    )
    ranking: list[str] = Field(
        default_factory=list,
        description="Model IDs ranked by score.",
    )
    ensemble_output: str | None = Field(
        default=None,
        description="Merged output (for ensemble mode).",
    )
    evaluation_latency_ms: float = Field(
        description="Evaluation latency in milliseconds.",
    )


class HumanVoteBallot(BaseModel):
    """Ballot for human voting evaluation."""

    ballot_id: str = Field(description="Unique ballot identifier.")
    prompt: str = Field(description="Original prompt.")
    options: list[dict[str, str]] = Field(
        description="Anonymized response options.",
    )
    expires_at: str = Field(description="Ballot expiration timestamp.")


class HumanVoteSubmission(BaseModel):
    """Submission for human vote."""

    ballot_id: str = Field(description="Ballot identifier.")
    selected_option: int = Field(
        ge=0,
        description="Index of selected option.",
    )
    reasoning: str | None = Field(
        default=None,
        description="Optional reasoning for selection.",
    )

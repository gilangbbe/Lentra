"""
Comparator

Main evaluation orchestrator that determines which model response is "best".
Supports multiple evaluation strategies per architecture.
"""

from typing import Any, Literal

from src.core.config import settings
from src.core.logging import get_logger
from src.evaluation.strategies.embedding_similarity import EmbeddingSimilarityStrategy
from src.evaluation.strategies.ensemble import EnsembleStrategy
from src.evaluation.strategies.heuristic import HeuristicStrategy
from src.evaluation.strategies.llm_judge import LLMJudgeStrategy
from src.schemas.evaluation import EvaluationScore
from src.schemas.model import ModelResponse

logger = get_logger(__name__)

EvaluationMode = Literal[
    "heuristic",
    "embedding_similarity",
    "llm_judge",
    "human_vote",
    "ensemble",
]


class Comparator:
    """
    Response comparator for evaluating model outputs.
    
    Per architecture, evaluation modes include:
    - Heuristic: Length, structure, latency
    - Embedding Similarity: Semantic relevance
    - LLM-as-Judge: Meta-model scoring
    - Human Vote: Manual selection
    - Ensemble: Merge multiple outputs
    """

    def __init__(
        self,
        mode: EvaluationMode | None = None,
        judge_model: str | None = None,
    ) -> None:
        """
        Initialize the comparator.
        
        Args:
            mode: Evaluation mode to use. Defaults to config value.
            judge_model: Model ID for LLM-as-judge evaluation.
        """
        self._mode = mode or settings.EVALUATION_MODE
        self._judge_model = judge_model or settings.OLLAMA_DEFAULT_MODEL

        # Strategies (lazy-loaded)
        self._heuristic = HeuristicStrategy()
        self._embedding: EmbeddingSimilarityStrategy | None = None
        self._llm_judge: LLMJudgeStrategy | None = None
        self._ensemble: EnsembleStrategy | None = None

        logger.info("Comparator initialized", mode=self._mode)

    def _convert_to_dicts(
        self, responses: list[ModelResponse]
    ) -> list[dict[str, Any]]:
        """
        Convert ModelResponse objects to dictionaries for strategies.
        
        Args:
            responses: List of ModelResponse objects.
        
        Returns:
            List of dictionaries with response data.
        """
        return [
            {
                "model_id": r.model_id,
                "content": r.text,
                "latency": r.latency_ms / 1000 if r.latency_ms else 0,
                "tokens": r.tokens,
            }
            for r in responses
        ]

    async def evaluate(
        self,
        prompt: str,
        responses: list[ModelResponse],
        mode: EvaluationMode | None = None,
        reference: str | None = None,
        weights: dict[str, float] | None = None,
        judge_model: str | None = None,
    ) -> list[EvaluationScore]:
        """
        Evaluate a list of model responses.
        
        Args:
            prompt: Original prompt.
            responses: Model responses to evaluate.
            mode: Evaluation mode (overrides default).
            reference: Reference text / RAG context for similarity comparison.
            weights: Custom weights for scoring components.
            judge_model: Override judge model for LLM-as-judge.
        
        Returns:
            list[EvaluationScore]: Scores for each response.
        """
        eval_mode = mode or self._mode
        response_dicts = self._convert_to_dicts(responses)

        logger.info(
            "Evaluating responses",
            mode=eval_mode,
            response_count=len(responses),
        )

        if eval_mode == "heuristic":
            return self._heuristic.evaluate(
                prompt=prompt,
                responses=response_dicts,
                context=reference,
            )
        elif eval_mode == "embedding_similarity":
            return await self._evaluate_embedding(
                prompt=prompt,
                responses=response_dicts,
                context=reference,
            )
        elif eval_mode == "llm_judge":
            return await self._evaluate_llm_judge(
                prompt=prompt,
                responses=response_dicts,
                context=reference,
                judge_model=judge_model or self._judge_model,
            )
        elif eval_mode == "ensemble":
            return await self._evaluate_ensemble(
                prompt=prompt,
                responses=response_dicts,
                context=reference,
                weights=weights,
            )
        else:
            # Default to heuristic
            return self._heuristic.evaluate(
                prompt=prompt,
                responses=response_dicts,
                context=reference,
            )

    async def _evaluate_embedding(
        self,
        prompt: str,
        responses: list[dict[str, Any]],
        context: str | None = None,
    ) -> list[EvaluationScore]:
        """Embedding-based similarity evaluation."""
        if self._embedding is None:
            self._embedding = EmbeddingSimilarityStrategy()
            await self._embedding.initialize()

        return await self._embedding.evaluate(prompt, responses, context)

    async def _evaluate_llm_judge(
        self,
        prompt: str,
        responses: list[dict[str, Any]],
        context: str | None = None,
        judge_model: str | None = None,
    ) -> list[EvaluationScore]:
        """LLM-as-judge evaluation."""
        if self._llm_judge is None:
            self._llm_judge = LLMJudgeStrategy(judge_model=judge_model)
            await self._llm_judge.initialize()

        return await self._llm_judge.evaluate(
            prompt, responses, context, judge_model=judge_model
        )

    async def _evaluate_ensemble(
        self,
        prompt: str,
        responses: list[dict[str, Any]],
        context: str | None = None,
        weights: dict[str, float] | None = None,
    ) -> list[EvaluationScore]:
        """Ensemble evaluation combining multiple strategies."""
        if self._ensemble is None:
            # By default, use heuristic + embedding (no LLM judge for speed)
            self._ensemble = EnsembleStrategy(
                use_llm_judge=False,
                weights=weights,
            )
            await self._ensemble.initialize()

        return await self._ensemble.evaluate(prompt, responses, context)
        """
        Get the model ID with the highest score.
        
        Args:
            scores: Evaluation scores.
        
        Returns:
            str or None: Winner model ID.
        """
        if not scores:
            return None

        sorted_scores = sorted(
            scores,
            key=lambda s: s.final_score,
            reverse=True,
        )
        return sorted_scores[0].model_id

    def get_ranking(self, scores: list[EvaluationScore]) -> list[str]:
        """
        Get model IDs ranked by score.
        
        Args:
            scores: Evaluation scores.
        
        Returns:
            list[str]: Model IDs in rank order.
        """
        sorted_scores = sorted(
            scores,
            key=lambda s: s.final_score,
            reverse=True,
        )
        return [s.model_id for s in sorted_scores]

"""
Comparator

Main evaluation orchestrator that determines which model response is "best".
Supports multiple evaluation strategies per architecture.
"""

from typing import Literal

from src.core.config import settings
from src.core.logging import get_logger
from src.evaluation.strategies.heuristic import HeuristicStrategy
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

    def __init__(self, mode: EvaluationMode | None = None) -> None:
        """
        Initialize the comparator.
        
        Args:
            mode: Evaluation mode to use. Defaults to config value.
        """
        self._mode = mode or settings.EVALUATION_MODE
        self._heuristic = HeuristicStrategy()

        logger.info("Comparator initialized", mode=self._mode)

    async def evaluate(
        self,
        prompt: str,
        responses: list[ModelResponse],
        mode: EvaluationMode | None = None,
        reference: str | None = None,
        weights: dict[str, float] | None = None,
    ) -> list[EvaluationScore]:
        """
        Evaluate a list of model responses.
        
        Args:
            prompt: Original prompt.
            responses: Model responses to evaluate.
            mode: Evaluation mode (overrides default).
            reference: Reference text for similarity comparison.
            weights: Custom weights for scoring components.
        
        Returns:
            list[EvaluationScore]: Scores for each response.
        """
        eval_mode = mode or self._mode

        logger.info(
            "Evaluating responses",
            mode=eval_mode,
            response_count=len(responses),
        )

        if eval_mode == "heuristic":
            return await self._heuristic.evaluate(
                prompt=prompt,
                responses=responses,
                weights=weights,
            )
        elif eval_mode == "embedding_similarity":
            return await self._evaluate_embedding(
                prompt=prompt,
                responses=responses,
                reference=reference,
            )
        elif eval_mode == "llm_judge":
            return await self._evaluate_llm_judge(
                prompt=prompt,
                responses=responses,
            )
        elif eval_mode == "ensemble":
            return await self._heuristic.evaluate(
                prompt=prompt,
                responses=responses,
                weights=weights,
            )
        else:
            # Default to heuristic
            return await self._heuristic.evaluate(
                prompt=prompt,
                responses=responses,
                weights=weights,
            )

    async def _evaluate_embedding(
        self,
        prompt: str,
        responses: list[ModelResponse],
        reference: str | None = None,
    ) -> list[EvaluationScore]:
        """Embedding-based similarity evaluation."""
        # TODO: Implement embedding comparison
        logger.warning("Embedding evaluation not implemented, using heuristic")
        return await self._heuristic.evaluate(prompt, responses)

    async def _evaluate_llm_judge(
        self,
        prompt: str,
        responses: list[ModelResponse],
    ) -> list[EvaluationScore]:
        """LLM-as-judge evaluation."""
        # TODO: Implement LLM judge
        logger.warning("LLM judge not implemented, using heuristic")
        return await self._heuristic.evaluate(prompt, responses)

    def get_winner(self, scores: list[EvaluationScore]) -> str | None:
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

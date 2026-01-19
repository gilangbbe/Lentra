"""
Ensemble Evaluation Strategy

Combines multiple evaluation strategies (heuristic, embedding similarity,
and optionally LLM-as-judge) into a weighted ensemble for robust scoring.
"""

from typing import Any

from src.core.config import settings
from src.core.logging import get_logger
from src.evaluation.strategies.embedding_similarity import EmbeddingSimilarityStrategy
from src.evaluation.strategies.heuristic import HeuristicStrategy
from src.evaluation.strategies.llm_judge import LLMJudgeStrategy
from src.models.runner import ModelRunner
from src.schemas.evaluation import EvaluationScore

logger = get_logger(__name__)


class EnsembleStrategy:
    """
    Ensemble evaluation strategy that combines multiple evaluation methods.
    
    This strategy provides the most robust evaluation by combining:
    - Heuristic scoring (fast, no model calls)
    - Embedding similarity (semantic relevance)
    - LLM-as-Judge (optional, for nuanced evaluation)
    
    The scores are combined using configurable weights.
    
    Per architecture, this is the "Ensemble" evaluation mode.
    """

    def __init__(
        self,
        use_llm_judge: bool = False,
        judge_model: str | None = None,
        weights: dict[str, float] | None = None,
        runner: ModelRunner | None = None,
    ) -> None:
        """
        Initialize the ensemble strategy.
        
        Args:
            use_llm_judge: Whether to include LLM-as-judge in ensemble.
            judge_model: Model ID for LLM judge.
            weights: Custom weights for each strategy. Keys: 'heuristic',
                     'embedding', 'llm_judge'. Defaults to equal weights.
            runner: ModelRunner instance for LLM judge.
        """
        self._use_llm_judge = use_llm_judge
        self._judge_model = judge_model or settings.OLLAMA_DEFAULT_MODEL
        self._runner = runner

        # Default weights
        if weights:
            self._weights = weights
        elif use_llm_judge:
            self._weights = {
                "heuristic": 0.2,
                "embedding": 0.3,
                "llm_judge": 0.5,
            }
        else:
            self._weights = {
                "heuristic": 0.4,
                "embedding": 0.6,
            }

        # Strategies (lazy-loaded)
        self._heuristic: HeuristicStrategy | None = None
        self._embedding: EmbeddingSimilarityStrategy | None = None
        self._llm_judge: LLMJudgeStrategy | None = None

        self._initialized = False

        logger.info(
            "Ensemble strategy created",
            use_llm_judge=use_llm_judge,
            weights=self._weights,
        )

    async def initialize(self) -> None:
        """Initialize all component strategies."""
        if self._initialized:
            return

        # Initialize heuristic (always used)
        self._heuristic = HeuristicStrategy()

        # Initialize embedding similarity
        self._embedding = EmbeddingSimilarityStrategy()
        await self._embedding.initialize()

        # Initialize LLM judge if enabled
        if self._use_llm_judge:
            self._llm_judge = LLMJudgeStrategy(
                judge_model=self._judge_model,
                runner=self._runner,
            )
            await self._llm_judge.initialize()

        self._initialized = True
        logger.info("Ensemble strategy initialized")

    async def evaluate(
        self,
        prompt: str,
        responses: list[dict[str, Any]],
        context: str | None = None,
    ) -> list[EvaluationScore]:
        """
        Evaluate responses using the ensemble of strategies.
        
        Args:
            prompt: The user's original prompt/query.
            responses: List of responses with 'model_id', 'content', 'latency'.
            context: Optional RAG context used in generation.
        
        Returns:
            List of EvaluationScore objects for each response.
        """
        if not self._initialized:
            await self.initialize()

        if not responses:
            return []

        # Run all strategies
        heuristic_scores = self._heuristic.evaluate(prompt, responses, context)
        embedding_scores = await self._embedding.evaluate(prompt, responses, context)

        llm_judge_scores = None
        if self._use_llm_judge and self._llm_judge:
            llm_judge_scores = await self._llm_judge.evaluate(
                prompt, responses, context
            )

        # Combine scores for each response
        combined_scores = []
        for i, response in enumerate(responses):
            model_id = response.get("model_id", f"model_{i}")

            h_score = heuristic_scores[i] if i < len(heuristic_scores) else None
            e_score = embedding_scores[i] if i < len(embedding_scores) else None
            j_score = (
                llm_judge_scores[i]
                if llm_judge_scores and i < len(llm_judge_scores)
                else None
            )

            # Combine component scores
            relevance = self._weighted_average(
                [
                    (h_score.relevance if h_score else 0.5, "heuristic"),
                    (e_score.relevance if e_score else 0.5, "embedding"),
                    (j_score.relevance if j_score else None, "llm_judge"),
                ]
            )

            clarity = self._weighted_average(
                [
                    (h_score.clarity if h_score else 0.5, "heuristic"),
                    (e_score.clarity if e_score else 0.5, "embedding"),
                    (j_score.clarity if j_score else None, "llm_judge"),
                ]
            )

            hallucination_risk = self._weighted_average(
                [
                    (
                        h_score.hallucination_risk if h_score else 0.5,
                        "heuristic",
                    ),
                    (
                        e_score.hallucination_risk if e_score else 0.5,
                        "embedding",
                    ),
                    (
                        j_score.hallucination_risk if j_score else None,
                        "llm_judge",
                    ),
                ]
            )

            # Compute final score
            final_score = self._compute_final_score(
                relevance, clarity, hallucination_risk
            )

            # Generate combined reasoning
            reasoning = self._generate_reasoning(
                h_score, e_score, j_score, relevance, clarity, hallucination_risk
            )

            combined_scores.append(
                EvaluationScore(
                    model_id=model_id,
                    relevance=round(relevance, 4),
                    clarity=round(clarity, 4),
                    hallucination_risk=round(hallucination_risk, 4),
                    final_score=round(final_score, 4),
                    reasoning=reasoning,
                    metadata={
                        "strategy": "ensemble",
                        "weights": self._weights,
                        "used_llm_judge": self._use_llm_judge,
                        "heuristic_score": h_score.final_score if h_score else None,
                        "embedding_score": e_score.final_score if e_score else None,
                        "llm_judge_score": j_score.final_score if j_score else None,
                        "response_length": len(response.get("content", "")),
                    },
                )
            )

        logger.debug(
            "Ensemble evaluation complete",
            num_responses=len(responses),
            used_llm_judge=self._use_llm_judge,
        )

        return combined_scores

    def _weighted_average(
        self, values_with_strategy: list[tuple[float | None, str]]
    ) -> float:
        """
        Compute weighted average, handling None values.
        
        Args:
            values_with_strategy: List of (value, strategy_name) tuples.
        
        Returns:
            Weighted average of non-None values.
        """
        total_weight = 0.0
        weighted_sum = 0.0

        for value, strategy in values_with_strategy:
            if value is not None:
                weight = self._weights.get(strategy, 0.0)
                weighted_sum += value * weight
                total_weight += weight

        if total_weight == 0:
            return 0.5  # Default

        return weighted_sum / total_weight

    def _compute_final_score(
        self, relevance: float, clarity: float, hallucination_risk: float
    ) -> float:
        """
        Compute final score from component scores.
        
        Args:
            relevance: Relevance score.
            clarity: Clarity score.
            hallucination_risk: Hallucination risk score.
        
        Returns:
            Final composite score in range [0, 1].
        """
        score = (
            0.45 * relevance
            + 0.30 * clarity
            + 0.25 * (1.0 - hallucination_risk)
        )
        return max(0.0, min(1.0, score))

    def _generate_reasoning(
        self,
        h_score: EvaluationScore | None,
        e_score: EvaluationScore | None,
        j_score: EvaluationScore | None,
        relevance: float,
        clarity: float,
        hallucination_risk: float,
    ) -> str:
        """
        Generate combined reasoning from all strategies.
        
        Args:
            h_score: Heuristic evaluation score.
            e_score: Embedding evaluation score.
            j_score: LLM judge evaluation score.
            relevance: Combined relevance score.
            clarity: Combined clarity score.
            hallucination_risk: Combined hallucination risk.
        
        Returns:
            Combined reasoning string.
        """
        parts = []

        # Summary assessment
        if relevance >= 0.75:
            parts.append("Strong relevance")
        elif relevance >= 0.5:
            parts.append("Moderate relevance")
        else:
            parts.append("Limited relevance")

        if clarity >= 0.75:
            parts.append("well-structured")
        elif clarity >= 0.5:
            parts.append("reasonably clear")
        else:
            parts.append("could be clearer")

        if hallucination_risk <= 0.25:
            parts.append("low hallucination risk")
        elif hallucination_risk <= 0.5:
            parts.append("some uncertainty")
        else:
            parts.append("potential hallucination concerns")

        # Include component strategy insights
        insights = []
        if h_score and h_score.reasoning:
            insights.append(f"Heuristic: {h_score.final_score:.2f}")
        if e_score and e_score.reasoning:
            insights.append(f"Semantic: {e_score.final_score:.2f}")
        if j_score and j_score.reasoning:
            insights.append(f"Judge: {j_score.final_score:.2f}")

        result = "; ".join(parts) + "."
        if insights:
            result += f" ({', '.join(insights)})"

        return result

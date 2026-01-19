"""
Heuristic Evaluation Strategy

Fast evaluation based on structural and lexical features.
No additional models required.
"""

from src.core.logging import get_logger
from src.schemas.evaluation import EvaluationScore
from src.schemas.model import ModelResponse

logger = get_logger(__name__)


class HeuristicStrategy:
    """
    Heuristic-based evaluation strategy.
    
    Per architecture, this evaluates based on:
    - Length and structure
    - Latency
    - Keyword overlap with prompt
    
    This is the fastest evaluation method as it requires
    no external model calls.
    """

    def __init__(self) -> None:
        """Initialize the heuristic strategy."""
        self._default_weights = {
            "relevance": 0.40,
            "clarity": 0.30,
            "hallucination": 0.30,
        }

    def evaluate(
        self,
        prompt: str,
        responses: list[dict],
        context: str | None = None,
        weights: dict[str, float] | None = None,
    ) -> list[EvaluationScore]:
        """
        Evaluate responses using heuristics.
        
        Args:
            prompt: Original prompt.
            responses: Responses to evaluate (as dicts with 'content', 'model_id', 'latency').
            context: Optional RAG context (unused in heuristic evaluation).
            weights: Custom weights for scoring components.
        
        Returns:
            list[EvaluationScore]: Scores for each response.
        """
        weights = weights or self._default_weights
        scores = []

        for i, response in enumerate(responses):
            model_id = response.get("model_id", f"model_{i}")
            text = response.get("content", "")
            latency_ms = response.get("latency", 0) * 1000  # Convert seconds to ms
            
            score = self._evaluate_single_dict(prompt, model_id, text, latency_ms, weights)
            scores.append(score)

        return scores

    def _evaluate_single_dict(
        self,
        prompt: str,
        model_id: str,
        text: str,
        latency_ms: float,
        weights: dict[str, float],
    ) -> EvaluationScore:
        """
        Evaluate a single response from dict format.
        
        Args:
            prompt: Original prompt.
            model_id: Model identifier.
            text: Response text.
            latency_ms: Response latency in milliseconds.
            weights: Scoring weights.
        
        Returns:
            EvaluationScore: Evaluation result.
        """
        # Calculate individual scores
        relevance = self._calculate_relevance(prompt, text)
        clarity = self._calculate_clarity(text)
        hallucination_risk = self._calculate_hallucination_risk(
            latency_ms,
            len(text),
        )

        # Calculate weighted final score
        final_score = (
            relevance * weights.get("relevance", 0.4) +
            clarity * weights.get("clarity", 0.3) +
            (1 - hallucination_risk) * weights.get("hallucination", 0.3)
        )

        return EvaluationScore(
            model_id=model_id,
            relevance=round(relevance, 3),
            clarity=round(clarity, 3),
            hallucination_risk=round(hallucination_risk, 3),
            final_score=round(final_score, 3),
            reasoning=self._generate_reasoning(
                relevance, clarity, hallucination_risk
            ),
            metadata={
                "strategy": "heuristic",
                "weights": weights,
                "text_length": len(text),
                "latency_ms": latency_ms,
            },
        )

    def _evaluate_single(
        self,
        prompt: str,
        response: ModelResponse,
        weights: dict[str, float],
    ) -> EvaluationScore:
        """
        Evaluate a single response (legacy method for backward compatibility).
        
        Args:
            prompt: Original prompt.
            response: Response to evaluate.
            weights: Scoring weights.
        
        Returns:
            EvaluationScore: Evaluation result.
        """
        return self._evaluate_single_dict(
            prompt,
            response.model_id,
            response.text,
            response.latency_ms,
            weights,
        )

    def _calculate_relevance(self, prompt: str, text: str) -> float:
        """
        Calculate relevance score based on keyword overlap.
        
        Args:
            prompt: Original prompt.
            text: Response text.
        
        Returns:
            float: Relevance score (0-1).
        """
        # Extract meaningful words (simple approach)
        def extract_words(s: str) -> set[str]:
            words = s.lower().split()
            # Filter short words and common stopwords
            stopwords = {
                "the", "a", "an", "is", "are", "was", "were",
                "be", "been", "being", "have", "has", "had",
                "do", "does", "did", "will", "would", "could",
                "should", "may", "might", "can", "to", "of",
                "in", "for", "on", "with", "at", "by", "from",
                "as", "it", "that", "this", "these", "those",
            }
            return {w for w in words if len(w) > 2 and w not in stopwords}

        prompt_words = extract_words(prompt)
        response_words = extract_words(text)

        if not prompt_words:
            return 0.5  # Neutral if no meaningful words in prompt

        overlap = len(prompt_words & response_words)
        coverage = overlap / len(prompt_words)

        # Scale and cap at 1.0
        return min(1.0, coverage * 1.5)

    def _calculate_clarity(self, text: str) -> float:
        """
        Calculate clarity score based on structure.
        
        Args:
            text: Response text.
        
        Returns:
            float: Clarity score (0-1).
        """
        if not text:
            return 0.0

        # Count sentences
        sentence_endings = text.count(".") + text.count("!") + text.count("?")
        sentence_count = max(1, sentence_endings)

        # Calculate average sentence length
        word_count = len(text.split())
        avg_sentence_length = word_count / sentence_count

        # Optimal sentence length is around 15-20 words
        # Score decreases as we deviate from this
        optimal = 17
        deviation = abs(avg_sentence_length - optimal)
        sentence_score = max(0.0, 1.0 - (deviation / 30))

        # Check for paragraph structure
        paragraphs = text.count("\n\n")
        has_structure = paragraphs > 0 or sentence_count > 1
        structure_bonus = 0.1 if has_structure else 0.0

        # Check for formatting (lists, etc.)
        has_formatting = any(
            marker in text
            for marker in ["- ", "* ", "1.", "2.", "•"]
        )
        format_bonus = 0.1 if has_formatting else 0.0

        clarity = min(1.0, sentence_score + structure_bonus + format_bonus)
        return clarity

    def _calculate_hallucination_risk(
        self,
        latency_ms: float,
        text_length: int,
    ) -> float:
        """
        Estimate hallucination risk.
        
        This is a rough heuristic:
        - Very fast responses for long text might indicate retrieval
        - Very slow responses might indicate struggling/uncertain model
        
        Args:
            latency_ms: Response latency.
            text_length: Response length.
        
        Returns:
            float: Hallucination risk (0-1).
        """
        if text_length == 0:
            return 1.0  # Empty response = high risk

        # Characters per millisecond
        speed = text_length / max(latency_ms, 1)

        # Suspiciously fast (> 10 chars/ms) or slow (< 0.1 chars/ms)
        if speed > 10:
            return 0.3  # Fast might be cached/memorized
        elif speed < 0.1:
            return 0.4  # Slow might indicate uncertainty
        else:
            return 0.2  # Normal speed = lower risk

    def _generate_reasoning(
        self,
        relevance: float,
        clarity: float,
        hallucination_risk: float,
    ) -> str:
        """
        Generate human-readable reasoning for the scores.
        
        Args:
            relevance: Relevance score.
            clarity: Clarity score.
            hallucination_risk: Hallucination risk.
        
        Returns:
            str: Reasoning text.
        """
        parts = []

        if relevance >= 0.8:
            parts.append("High relevance to prompt")
        elif relevance >= 0.5:
            parts.append("Moderate relevance")
        else:
            parts.append("Low relevance to prompt")

        if clarity >= 0.8:
            parts.append("well-structured response")
        elif clarity >= 0.5:
            parts.append("acceptable structure")
        else:
            parts.append("poor structure")

        if hallucination_risk <= 0.2:
            parts.append("low hallucination risk")
        elif hallucination_risk <= 0.4:
            parts.append("moderate hallucination risk")
        else:
            parts.append("elevated hallucination risk")

        return "; ".join(parts) + "."

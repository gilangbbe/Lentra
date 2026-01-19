"""
Embedding Similarity Evaluation Strategy

Evaluates responses based on semantic similarity to the prompt
using vector embeddings and cosine similarity.
"""

import asyncio
from typing import Any

import numpy as np

from src.core.config import settings
from src.core.logging import get_logger
from src.rag.embeddings import EmbeddingService
from src.schemas.evaluation import EvaluationScore

logger = get_logger(__name__)


class EmbeddingSimilarityStrategy:
    """
    Embedding-based evaluation strategy.
    
    Uses sentence-transformers to compute semantic similarity between
    the prompt and each response. Higher similarity indicates better
    relevance to the user's query.
    
    Per architecture, this is the "Semantic relevance" evaluation mode.
    """

    def __init__(self, model_name: str | None = None) -> None:
        """
        Initialize the embedding similarity strategy.
        
        Args:
            model_name: Embedding model to use (defaults to config).
        """
        self._embedder: EmbeddingService | None = None
        self._model_name = model_name or settings.EMBEDDING_MODEL
        self._initialized = False

        logger.info(
            "Embedding similarity strategy created",
            model=self._model_name,
        )

    async def initialize(self) -> None:
        """Initialize the embedding service."""
        if self._initialized:
            return

        self._embedder = EmbeddingService(model_name=self._model_name)
        await self._embedder.initialize()
        self._initialized = True

        logger.info("Embedding similarity strategy initialized")

    async def evaluate(
        self,
        prompt: str,
        responses: list[dict[str, Any]],
        context: str | None = None,
    ) -> list[EvaluationScore]:
        """
        Evaluate responses using embedding similarity.
        
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

        scores = []

        # Extract response texts
        response_texts = [r.get("content", "") for r in responses]

        # Compute embeddings for prompt and all responses in batch
        all_texts = [prompt] + response_texts
        if context:
            all_texts.append(context)

        embeddings = await self._embedder.embed(all_texts)

        prompt_embedding = embeddings[0]
        response_embeddings = embeddings[1 : len(responses) + 1]
        context_embedding = embeddings[-1] if context else None

        for i, response in enumerate(responses):
            response_embedding = response_embeddings[i]
            response_text = response_texts[i]

            # Calculate semantic relevance (cosine similarity to prompt)
            relevance = self._cosine_similarity(prompt_embedding, response_embedding)

            # Calculate context alignment if context provided
            if context_embedding is not None:
                context_similarity = self._cosine_similarity(
                    context_embedding, response_embedding
                )
                # Blend relevance with context alignment
                relevance = 0.6 * relevance + 0.4 * context_similarity

            # Calculate clarity (based on embedding norm and response structure)
            clarity = self._calculate_clarity(response_embedding, response_text)

            # Calculate hallucination risk (lower similarity = higher risk)
            hallucination_risk = self._calculate_hallucination_risk(
                prompt_embedding,
                response_embedding,
                context_embedding,
                response.get("latency", 0),
            )

            # Compute final score
            final_score = self._compute_final_score(
                relevance, clarity, hallucination_risk
            )

            # Generate reasoning
            reasoning = self._generate_reasoning(
                relevance, clarity, hallucination_risk, context is not None
            )

            scores.append(
                EvaluationScore(
                    model_id=response.get("model_id", f"model_{i}"),
                    relevance=round(relevance, 4),
                    clarity=round(clarity, 4),
                    hallucination_risk=round(hallucination_risk, 4),
                    final_score=round(final_score, 4),
                    reasoning=reasoning,
                    metadata={
                        "strategy": "embedding_similarity",
                        "embedding_model": self._model_name,
                        "has_context": context is not None,
                        "response_length": len(response_text),
                    },
                )
            )

        logger.debug(
            "Embedding similarity evaluation complete",
            num_responses=len(responses),
        )

        return scores

    def _cosine_similarity(
        self, vec1: np.ndarray, vec2: np.ndarray
    ) -> float:
        """
        Compute cosine similarity between two vectors.
        
        Args:
            vec1: First vector.
            vec2: Second vector.
        
        Returns:
            Cosine similarity in range [0, 1].
        """
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        similarity = np.dot(vec1, vec2) / (norm1 * norm2)
        # Normalize from [-1, 1] to [0, 1]
        return float((similarity + 1) / 2)

    def _calculate_clarity(
        self, embedding: np.ndarray, text: str
    ) -> float:
        """
        Calculate clarity score based on embedding characteristics.
        
        Higher embedding norm often correlates with more coherent,
        well-structured text.
        
        Args:
            embedding: Response embedding vector.
            text: Response text.
        
        Returns:
            Clarity score in range [0, 1].
        """
        # Embedding norm as a proxy for semantic density
        norm = np.linalg.norm(embedding)
        # Normalize norm (typical range 0.5-2.0 for sentence-transformers)
        norm_score = min(1.0, norm / 1.5)

        # Text structure analysis
        sentences = text.split(".")
        sentences = [s.strip() for s in sentences if s.strip()]
        num_sentences = len(sentences)

        # Penalize very short or very long responses
        if num_sentences == 0:
            length_score = 0.1
        elif num_sentences < 2:
            length_score = 0.5
        elif num_sentences < 10:
            length_score = 1.0
        else:
            length_score = max(0.5, 1.0 - (num_sentences - 10) * 0.02)

        # Check for formatting markers (lists, headers, etc.)
        format_bonus = 0
        if "- " in text or "* " in text:
            format_bonus += 0.05
        if ":" in text:
            format_bonus += 0.03
        if any(char.isdigit() and ". " in text for char in text[:100]):
            format_bonus += 0.05

        clarity = 0.4 * norm_score + 0.5 * length_score + min(0.1, format_bonus)
        return max(0.0, min(1.0, clarity))

    def _calculate_hallucination_risk(
        self,
        prompt_embedding: np.ndarray,
        response_embedding: np.ndarray,
        context_embedding: np.ndarray | None,
        latency: float,
    ) -> float:
        """
        Estimate hallucination risk based on semantic divergence.
        
        High divergence from prompt and context suggests potential
        hallucination. Very fast responses may also be risky.
        
        Args:
            prompt_embedding: Prompt embedding.
            response_embedding: Response embedding.
            context_embedding: Optional context embedding.
            latency: Response latency in seconds.
        
        Returns:
            Hallucination risk score in range [0, 1].
        """
        # Base risk from prompt divergence
        prompt_similarity = self._cosine_similarity(
            prompt_embedding, response_embedding
        )
        divergence_risk = 1.0 - prompt_similarity

        # Context divergence risk
        if context_embedding is not None:
            context_similarity = self._cosine_similarity(
                context_embedding, response_embedding
            )
            context_risk = 1.0 - context_similarity
            # If response diverges from both prompt and context, higher risk
            divergence_risk = 0.5 * divergence_risk + 0.5 * context_risk

        # Latency-based risk (very fast = possibly canned, very slow = complex)
        if latency < 0.5:
            latency_risk = 0.1  # Very fast might be cached/templated
        elif latency > 30:
            latency_risk = 0.3  # Very slow might indicate uncertainty
        else:
            latency_risk = 0.0

        # Combine risks
        hallucination_risk = 0.8 * divergence_risk + 0.2 * latency_risk

        return max(0.0, min(1.0, hallucination_risk))

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
        # Weighted combination
        # Relevance is most important for semantic evaluation
        score = (
            0.50 * relevance
            + 0.30 * clarity
            + 0.20 * (1.0 - hallucination_risk)
        )
        return max(0.0, min(1.0, score))

    def _generate_reasoning(
        self,
        relevance: float,
        clarity: float,
        hallucination_risk: float,
        has_context: bool,
    ) -> str:
        """
        Generate human-readable reasoning for the scores.
        
        Args:
            relevance: Relevance score.
            clarity: Clarity score.
            hallucination_risk: Hallucination risk score.
            has_context: Whether RAG context was used.
        
        Returns:
            Reasoning string.
        """
        parts = []

        # Relevance assessment
        if relevance >= 0.8:
            parts.append("Highly semantically aligned with the query")
        elif relevance >= 0.6:
            parts.append("Moderately relevant to the query")
        elif relevance >= 0.4:
            parts.append("Somewhat related to the query")
        else:
            parts.append("Low semantic similarity to the query")

        # Clarity assessment
        if clarity >= 0.8:
            parts.append("well-structured response")
        elif clarity >= 0.5:
            parts.append("reasonably clear response")
        else:
            parts.append("could be better structured")

        # Hallucination assessment
        if hallucination_risk >= 0.6:
            parts.append("with potential hallucination concerns")
        elif hallucination_risk >= 0.3:
            parts.append("with moderate confidence")
        else:
            parts.append("with low hallucination risk")

        # Context note
        if has_context:
            parts.append("(evaluated against RAG context)")

        return "; ".join(parts) + "."

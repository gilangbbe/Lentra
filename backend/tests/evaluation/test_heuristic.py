"""
Tests for the heuristic evaluation strategy.
"""

import pytest

from src.evaluation.strategies.heuristic import HeuristicStrategy
from src.schemas.model import ModelResponse


class TestHeuristicStrategy:
    """Tests for heuristic evaluation."""
    
    @pytest.fixture
    def strategy(self) -> HeuristicStrategy:
        """Create a heuristic strategy instance."""
        return HeuristicStrategy()
    
    @pytest.fixture
    def responses(self) -> list[ModelResponse]:
        """Create sample responses for testing."""
        return [
            ModelResponse(
                model_id="model-a",
                text="Quantum computing uses quantum mechanics to perform calculations. It leverages qubits instead of classical bits.",
                latency_ms=500.0,
                tokens=20,
            ),
            ModelResponse(
                model_id="model-b",
                text="Computers that use quantum stuff.",
                latency_ms=100.0,
                tokens=5,
            ),
        ]
    
    @pytest.mark.asyncio
    async def test_evaluate_returns_scores(
        self,
        strategy: HeuristicStrategy,
        responses: list[ModelResponse],
    ) -> None:
        """Evaluation returns scores for all responses."""
        scores = await strategy.evaluate(
            prompt="What is quantum computing?",
            responses=responses,
        )
        
        assert len(scores) == 2
        assert scores[0].model_id == "model-a"
        assert scores[1].model_id == "model-b"
    
    @pytest.mark.asyncio
    async def test_scores_in_valid_range(
        self,
        strategy: HeuristicStrategy,
        responses: list[ModelResponse],
    ) -> None:
        """All scores are between 0 and 1."""
        scores = await strategy.evaluate(
            prompt="What is quantum computing?",
            responses=responses,
        )
        
        for score in scores:
            assert 0 <= score.relevance <= 1
            assert 0 <= score.clarity <= 1
            assert 0 <= score.hallucination_risk <= 1
            assert 0 <= score.final_score <= 1
    
    @pytest.mark.asyncio
    async def test_better_response_higher_score(
        self,
        strategy: HeuristicStrategy,
        responses: list[ModelResponse],
    ) -> None:
        """More relevant response gets higher score."""
        scores = await strategy.evaluate(
            prompt="What is quantum computing?",
            responses=responses,
        )
        
        model_a_score = next(s for s in scores if s.model_id == "model-a")
        model_b_score = next(s for s in scores if s.model_id == "model-b")
        
        # Model A should score higher (more detailed, relevant response)
        assert model_a_score.final_score > model_b_score.final_score
    
    def test_calculate_relevance(self, strategy: HeuristicStrategy) -> None:
        """Relevance calculation based on keyword overlap."""
        prompt = "What is Python programming?"
        
        # High relevance
        text1 = "Python is a programming language used for web development."
        score1 = strategy._calculate_relevance(prompt, text1)
        
        # Low relevance
        text2 = "The weather is nice today."
        score2 = strategy._calculate_relevance(prompt, text2)
        
        assert score1 > score2
    
    def test_calculate_clarity(self, strategy: HeuristicStrategy) -> None:
        """Clarity calculation based on structure."""
        # Well-structured text
        good_text = "Python is versatile. It supports multiple paradigms. You can use it for web development, data science, and automation."
        good_score = strategy._calculate_clarity(good_text)
        
        # Poorly structured text
        bad_text = "pythonverysupergoodforeverything"
        bad_score = strategy._calculate_clarity(bad_text)
        
        assert good_score > bad_score
    
    def test_reasoning_generated(
        self,
        strategy: HeuristicStrategy,
    ) -> None:
        """Reasoning text is generated."""
        reasoning = strategy._generate_reasoning(
            relevance=0.9,
            clarity=0.8,
            hallucination_risk=0.1,
        )
        
        assert "High relevance" in reasoning
        assert "hallucination risk" in reasoning

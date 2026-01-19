"""
Evaluation Strategies Package

Contains all evaluation strategies for comparing LLM responses:
- HeuristicStrategy: Fast scoring based on structure and latency
- EmbeddingSimilarityStrategy: Semantic relevance using embeddings
- LLMJudgeStrategy: Meta-model evaluation
- EnsembleStrategy: Combines multiple strategies
"""

from src.evaluation.strategies.heuristic import HeuristicStrategy
from src.evaluation.strategies.embedding_similarity import EmbeddingSimilarityStrategy
from src.evaluation.strategies.llm_judge import LLMJudgeStrategy
from src.evaluation.strategies.ensemble import EnsembleStrategy

__all__ = [
    "HeuristicStrategy",
    "EmbeddingSimilarityStrategy",
    "LLMJudgeStrategy",
    "EnsembleStrategy",
]

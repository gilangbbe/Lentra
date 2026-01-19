"""
RAG (Retrieval-Augmented Generation) Package

Contains components for document processing, embedding, and retrieval.
"""

from src.rag.chunker import DocumentChunker
from src.rag.embeddings import EmbeddingService
from src.rag.engine import RAGEngine, get_rag_engine
from src.rag.vector_store import FAISSVectorStore

__all__ = [
    "RAGEngine",
    "get_rag_engine",
    "FAISSVectorStore",
    "EmbeddingService",
    "DocumentChunker",
]

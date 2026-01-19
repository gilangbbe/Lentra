"""
Tests for the RAG engine.
"""

import pytest

from src.rag.engine import RAGEngine


class TestRAGEngine:
    """Tests for the RAG engine."""
    
    @pytest.fixture
    def engine(self) -> RAGEngine:
        """Create a RAG engine instance."""
        return RAGEngine()
    
    def test_chunk_text_basic(self, engine: RAGEngine) -> None:
        """Basic text chunking works."""
        text = "This is sentence one. This is sentence two. This is sentence three."
        
        chunks = engine._chunk_text(text, chunk_size=30, overlap=5)
        
        assert len(chunks) > 0
        assert all(len(c) <= 35 for c in chunks)  # Allow some flexibility for sentence boundaries
    
    def test_chunk_text_respects_sentences(self, engine: RAGEngine) -> None:
        """Chunking tries to break at sentence boundaries."""
        text = "This is a complete sentence. Another sentence here. And one more."
        
        chunks = engine._chunk_text(text, chunk_size=40, overlap=5)
        
        # Chunks should mostly end with periods
        period_endings = sum(1 for c in chunks if c.endswith("."))
        assert period_endings >= len(chunks) // 2
    
    def test_chunk_text_empty(self, engine: RAGEngine) -> None:
        """Empty text returns empty list."""
        chunks = engine._chunk_text("")
        
        assert chunks == []
    
    def test_assemble_context(self, engine: RAGEngine) -> None:
        """Context assembly works."""
        from src.schemas.rag import DocumentChunk
        
        chunks = [
            DocumentChunk(
                id="1",
                content="First chunk content.",
                score=0.9,
                metadata={},
            ),
            DocumentChunk(
                id="2",
                content="Second chunk content.",
                score=0.8,
                metadata={},
            ),
        ]
        
        context = engine._assemble_context(chunks)
        
        assert "[Source 1]" in context
        assert "[Source 2]" in context
        assert "First chunk content" in context
    
    def test_assemble_context_respects_limit(self, engine: RAGEngine) -> None:
        """Context assembly respects token limit."""
        from src.schemas.rag import DocumentChunk
        
        # Create many chunks
        chunks = [
            DocumentChunk(
                id=str(i),
                content="x" * 1000,
                score=0.9,
                metadata={},
            )
            for i in range(10)
        ]
        
        context = engine._assemble_context(chunks, max_tokens=500)
        
        # Should not include all chunks
        assert len(context) < 10000
    
    @pytest.mark.asyncio
    async def test_retrieve_returns_response(self, engine: RAGEngine) -> None:
        """Retrieve returns a valid response structure."""
        result = await engine.retrieve("test query")
        
        assert result.query == "test query"
        assert isinstance(result.chunks, list)
        assert result.retrieval_latency_ms >= 0

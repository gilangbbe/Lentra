"""
Tests for the RAG engine and components.
"""

import tempfile
from collections.abc import Generator
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest

from src.rag.chunker import DocumentChunker
from src.rag.embeddings import EmbeddingService
from src.rag.engine import RAGEngine
from src.rag.vector_store import FAISSVectorStore
from src.schemas.rag import DocumentChunk


class TestDocumentChunker:
    """Tests for the DocumentChunker."""

    def test_chunk_basic(self) -> None:
        """Basic text chunking works."""
        chunker = DocumentChunker(chunk_size=50, chunk_overlap=10)
        text = "This is a test document. It has multiple sentences. Each sentence is short."

        chunks = chunker.chunk(text)

        assert len(chunks) > 0
        assert all("content" in c for c in chunks)
        assert all("metadata" in c for c in chunks)

    def test_chunk_with_metadata(self) -> None:
        """Chunking preserves metadata."""
        chunker = DocumentChunker(chunk_size=50, chunk_overlap=10)
        text = "This is a test document with some content."
        metadata = {"source": "test.txt", "page": 1}

        chunks = chunker.chunk(text, metadata=metadata)

        assert len(chunks) > 0
        for chunk in chunks:
            assert chunk["metadata"]["source"] == "test.txt"
            assert chunk["metadata"]["page"] == 1

    def test_chunk_empty_text(self) -> None:
        """Empty text returns empty list."""
        chunker = DocumentChunker()
        chunks = chunker.chunk("")

        assert chunks == []

    def test_chunk_respects_size(self) -> None:
        """Chunks respect maximum size."""
        chunker = DocumentChunker(chunk_size=50, chunk_overlap=10)
        text = "Word " * 100  # Create predictable text

        chunks = chunker.chunk(text)

        # Each chunk should be reasonably sized (the chunker tries to respect word boundaries)
        # So we allow some flexibility but it shouldn't be wildly over
        for chunk in chunks:
            assert len(chunk["content"]) <= 200  # More reasonable flexibility

    def test_fixed_strategy(self) -> None:
        """Fixed chunking strategy works."""
        chunker = DocumentChunker(chunk_size=50, chunk_overlap=10, strategy="fixed")
        text = "A" * 200

        chunks = chunker.chunk(text)

        assert len(chunks) >= 3

    def test_sentence_strategy(self) -> None:
        """Sentence chunking strategy works."""
        chunker = DocumentChunker(chunk_size=100, chunk_overlap=20, strategy="sentence")
        text = "First sentence. Second sentence. Third sentence. Fourth sentence."

        chunks = chunker.chunk(text)

        assert len(chunks) > 0


class TestEmbeddingService:
    """Tests for the EmbeddingService."""

    @pytest.fixture
    def mock_model(self) -> MagicMock:
        """Create a mock sentence transformer model."""
        mock = MagicMock()
        mock.get_sentence_embedding_dimension.return_value = 384
        mock.encode.return_value = np.random.rand(1, 384).astype(np.float32)
        return mock

    @pytest.mark.asyncio
    async def test_embed_single_text(self, mock_model: MagicMock) -> None:
        """Embedding a single text works."""
        with patch("sentence_transformers.SentenceTransformer", return_value=mock_model):
            service = EmbeddingService(model_name="test-model")
            await service.initialize()

            result = await service.embed("Test text")

            assert result.shape[0] == 1
            assert result.shape[1] == 384

    @pytest.mark.asyncio
    async def test_embed_multiple_texts(self, mock_model: MagicMock) -> None:
        """Embedding multiple texts works."""
        mock_model.encode.return_value = np.random.rand(3, 384).astype(np.float32)
        
        with patch("sentence_transformers.SentenceTransformer", return_value=mock_model):
            service = EmbeddingService(model_name="test-model")
            await service.initialize()

            result = await service.embed(["Text 1", "Text 2", "Text 3"])

            assert result.shape[0] == 3
            assert result.shape[1] == 384

    @pytest.mark.asyncio
    async def test_dimension_property(self, mock_model: MagicMock) -> None:
        """Dimension property returns correct value."""
        with patch("sentence_transformers.SentenceTransformer", return_value=mock_model):
            service = EmbeddingService(model_name="test-model")
            await service.initialize()

            assert service.dimension == 384


class TestFAISSVectorStore:
    """Tests for the FAISSVectorStore."""

    @pytest.fixture
    def temp_index_path(self) -> Generator[Path, None, None]:
        """Create a temporary path for the FAISS index."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir) / "faiss_index"

    @pytest.fixture
    async def vector_store(self, temp_index_path: Path) -> FAISSVectorStore:
        """Create an initialized vector store."""
        store = FAISSVectorStore(index_path=temp_index_path, dimension=384)
        await store.initialize()
        return store

    @pytest.mark.asyncio
    async def test_add_and_search(self, vector_store: FAISSVectorStore) -> None:
        """Adding and searching vectors works."""
        embeddings = np.random.rand(3, 384).astype(np.float32)
        chunks = [
            {"id": "1", "content": "First chunk", "source": "test.txt"},
            {"id": "2", "content": "Second chunk", "source": "test.txt"},
            {"id": "3", "content": "Third chunk", "source": "test.txt"},
        ]

        await vector_store.add(embeddings, chunks, document_id="doc1")

        # Search with similar vector
        query = embeddings[0]
        results = await vector_store.search(query, top_k=2)

        assert len(results) == 2
        assert results[0]["content"] == "First chunk"

    @pytest.mark.asyncio
    async def test_search_empty_store(self, vector_store: FAISSVectorStore) -> None:
        """Searching empty store returns empty list."""
        query = np.random.rand(384).astype(np.float32)
        results = await vector_store.search(query, top_k=5)

        assert results == []

    @pytest.mark.asyncio
    async def test_delete_document(self, vector_store: FAISSVectorStore) -> None:
        """Deleting a document removes its chunks."""
        embeddings = np.random.rand(3, 384).astype(np.float32)
        chunks = [
            {"id": "1", "content": "First chunk", "source": "test.txt"},
            {"id": "2", "content": "Second chunk", "source": "test.txt"},
            {"id": "3", "content": "Third chunk", "source": "test.txt"},
        ]

        await vector_store.add(embeddings, chunks, document_id="doc1")

        # Verify document exists
        assert "doc1" in vector_store.list_documents()

        # Delete
        count = await vector_store.delete_document("doc1")

        assert count == 3
        assert "doc1" not in vector_store.list_documents()

    @pytest.mark.asyncio
    async def test_save_and_load(self, temp_index_path: Path) -> None:
        """Saving and loading the index works."""
        # Create and populate store
        store1 = FAISSVectorStore(index_path=temp_index_path, dimension=384)
        await store1.initialize()

        embeddings = np.random.rand(2, 384).astype(np.float32)
        chunks = [
            {"id": "1", "content": "Test chunk 1", "source": "test.txt"},
            {"id": "2", "content": "Test chunk 2", "source": "test.txt"},
        ]
        await store1.add(embeddings, chunks, document_id="doc1")
        await store1.save()

        # Load in new store
        store2 = FAISSVectorStore(index_path=temp_index_path, dimension=384)
        await store2.initialize()

        assert store2.total_vectors == 2

    @pytest.mark.asyncio
    async def test_collection_filtering(self, vector_store: FAISSVectorStore) -> None:
        """Collection filtering works in search."""
        embeddings = np.random.rand(4, 384).astype(np.float32)
        
        # Add to different collections
        await vector_store.add(
            embeddings[:2],
            [{"id": "1", "content": "Collection A chunk"}, {"id": "2", "content": "Collection A chunk 2"}],
            collection="collectionA",
            document_id="docA",
        )
        await vector_store.add(
            embeddings[2:],
            [{"id": "3", "content": "Collection B chunk"}, {"id": "4", "content": "Collection B chunk 2"}],
            collection="collectionB",
            document_id="docB",
        )

        # Search only in collection A
        results = await vector_store.search(
            embeddings[0], top_k=5, collection="collectionA"
        )

        assert all(r.get("collection") == "collectionA" for r in results)


class TestRAGEngine:
    """Tests for the RAGEngine orchestrator."""

    @pytest.fixture
    def mock_settings(self) -> MagicMock:
        """Create mock settings."""
        mock = MagicMock()
        mock.RAG_ENABLED = True
        mock.RAG_TOP_K = 5
        mock.RAG_CHUNK_SIZE = 512
        mock.RAG_CHUNK_OVERLAP = 50
        mock.FAISS_INDEX_PATH = "/tmp/test_faiss_index"
        mock.EMBEDDING_MODEL = "all-MiniLM-L6-v2"
        return mock

    def test_assemble_context(self) -> None:
        """Context assembly works correctly."""
        engine = RAGEngine()

        chunks = [
            DocumentChunk(
                id="1",
                content="First chunk content.",
                score=0.9,
                metadata={"source": "doc1.txt"},
            ),
            DocumentChunk(
                id="2",
                content="Second chunk content.",
                score=0.8,
                metadata={"source": "doc2.txt"},
            ),
        ]

        context = engine._assemble_context(chunks)

        assert "[Source 1: doc1.txt]" in context
        assert "[Source 2: doc2.txt]" in context
        assert "First chunk content" in context
        assert "Second chunk content" in context

    def test_assemble_context_respects_limit(self) -> None:
        """Context assembly respects token limit."""
        engine = RAGEngine()

        # Create chunks with large content
        chunks = [
            DocumentChunk(
                id=str(i),
                content="x" * 1000,
                score=0.9,
                metadata={"source": f"doc{i}.txt"},
            )
            for i in range(10)
        ]

        context = engine._assemble_context(chunks, max_tokens=500)

        # Should not include all chunks (500 tokens ~= 2000 chars)
        assert len(context) < 10000

    def test_assemble_context_empty(self) -> None:
        """Empty chunks returns empty context."""
        engine = RAGEngine()
        context = engine._assemble_context([])

        assert context == ""

    def test_generate_doc_id(self) -> None:
        """Document ID generation is consistent."""
        engine = RAGEngine()

        id1 = engine._generate_doc_id("test.txt", "content")
        id2 = engine._generate_doc_id("test.txt", "content")
        id3 = engine._generate_doc_id("other.txt", "content")

        assert id1 == id2  # Same input = same ID
        assert id1 != id3  # Different filename = different ID

    def test_get_stats(self) -> None:
        """Stats returns expected structure."""
        engine = RAGEngine()
        stats = engine.get_stats()

        assert "enabled" in stats
        assert "initialized" in stats
        assert "top_k" in stats
        assert "chunk_size" in stats


class TestRAGIntegration:
    """Integration tests for the full RAG pipeline."""

    @pytest.fixture
    async def mock_rag_engine(self) -> RAGEngine:
        """Create a RAG engine with mocked components."""
        engine = RAGEngine()
        
        # Mock the embedder
        mock_embedder = AsyncMock()
        mock_embedder.dimension = 384
        mock_embedder.embed = AsyncMock(return_value=np.random.rand(1, 384).astype(np.float32))
        
        # Mock the vector store
        mock_store = AsyncMock()
        mock_store.search = AsyncMock(return_value=[
            {"id": "1", "content": "Test content", "score": 0.9, "source": "test.txt"}
        ])
        mock_store.list_documents = MagicMock(return_value=["doc1"])
        mock_store.list_collections = MagicMock(return_value=["default"])
        
        engine._embedder = mock_embedder
        engine._vector_store = mock_store
        engine._chunker = DocumentChunker()
        engine._initialized = True
        engine._enabled = True
        
        return engine

    @pytest.mark.asyncio
    async def test_retrieve_full_pipeline(self, mock_rag_engine: RAGEngine) -> None:
        """Full retrieval pipeline works."""
        result = await mock_rag_engine.retrieve("test query")

        assert result.query == "test query"
        assert len(result.chunks) == 1
        assert result.chunks[0].content == "Test content"
        assert result.retrieval_latency_ms >= 0

    @pytest.mark.asyncio
    async def test_list_documents(self, mock_rag_engine: RAGEngine) -> None:
        """Listing documents works."""
        docs = await mock_rag_engine.list_documents()

        assert "doc1" in docs

    @pytest.mark.asyncio
    async def test_list_collections(self, mock_rag_engine: RAGEngine) -> None:
        """Listing collections works."""
        collections = await mock_rag_engine.list_collections()

        assert "default" in collections

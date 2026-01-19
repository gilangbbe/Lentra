"""
RAG Engine

Main orchestrator for Retrieval-Augmented Generation operations.
Coordinates document ingestion, chunking, embedding, and retrieval.
"""

import hashlib
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from src.core.config import settings
from src.core.exceptions import RAGError
from src.core.logging import get_logger
from src.rag.chunker import DocumentChunker
from src.rag.embeddings import EmbeddingService
from src.rag.vector_store import FAISSVectorStore
from src.schemas.rag import (
    CollectionInfo,
    DocumentChunk,
    DocumentInfo,
    RAGQueryResponse,
)

logger = get_logger(__name__)


class RAGEngine:
    """
    RAG Engine for document retrieval and context assembly.
    
    Per architecture, the RAG flow is:
    1. Load documents
    2. Chunk text
    3. Generate embeddings
    4. Store vectors (FAISS)
    5. Retrieve top-k chunks
    6. Inject into prompt template
    
    This class orchestrates all RAG components:
    - Chunker: Splits documents into manageable pieces
    - Embedder: Generates vector embeddings
    - VectorStore: FAISS-based similarity search
    """

    def __init__(self) -> None:
        """Initialize the RAG engine with configured components."""
        self._enabled = settings.RAG_ENABLED
        self._top_k = settings.RAG_TOP_K
        self._chunk_size = settings.RAG_CHUNK_SIZE
        self._chunk_overlap = settings.RAG_CHUNK_OVERLAP
        self._index_path = Path(settings.FAISS_INDEX_PATH)

        # Components (lazy-loaded)
        self._embedder: EmbeddingService | None = None
        self._vector_store: FAISSVectorStore | None = None
        self._chunker: DocumentChunker | None = None

        # Initialization state
        self._initialized = False

        logger.info(
            "RAG engine created",
            enabled=self._enabled,
            top_k=self._top_k,
            index_path=str(self._index_path),
        )

    async def initialize(self) -> None:
        """
        Initialize RAG components.
        
        Loads the embedding model and FAISS index.
        """
        if self._initialized:
            return

        if not self._enabled:
            logger.info("RAG is disabled, skipping initialization")
            return

        try:
            # Initialize embedding service
            self._embedder = EmbeddingService(
                model_name=settings.EMBEDDING_MODEL,
            )
            await self._embedder.initialize()

            # Initialize vector store with embedding dimension
            self._vector_store = FAISSVectorStore(
                index_path=self._index_path,
                dimension=self._embedder.dimension,
            )
            await self._vector_store.initialize()

            # Initialize chunker
            self._chunker = DocumentChunker(
                chunk_size=self._chunk_size,
                chunk_overlap=self._chunk_overlap,
            )

            self._initialized = True

            logger.info(
                "RAG engine initialized",
                embedding_dim=self._embedder.dimension,
                total_vectors=self._vector_store.total_vectors,
            )
        except Exception as e:
            logger.error("Failed to initialize RAG engine", error=str(e))
            raise RAGError(
                operation="initialize",
                message=f"RAG initialization failed: {e}",
            )

    async def _ensure_initialized(self) -> None:
        """Ensure components are initialized."""
        if not self._initialized:
            await self.initialize()

        if not self._enabled:
            raise RAGError(
                operation="query",
                message="RAG is disabled",
            )

    async def retrieve(
        self,
        query: str,
        top_k: int | None = None,
        collection: str | None = None,
        score_threshold: float = 0.0,
    ) -> RAGQueryResponse:
        """
        Retrieve relevant document chunks for a query.
        
        Args:
            query: Search query.
            top_k: Number of chunks to retrieve (default: config value).
            collection: Specific collection to search.
            score_threshold: Minimum relevance score.
        
        Returns:
            RAGQueryResponse: Retrieved chunks and assembled context.
        """
        await self._ensure_initialized()

        start_time = time.perf_counter()
        k = top_k or self._top_k

        logger.debug(
            "Retrieving chunks",
            query_length=len(query),
            top_k=k,
            collection=collection,
        )

        try:
            # Embed the query
            query_embedding = await self._embedder.embed(query)

            # Search vector store
            results = await self._vector_store.search(
                query_embedding=query_embedding[0],
                top_k=k,
                collection=collection,
                score_threshold=score_threshold,
            )

            # Convert to DocumentChunk objects
            chunks = [
                DocumentChunk(
                    id=r["id"],
                    content=r["content"],
                    score=r["score"],
                    metadata={
                        "source": r.get("source", ""),
                        "document_id": r.get("document_id"),
                        "collection": r.get("collection", "default"),
                        **r.get("metadata", {}),
                    },
                )
                for r in results
            ]

            # Assemble context for LLM
            assembled_context = self._assemble_context(chunks)

            latency_ms = (time.perf_counter() - start_time) * 1000

            logger.info(
                "Retrieval completed",
                chunks_found=len(chunks),
                latency_ms=round(latency_ms, 2),
            )

            return RAGQueryResponse(
                query=query,
                chunks=chunks,
                total_chunks=len(chunks),
                assembled_context=assembled_context,
                retrieval_latency_ms=round(latency_ms, 2),
            )

        except Exception as e:
            logger.error("Retrieval failed", error=str(e))
            raise RAGError(
                operation="retrieve",
                message=f"Retrieval failed: {e}",
            )

    async def index_document(
        self,
        content: str,
        filename: str,
        collection: str = "default",
        metadata: dict[str, Any] | None = None,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
    ) -> DocumentInfo:
        """
        Index a document for retrieval.
        
        Args:
            content: Document text content.
            filename: Original filename.
            collection: Collection to add to.
            metadata: Additional metadata.
            chunk_size: Override default chunk size.
            chunk_overlap: Override default overlap.
        
        Returns:
            DocumentInfo: Information about the indexed document.
        """
        await self._ensure_initialized()

        start_time = time.perf_counter()

        logger.info(
            "Indexing document",
            filename=filename,
            collection=collection,
            content_length=len(content),
        )

        try:
            # Generate document ID
            doc_id = self._generate_doc_id(filename, content)

            # Check if already indexed
            existing_docs = self._vector_store.list_documents(collection)
            if doc_id in existing_docs:
                logger.warning("Document already indexed", doc_id=doc_id)
                # Could return existing info or re-index

            # Create chunker with optional overrides
            chunker = DocumentChunker(
                chunk_size=chunk_size or self._chunk_size,
                chunk_overlap=chunk_overlap or self._chunk_overlap,
            )

            # Chunk the document
            base_metadata = {
                "source": filename,
                "document_id": doc_id,
                **(metadata or {}),
            }
            chunks = chunker.chunk(content, metadata=base_metadata)

            if not chunks:
                raise RAGError(
                    operation="index",
                    message="Document produced no chunks",
                )

            # Generate embeddings for all chunks
            chunk_texts = [c["content"] for c in chunks]
            embeddings = await self._embedder.embed(chunk_texts)

            # Add to vector store
            await self._vector_store.add(
                embeddings=embeddings,
                chunks=chunks,
                collection=collection,
                document_id=doc_id,
            )

            # Save index
            await self._vector_store.save()

            latency_ms = (time.perf_counter() - start_time) * 1000

            logger.info(
                "Document indexed",
                doc_id=doc_id,
                chunks=len(chunks),
                latency_ms=round(latency_ms, 2),
            )

            return DocumentInfo(
                id=doc_id,
                filename=filename,
                collection=collection,
                chunks=len(chunks),
                indexed_at=datetime.utcnow(),
                metadata={
                    "content_length": len(content),
                    "chunk_size": chunk_size or self._chunk_size,
                    "embedding_model": settings.EMBEDDING_MODEL,
                    **(metadata or {}),
                },
            )

        except RAGError:
            raise
        except Exception as e:
            logger.error("Indexing failed", error=str(e))
            raise RAGError(
                operation="index",
                message=f"Document indexing failed: {e}",
            )

    async def delete_document(self, document_id: str) -> bool:
        """
        Delete a document from the index.
        
        Args:
            document_id: Document to delete.
        
        Returns:
            bool: True if deleted, False if not found.
        """
        await self._ensure_initialized()

        count = await self._vector_store.delete_document(document_id)

        if count > 0:
            await self._vector_store.save()
            logger.info("Document deleted", document_id=document_id, chunks=count)
            return True

        return False

    async def get_collection_info(self, collection: str) -> CollectionInfo | None:
        """
        Get information about a collection.
        
        Args:
            collection: Collection name.
        
        Returns:
            CollectionInfo or None if not found.
        """
        await self._ensure_initialized()

        info = self._vector_store.get_collection_info(collection)

        if not info.get("exists"):
            return None

        return CollectionInfo(
            name=collection,
            document_count=info.get("document_count", 0),
            chunk_count=info.get("chunk_count", 0),
            created_at=datetime.utcnow(),  # TODO: Track actual creation time
            embedding_model=settings.EMBEDDING_MODEL,
        )

    async def list_collections(self) -> list[str]:
        """List all collections."""
        await self._ensure_initialized()
        return self._vector_store.list_collections()

    async def list_documents(
        self,
        collection: str | None = None,
    ) -> list[str]:
        """
        List documents in the index.
        
        Args:
            collection: Filter by collection.
        
        Returns:
            list[str]: Document IDs.
        """
        await self._ensure_initialized()
        return self._vector_store.list_documents(collection)

    async def clear_collection(self, collection: str) -> int:
        """
        Clear all documents from a collection.
        
        Args:
            collection: Collection to clear.
        
        Returns:
            int: Number of documents removed.
        """
        await self._ensure_initialized()

        docs = self._vector_store.list_documents(collection)
        count = 0

        for doc_id in docs:
            if await self._vector_store.delete_document(doc_id):
                count += 1

        if count > 0:
            await self._vector_store.save()

        logger.info("Collection cleared", collection=collection, documents=count)
        return count

    async def save(self) -> None:
        """Save the index to disk."""
        if self._vector_store:
            await self._vector_store.save()

    def _generate_doc_id(self, filename: str, content: str) -> str:
        """Generate a unique document ID."""
        hash_input = f"{filename}:{len(content)}:{content[:1000]}"
        return hashlib.sha256(hash_input.encode()).hexdigest()[:16]

    def _assemble_context(
        self,
        chunks: list[DocumentChunk],
        max_tokens: int = 2000,
    ) -> str:
        """
        Assemble chunks into a context string for LLM.
        
        Args:
            chunks: Retrieved chunks.
            max_tokens: Maximum context length (approximate).
        
        Returns:
            str: Assembled context.
        """
        if not chunks:
            return ""

        context_parts = []
        total_length = 0
        max_chars = max_tokens * 4  # Rough token-to-char ratio

        for i, chunk in enumerate(chunks, 1):
            source = chunk.metadata.get("source", "Unknown")
            chunk_text = f"[Source {i}: {source}]\n{chunk.content}"

            if total_length + len(chunk_text) > max_chars:
                break

            context_parts.append(chunk_text)
            total_length += len(chunk_text)

        return "\n\n---\n\n".join(context_parts)

    def get_stats(self) -> dict[str, Any]:
        """Get RAG engine statistics."""
        stats = {
            "enabled": self._enabled,
            "initialized": self._initialized,
            "top_k": self._top_k,
            "chunk_size": self._chunk_size,
            "chunk_overlap": self._chunk_overlap,
        }

        if self._vector_store:
            stats["vector_store"] = self._vector_store.get_stats()

        if self._embedder:
            stats["embedder"] = self._embedder.get_stats()

        return stats


# Singleton instance
_rag_engine: RAGEngine | None = None


def get_rag_engine() -> RAGEngine:
    """Get or create the RAG engine singleton."""
    global _rag_engine
    if _rag_engine is None:
        _rag_engine = RAGEngine()
    return _rag_engine

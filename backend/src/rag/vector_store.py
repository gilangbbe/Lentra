"""
FAISS Vector Store

Wrapper around FAISS for vector similarity search.
Provides persistence, metadata storage, and search functionality.
"""

import pickle
import time
from pathlib import Path
from typing import Any

import faiss
import numpy as np

from src.core.config import settings
from src.core.exceptions import RAGError
from src.core.logging import get_logger

logger = get_logger(__name__)


class FAISSVectorStore:
    """
    FAISS-based vector store for document chunks.
    
    Features:
    - Flat L2 index for exact nearest neighbor search
    - Metadata storage alongside vectors
    - Persistence to disk
    - Collection support for organizing documents
    
    Per architecture:
    - Vector Store (FAISS) is the primary storage backend
    - Supports chunked document storage with metadata
    """

    def __init__(
        self,
        index_path: str | Path | None = None,
        dimension: int = 384,  # Default for all-MiniLM-L6-v2
    ) -> None:
        """
        Initialize the FAISS vector store.
        
        Args:
            index_path: Path to save/load the index.
            dimension: Vector dimension (must match embedding model).
        """
        self._index_path = Path(index_path or settings.FAISS_INDEX_PATH)
        self._dimension = dimension

        # FAISS index
        self._index: faiss.IndexFlatL2 | None = None

        # Metadata storage: maps FAISS index position to chunk data
        self._metadata: list[dict[str, Any]] = []

        # Collection tracking
        self._collections: dict[str, set[int]] = {"default": set()}

        # Document tracking: maps doc_id to chunk indices
        self._documents: dict[str, list[int]] = {}

        # Statistics
        self._stats = {
            "total_vectors": 0,
            "total_searches": 0,
            "total_adds": 0,
        }

        logger.info(
            "FAISS vector store initialized",
            index_path=str(self._index_path),
            dimension=dimension,
        )

    @property
    def dimension(self) -> int:
        """Get vector dimension."""
        return self._dimension

    @property
    def total_vectors(self) -> int:
        """Get total number of vectors in the index."""
        if self._index is None:
            return 0
        return self._index.ntotal

    def _ensure_index(self) -> None:
        """Create index if not exists."""
        if self._index is None:
            self._index = faiss.IndexFlatL2(self._dimension)
            logger.debug("Created new FAISS index", dimension=self._dimension)

    async def initialize(self) -> None:
        """
        Initialize the vector store.
        
        Loads existing index from disk if available.
        """
        self._index_path.parent.mkdir(parents=True, exist_ok=True)

        index_file = self._index_path / "index.faiss"
        metadata_file = self._index_path / "metadata.pkl"

        if index_file.exists() and metadata_file.exists():
            try:
                # Load FAISS index
                self._index = faiss.read_index(str(index_file))

                # Load metadata
                with open(metadata_file, "rb") as f:
                    data = pickle.load(f)
                    self._metadata = data.get("metadata", [])
                    self._collections = data.get("collections", {"default": set()})
                    self._documents = data.get("documents", {})
                    self._stats = data.get("stats", self._stats)

                logger.info(
                    "Loaded FAISS index from disk",
                    vectors=self._index.ntotal,
                    documents=len(self._documents),
                )
            except Exception as e:
                logger.error("Failed to load FAISS index", error=str(e))
                self._ensure_index()
        else:
            self._ensure_index()
            logger.info("Created new FAISS index")

    async def save(self) -> None:
        """
        Persist the index and metadata to disk.
        """
        if self._index is None:
            return

        self._index_path.mkdir(parents=True, exist_ok=True)

        index_file = self._index_path / "index.faiss"
        metadata_file = self._index_path / "metadata.pkl"

        try:
            # Save FAISS index
            faiss.write_index(self._index, str(index_file))

            # Save metadata
            with open(metadata_file, "wb") as f:
                pickle.dump({
                    "metadata": self._metadata,
                    "collections": self._collections,
                    "documents": self._documents,
                    "stats": self._stats,
                }, f)

            logger.info(
                "Saved FAISS index to disk",
                vectors=self._index.ntotal,
                path=str(self._index_path),
            )
        except Exception as e:
            logger.error("Failed to save FAISS index", error=str(e))
            raise RAGError(
                operation="save",
                message=f"Failed to save index: {e}",
            )

    async def add(
        self,
        embeddings: np.ndarray,
        chunks: list[dict[str, Any]],
        collection: str = "default",
        document_id: str | None = None,
    ) -> list[int]:
        """
        Add embeddings and metadata to the index.
        
        Args:
            embeddings: Numpy array of shape (n, dimension).
            chunks: List of chunk metadata dicts.
            collection: Collection to add to.
            document_id: Optional document identifier.
        
        Returns:
            list[int]: Indices of added vectors.
        """
        self._ensure_index()

        if len(embeddings) != len(chunks):
            raise ValueError("Embeddings and chunks must have same length")

        if embeddings.shape[1] != self._dimension:
            raise ValueError(
                f"Embedding dimension {embeddings.shape[1]} doesn't match "
                f"index dimension {self._dimension}"
            )

        # Ensure embeddings are float32
        embeddings = embeddings.astype(np.float32)

        # Get starting index
        start_idx = self._index.ntotal

        # Add to FAISS
        self._index.add(embeddings)

        # Store metadata
        indices = list(range(start_idx, start_idx + len(chunks)))

        for idx, chunk in zip(indices, chunks):
            self._metadata.append({
                "idx": idx,
                "content": chunk.get("content", ""),
                "source": chunk.get("source", ""),
                "document_id": document_id,
                "collection": collection,
                "metadata": chunk.get("metadata", {}),
                "created_at": time.time(),
            })

        # Update collection tracking
        if collection not in self._collections:
            self._collections[collection] = set()
        self._collections[collection].update(indices)

        # Update document tracking
        if document_id:
            if document_id not in self._documents:
                self._documents[document_id] = []
            self._documents[document_id].extend(indices)

        # Update stats
        self._stats["total_vectors"] = self._index.ntotal
        self._stats["total_adds"] += len(chunks)

        logger.debug(
            "Added vectors to index",
            count=len(chunks),
            collection=collection,
            document_id=document_id,
        )

        return indices

    async def search(
        self,
        query_embedding: np.ndarray,
        top_k: int = 5,
        collection: str | None = None,
        score_threshold: float = 0.0,
    ) -> list[dict[str, Any]]:
        """
        Search for similar vectors.
        
        Args:
            query_embedding: Query vector of shape (dimension,) or (1, dimension).
            top_k: Number of results to return.
            collection: Filter by collection (None = search all).
            score_threshold: Minimum similarity score (0-1).
        
        Returns:
            list[dict]: Results with content, score, and metadata.
        """
        if self._index is None or self._index.ntotal == 0:
            return []

        # Reshape if needed
        if query_embedding.ndim == 1:
            query_embedding = query_embedding.reshape(1, -1)

        query_embedding = query_embedding.astype(np.float32)

        # Search more than needed if filtering by collection
        search_k = top_k * 3 if collection else top_k
        search_k = min(search_k, self._index.ntotal)

        # FAISS search
        distances, indices = self._index.search(query_embedding, search_k)

        # Convert distances to similarity scores (L2 distance -> similarity)
        # Using 1 / (1 + distance) for normalization
        results = []

        for distance, idx in zip(distances[0], indices[0]):
            if idx == -1:  # FAISS returns -1 for missing results
                continue

            # Convert L2 distance to similarity score
            score = 1.0 / (1.0 + float(distance))

            if score < score_threshold:
                continue

            metadata = self._metadata[idx]

            # Filter by collection if specified
            if collection and metadata.get("collection") != collection:
                continue

            results.append({
                "id": f"chunk_{idx}",
                "content": metadata.get("content", ""),
                "score": round(score, 4),
                "source": metadata.get("source", ""),
                "document_id": metadata.get("document_id"),
                "collection": metadata.get("collection", "default"),
                "metadata": metadata.get("metadata", {}),
            })

            if len(results) >= top_k:
                break

        self._stats["total_searches"] += 1

        logger.debug(
            "Search completed",
            results=len(results),
            top_k=top_k,
            collection=collection,
        )

        return results

    async def delete_document(self, document_id: str) -> int:
        """
        Delete all chunks for a document.
        
        Note: FAISS doesn't support deletion, so we mark vectors as deleted
        and rebuild the index periodically.
        
        Args:
            document_id: Document to delete.
        
        Returns:
            int: Number of chunks deleted.
        """
        if document_id not in self._documents:
            return 0

        indices = self._documents[document_id]

        # Mark as deleted in metadata
        for idx in indices:
            if idx < len(self._metadata):
                self._metadata[idx]["deleted"] = True

        # Remove from document tracking
        del self._documents[document_id]

        logger.info(
            "Marked document as deleted",
            document_id=document_id,
            chunks=len(indices),
        )

        return len(indices)

    async def rebuild_index(self) -> int:
        """
        Rebuild index to remove deleted vectors.
        
        Returns:
            int: Number of vectors in new index.
        """
        if self._index is None:
            return 0

        # Get all non-deleted metadata
        active_metadata = [
            m for m in self._metadata
            if not m.get("deleted", False)
        ]

        if not active_metadata:
            self._index = faiss.IndexFlatL2(self._dimension)
            self._metadata = []
            return 0

        # This would require re-embedding or storing vectors
        # For now, just log a warning
        logger.warning(
            "Index rebuild requested but requires re-embedding",
            deleted_count=len(self._metadata) - len(active_metadata),
        )

        return self._index.ntotal

    def get_collection_info(self, collection: str) -> dict[str, Any]:
        """Get information about a collection."""
        if collection not in self._collections:
            return {"name": collection, "exists": False}

        indices = self._collections[collection]

        return {
            "name": collection,
            "exists": True,
            "chunk_count": len(indices),
            "document_count": len(set(
                self._metadata[i].get("document_id")
                for i in indices
                if i < len(self._metadata) and self._metadata[i].get("document_id")
            )),
        }

    def list_collections(self) -> list[str]:
        """List all collections."""
        return list(self._collections.keys())

    def list_documents(self, collection: str | None = None) -> list[str]:
        """List all documents, optionally filtered by collection."""
        if collection is None:
            return list(self._documents.keys())

        docs = set()
        for doc_id, indices in self._documents.items():
            for idx in indices:
                if idx < len(self._metadata):
                    if self._metadata[idx].get("collection") == collection:
                        docs.add(doc_id)
                        break

        return list(docs)

    def get_document_info(self, document_id: str) -> dict[str, Any] | None:
        """Get detailed information about a document.
        
        Args:
            document_id: Document ID to look up.
            
        Returns:
            Document info dict or None if not found.
        """
        if document_id not in self._documents:
            return None

        indices = self._documents[document_id]
        if not indices:
            return None

        # Get info from the first chunk's metadata
        first_idx = indices[0]
        if first_idx >= len(self._metadata):
            return None

        meta = self._metadata[first_idx]
        chunk_metadata = meta.get("metadata", {})

        # Find the earliest created_at timestamp
        earliest_created = min(
            (self._metadata[i].get("created_at", 0) for i in indices if i < len(self._metadata)),
            default=0
        )

        # Get filename from nested metadata.source or top-level source
        filename = chunk_metadata.get("source") or meta.get("source", "unknown")

        return {
            "id": document_id,
            "filename": filename,
            "collection": meta.get("collection", "default"),
            "chunks": len(indices),
            "indexed_at": earliest_created,
            "metadata": chunk_metadata,
        }

    def list_documents_with_info(self, collection: str | None = None) -> list[dict[str, Any]]:
        """List all documents with full info, optionally filtered by collection.
        
        Args:
            collection: Optional collection to filter by.
            
        Returns:
            List of document info dicts.
        """
        doc_ids = self.list_documents(collection)
        result = []

        for doc_id in doc_ids:
            info = self.get_document_info(doc_id)
            if info:
                result.append(info)

        return result

    def get_stats(self) -> dict[str, Any]:
        """Get store statistics."""
        return {
            **self._stats,
            "collections": len(self._collections),
            "documents": len(self._documents),
            "index_path": str(self._index_path),
        }

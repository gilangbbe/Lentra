"""
Embedding Service

Generates vector embeddings for text using sentence-transformers
or Ollama embedding models.
"""

import asyncio
from typing import Any

import numpy as np

from src.core.config import settings
from src.core.exceptions import RAGError
from src.core.logging import get_logger

logger = get_logger(__name__)


class EmbeddingService:
    """
    Service for generating text embeddings.
    
    Supports multiple backends:
    - sentence-transformers (local, CPU/GPU)
    - Ollama embedding models (via API)
    
    Per architecture, the default model is all-MiniLM-L6-v2 (384 dims).
    """
    
    def __init__(
        self,
        model_name: str | None = None,
        backend: str = "sentence-transformers",
    ) -> None:
        """
        Initialize the embedding service.
        
        Args:
            model_name: Embedding model to use.
            backend: Backend type ('sentence-transformers' or 'ollama').
        """
        self._model_name = model_name or settings.EMBEDDING_MODEL
        self._backend = backend
        
        # Lazy-loaded model
        self._model: Any = None
        self._dimension: int | None = None
        
        # Cache for computed embeddings (LRU-style)
        self._cache: dict[str, np.ndarray] = {}
        self._cache_max_size = 1000
        
        logger.info(
            "Embedding service initialized",
            model=self._model_name,
            backend=self._backend,
        )
    
    @property
    def dimension(self) -> int:
        """Get embedding dimension."""
        if self._dimension is None:
            # Default dimensions for common models
            dimensions = {
                "all-MiniLM-L6-v2": 384,
                "all-mpnet-base-v2": 768,
                "nomic-embed-text": 768,
                "mxbai-embed-large": 1024,
            }
            self._dimension = dimensions.get(self._model_name, 384)
        return self._dimension
    
    async def initialize(self) -> None:
        """
        Initialize the embedding model.
        
        Loads the model into memory.
        """
        if self._backend == "sentence-transformers":
            await self._init_sentence_transformers()
        elif self._backend == "ollama":
            await self._init_ollama()
        else:
            raise RAGError(
                operation="init",
                message=f"Unknown embedding backend: {self._backend}",
            )
    
    async def _init_sentence_transformers(self) -> None:
        """Initialize sentence-transformers model."""
        try:
            # Import in thread to avoid blocking
            from sentence_transformers import SentenceTransformer
            
            # Load model (this is synchronous and potentially slow)
            loop = asyncio.get_event_loop()
            self._model = await loop.run_in_executor(
                None,
                lambda: SentenceTransformer(self._model_name),
            )
            
            # Get actual dimension
            self._dimension = self._model.get_sentence_embedding_dimension()
            
            logger.info(
                "Sentence-transformers model loaded",
                model=self._model_name,
                dimension=self._dimension,
            )
        except ImportError:
            raise RAGError(
                operation="init",
                message="sentence-transformers not installed. Run: pip install sentence-transformers",
            )
        except Exception as e:
            raise RAGError(
                operation="init",
                message=f"Failed to load embedding model: {e}",
            )
    
    async def _init_ollama(self) -> None:
        """Initialize Ollama embedding client."""
        try:
            from ollama import AsyncClient
            
            self._model = AsyncClient(host=settings.OLLAMA_BASE_URL)
            
            # Test with a simple embedding to verify model
            result = await self._model.embeddings(
                model=self._model_name,
                prompt="test",
            )
            self._dimension = len(result.get("embedding", []))
            
            logger.info(
                "Ollama embedding model ready",
                model=self._model_name,
                dimension=self._dimension,
            )
        except Exception as e:
            raise RAGError(
                operation="init",
                message=f"Failed to initialize Ollama embeddings: {e}",
            )
    
    async def embed(
        self,
        texts: str | list[str],
        use_cache: bool = True,
    ) -> np.ndarray:
        """
        Generate embeddings for text(s).
        
        Args:
            texts: Single text or list of texts.
            use_cache: Whether to use cached embeddings.
        
        Returns:
            np.ndarray: Embeddings of shape (n, dimension).
        """
        if self._model is None:
            await self.initialize()
        
        # Normalize input
        if isinstance(texts, str):
            texts = [texts]
        
        if not texts:
            return np.array([]).reshape(0, self.dimension)
        
        # Check cache
        if use_cache:
            cached_results = []
            texts_to_embed = []
            text_indices = []
            
            for i, text in enumerate(texts):
                cache_key = self._cache_key(text)
                if cache_key in self._cache:
                    cached_results.append((i, self._cache[cache_key]))
                else:
                    texts_to_embed.append(text)
                    text_indices.append(i)
            
            if not texts_to_embed:
                # All cached
                embeddings = np.zeros((len(texts), self.dimension), dtype=np.float32)
                for i, emb in cached_results:
                    embeddings[i] = emb
                return embeddings
        else:
            texts_to_embed = texts
            text_indices = list(range(len(texts)))
            cached_results = []
        
        # Generate embeddings
        if self._backend == "sentence-transformers":
            new_embeddings = await self._embed_sentence_transformers(texts_to_embed)
        elif self._backend == "ollama":
            new_embeddings = await self._embed_ollama(texts_to_embed)
        else:
            raise RAGError(
                operation="embed",
                message=f"Unknown backend: {self._backend}",
            )
        
        # Update cache
        if use_cache:
            for text, emb in zip(texts_to_embed, new_embeddings):
                cache_key = self._cache_key(text)
                self._cache[cache_key] = emb
                
                # Simple cache eviction
                if len(self._cache) > self._cache_max_size:
                    # Remove oldest entry
                    oldest_key = next(iter(self._cache))
                    del self._cache[oldest_key]
        
        # Combine cached and new results
        if cached_results:
            embeddings = np.zeros((len(texts), self.dimension), dtype=np.float32)
            for i, emb in cached_results:
                embeddings[i] = emb
            for idx, emb in zip(text_indices, new_embeddings):
                embeddings[idx] = emb
        else:
            embeddings = new_embeddings
        
        return embeddings
    
    async def _embed_sentence_transformers(
        self,
        texts: list[str],
    ) -> np.ndarray:
        """Generate embeddings using sentence-transformers."""
        loop = asyncio.get_event_loop()
        
        # Run in executor to avoid blocking
        embeddings = await loop.run_in_executor(
            None,
            lambda: self._model.encode(
                texts,
                convert_to_numpy=True,
                normalize_embeddings=True,
            ),
        )
        
        return embeddings.astype(np.float32)
    
    async def _embed_ollama(self, texts: list[str]) -> np.ndarray:
        """Generate embeddings using Ollama."""
        embeddings = []
        
        for text in texts:
            result = await self._model.embeddings(
                model=self._model_name,
                prompt=text,
            )
            embeddings.append(result.get("embedding", []))
        
        return np.array(embeddings, dtype=np.float32)
    
    def _cache_key(self, text: str) -> str:
        """Generate cache key for text."""
        # Use hash for memory efficiency
        return f"{self._model_name}:{hash(text)}"
    
    def clear_cache(self) -> None:
        """Clear the embedding cache."""
        self._cache.clear()
        logger.debug("Embedding cache cleared")
    
    def get_stats(self) -> dict[str, Any]:
        """Get service statistics."""
        return {
            "model": self._model_name,
            "backend": self._backend,
            "dimension": self.dimension,
            "cache_size": len(self._cache),
            "cache_max_size": self._cache_max_size,
            "initialized": self._model is not None,
        }


# Singleton instance
_embedding_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    """Get or create the embedding service singleton."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service


async def embed_text(
    texts: str | list[str],
    model: str | None = None,
) -> np.ndarray:
    """
    Convenience function to embed text(s).
    
    Args:
        texts: Text or list of texts.
        model: Optional model override.
    
    Returns:
        np.ndarray: Embeddings.
    """
    service = get_embedding_service()
    if model and model != service._model_name:
        # Create new service with specified model
        service = EmbeddingService(model_name=model)
    
    return await service.embed(texts)

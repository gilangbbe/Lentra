"""
RAG Schemas

Request and response models for the /rag endpoints.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class DocumentChunk(BaseModel):
    """
    A chunk of a document with its embedding and metadata.
    
    Used in RAG retrieval results to show what context was used.
    """
    
    id: str = Field(description="Unique chunk identifier.")
    content: str = Field(description="Text content of the chunk.")
    score: float = Field(
        ge=0.0,
        le=1.0,
        description="Relevance score (0-1).",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Chunk metadata (source, page, etc.).",
    )
    
    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "doc1_chunk_3",
                    "content": "Quantum computing leverages quantum mechanical phenomena...",
                    "score": 0.92,
                    "metadata": {
                        "source": "quantum_intro.pdf",
                        "page": 3,
                    },
                }
            ]
        }
    }


class RAGQueryRequest(BaseModel):
    """
    Request for RAG-enabled query.
    
    Retrieves relevant context from the vector store and
    optionally passes it to specified models.
    """
    
    query: str = Field(
        ...,
        min_length=1,
        max_length=8192,
        description="Query text for retrieval.",
    )
    collection: str | None = Field(
        default=None,
        description="Specific collection to query.",
    )
    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of chunks to retrieve.",
    )
    score_threshold: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Minimum relevance score.",
    )
    include_metadata: bool = Field(
        default=True,
        description="Whether to include chunk metadata.",
    )


class RAGQueryResponse(BaseModel):
    """Response from RAG query."""
    
    query: str = Field(description="Original query.")
    chunks: list[DocumentChunk] = Field(
        description="Retrieved document chunks."
    )
    total_chunks: int = Field(description="Total chunks retrieved.")
    assembled_context: str = Field(
        description="Assembled context string for LLM.",
    )
    retrieval_latency_ms: float = Field(
        description="Retrieval latency in milliseconds.",
    )


class DocumentUploadRequest(BaseModel):
    """Request to upload and index a document."""
    
    collection: str = Field(
        default="default",
        description="Collection to add document to.",
    )
    chunk_size: int = Field(
        default=512,
        ge=100,
        le=2000,
        description="Chunk size for splitting.",
    )
    chunk_overlap: int = Field(
        default=50,
        ge=0,
        le=500,
        description="Overlap between chunks.",
    )


class DocumentInfo(BaseModel):
    """Information about an indexed document."""
    
    id: str = Field(description="Document identifier.")
    filename: str = Field(description="Original filename.")
    collection: str = Field(description="Collection name.")
    chunks: int = Field(description="Number of chunks.")
    indexed_at: datetime = Field(description="Indexing timestamp.")
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Document metadata.",
    )


class CollectionInfo(BaseModel):
    """Information about a RAG collection."""
    
    name: str = Field(description="Collection name.")
    document_count: int = Field(description="Number of documents.")
    chunk_count: int = Field(description="Total chunks.")
    created_at: datetime = Field(description="Creation timestamp.")
    embedding_model: str = Field(description="Embedding model used.")

"""
Document Chunker

Splits documents into manageable chunks for embedding and retrieval.
Supports multiple chunking strategies.
"""

import re
from typing import Any

from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)


class DocumentChunker:
    """
    Splits documents into chunks for RAG indexing.
    
    Chunking strategies:
    - Fixed size with overlap
    - Semantic (sentence-based)
    - Recursive character splitting
    
    Per architecture, chunk_size and chunk_overlap are configurable.
    """
    
    def __init__(
        self,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
        strategy: str = "recursive",
    ) -> None:
        """
        Initialize the chunker.
        
        Args:
            chunk_size: Target chunk size in characters.
            chunk_overlap: Overlap between chunks.
            strategy: Chunking strategy ('fixed', 'sentence', 'recursive').
        """
        self._chunk_size = chunk_size or settings.RAG_CHUNK_SIZE
        self._chunk_overlap = chunk_overlap or settings.RAG_CHUNK_OVERLAP
        self._strategy = strategy
        
        # Separators for recursive splitting (in order of preference)
        self._separators = [
            "\n\n",  # Paragraphs
            "\n",    # Lines
            ". ",    # Sentences
            "! ",
            "? ",
            "; ",
            ", ",
            " ",     # Words
            "",      # Characters
        ]
        
        logger.debug(
            "Chunker initialized",
            chunk_size=self._chunk_size,
            chunk_overlap=self._chunk_overlap,
            strategy=self._strategy,
        )
    
    def chunk(
        self,
        text: str,
        metadata: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """
        Split text into chunks.
        
        Args:
            text: Text to split.
            metadata: Base metadata for all chunks.
        
        Returns:
            list[dict]: Chunks with content and metadata.
        """
        if not text.strip():
            return []
        
        # Clean text
        text = self._clean_text(text)
        
        # Choose strategy
        if self._strategy == "fixed":
            raw_chunks = self._chunk_fixed(text)
        elif self._strategy == "sentence":
            raw_chunks = self._chunk_sentences(text)
        else:  # recursive
            raw_chunks = self._chunk_recursive(text, self._separators)
        
        # Build chunk objects with metadata
        chunks = []
        base_metadata = metadata or {}
        
        for i, chunk_text in enumerate(raw_chunks):
            chunk_text = chunk_text.strip()
            if not chunk_text:
                continue
            
            chunks.append({
                "content": chunk_text,
                "metadata": {
                    **base_metadata,
                    "chunk_index": i,
                    "chunk_size": len(chunk_text),
                    "total_chunks": len(raw_chunks),
                },
            })
        
        logger.debug(
            "Document chunked",
            original_length=len(text),
            chunks=len(chunks),
            strategy=self._strategy,
        )
        
        return chunks
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove null bytes
        text = text.replace('\x00', '')
        
        # Normalize unicode
        text = text.encode('utf-8', errors='ignore').decode('utf-8')
        
        return text.strip()
    
    def _chunk_fixed(self, text: str) -> list[str]:
        """
        Split into fixed-size chunks with overlap.
        
        Simple but may break in the middle of words/sentences.
        """
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + self._chunk_size
            chunk = text[start:end]
            
            if chunk:
                chunks.append(chunk)
            
            start = end - self._chunk_overlap
            
            if start >= len(text):
                break
        
        return chunks
    
    def _chunk_sentences(self, text: str) -> list[str]:
        """
        Split by sentences, combining until chunk_size is reached.
        
        Preserves sentence boundaries for better semantic coherence.
        """
        # Split into sentences
        sentence_pattern = r'(?<=[.!?])\s+'
        sentences = re.split(sentence_pattern, text)
        
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            
            # Would this exceed chunk size?
            if len(current_chunk) + len(sentence) > self._chunk_size:
                if current_chunk:
                    chunks.append(current_chunk)
                
                # If sentence itself is too long, split it
                if len(sentence) > self._chunk_size:
                    sub_chunks = self._chunk_fixed(sentence)
                    chunks.extend(sub_chunks[:-1])
                    current_chunk = sub_chunks[-1] if sub_chunks else ""
                else:
                    current_chunk = sentence
            else:
                if current_chunk:
                    current_chunk += " " + sentence
                else:
                    current_chunk = sentence
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks
    
    def _chunk_recursive(
        self,
        text: str,
        separators: list[str],
    ) -> list[str]:
        """
        Recursively split text using a hierarchy of separators.
        
        This is the LangChain-style recursive character text splitter.
        It tries to split on larger boundaries first (paragraphs),
        then falls back to smaller ones (sentences, words).
        """
        chunks = []
        
        # Base case: text is small enough
        if len(text) <= self._chunk_size:
            return [text] if text.strip() else []
        
        # Find the first separator that works
        separator = separators[0] if separators else ""
        remaining_separators = separators[1:] if len(separators) > 1 else []
        
        if separator:
            splits = text.split(separator)
        else:
            # Character-level split
            splits = list(text)
        
        # Merge splits back together respecting chunk_size
        current_chunk = ""
        
        for split in splits:
            split_with_sep = split + (separator if separator else "")
            
            # If adding this would exceed chunk_size
            if len(current_chunk) + len(split_with_sep) > self._chunk_size:
                if current_chunk:
                    # Current chunk is ready
                    if len(current_chunk) <= self._chunk_size:
                        chunks.append(current_chunk.rstrip(separator))
                    else:
                        # Need to recursively split
                        sub_chunks = self._chunk_recursive(
                            current_chunk,
                            remaining_separators,
                        )
                        chunks.extend(sub_chunks)
                
                # Start new chunk
                if len(split_with_sep) > self._chunk_size:
                    # This split itself is too large
                    sub_chunks = self._chunk_recursive(
                        split,
                        remaining_separators,
                    )
                    if sub_chunks:
                        chunks.extend(sub_chunks[:-1])
                        current_chunk = sub_chunks[-1] + (separator if separator else "")
                    else:
                        current_chunk = ""
                else:
                    current_chunk = split_with_sep
            else:
                current_chunk += split_with_sep
        
        # Don't forget the last chunk
        if current_chunk.strip():
            final_chunk = current_chunk.rstrip(separator).strip()
            if len(final_chunk) <= self._chunk_size:
                chunks.append(final_chunk)
            else:
                sub_chunks = self._chunk_recursive(
                    final_chunk,
                    remaining_separators,
                )
                chunks.extend(sub_chunks)
        
        # Add overlap between chunks
        if self._chunk_overlap > 0 and len(chunks) > 1:
            chunks = self._add_overlap(chunks)
        
        return chunks
    
    def _add_overlap(self, chunks: list[str]) -> list[str]:
        """Add overlap between consecutive chunks."""
        if len(chunks) <= 1:
            return chunks
        
        overlapped = [chunks[0]]
        
        for i in range(1, len(chunks)):
            prev_chunk = chunks[i - 1]
            curr_chunk = chunks[i]
            
            # Get overlap from previous chunk
            overlap_start = max(0, len(prev_chunk) - self._chunk_overlap)
            overlap_text = prev_chunk[overlap_start:]
            
            # Prepend overlap to current chunk
            if overlap_text:
                # Try to break at a word boundary
                space_idx = overlap_text.find(' ')
                if space_idx > 0:
                    overlap_text = overlap_text[space_idx + 1:]
                
                overlapped.append(overlap_text + " " + curr_chunk)
            else:
                overlapped.append(curr_chunk)
        
        return overlapped


def chunk_document(
    text: str,
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
    strategy: str = "recursive",
    metadata: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """
    Convenience function to chunk a document.
    
    Args:
        text: Text to chunk.
        chunk_size: Target chunk size.
        chunk_overlap: Overlap between chunks.
        strategy: Chunking strategy.
        metadata: Base metadata.
    
    Returns:
        list[dict]: Chunks with content and metadata.
    """
    chunker = DocumentChunker(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        strategy=strategy,
    )
    return chunker.chunk(text, metadata)

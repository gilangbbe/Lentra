"""
RAG Routes

Handles endpoints for RAG (Retrieval-Augmented Generation) operations.
"""

from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from src.core.config import settings
from src.core.exceptions import RAGError
from src.core.logging import get_logger
from src.rag.engine import get_rag_engine
from src.schemas.rag import (
    CollectionInfo,
    DocumentInfo,
    RAGQueryRequest,
    RAGQueryResponse,
)

logger = get_logger(__name__)
router = APIRouter()


@router.post("/query", response_model=RAGQueryResponse)
async def query_rag(request: RAGQueryRequest) -> RAGQueryResponse:
    """
    Query the RAG system for relevant context.
    
    Retrieves document chunks from the vector store that are
    semantically similar to the query.
    
    Args:
        request: RAG query parameters.
    
    Returns:
        RAGQueryResponse: Retrieved chunks and assembled context.
    
    Raises:
        HTTPException: If RAG is disabled or retrieval fails.
    """
    if not settings.RAG_ENABLED:
        raise HTTPException(
            status_code=400,
            detail="RAG is disabled. Enable it in configuration.",
        )

    logger.info(
        "Processing RAG query",
        query_length=len(request.query),
        top_k=request.top_k,
        collection=request.collection,
    )

    try:
        engine = get_rag_engine()
        response = await engine.retrieve(
            query=request.query,
            top_k=request.top_k,
            collection=request.collection,
            score_threshold=request.score_threshold,
        )

        logger.info(
            "RAG query completed",
            chunks_found=response.total_chunks,
            latency_ms=response.retrieval_latency_ms,
        )

        return response

    except RAGError as e:
        logger.error("RAG query failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error("Unexpected error in RAG query", error=str(e))
        raise HTTPException(status_code=500, detail="RAG query failed")


@router.post("/documents", response_model=DocumentInfo)
async def upload_document(
    file: UploadFile = File(...),
    collection: str = Form(default="default"),
    chunk_size: int = Form(default=512),
    chunk_overlap: int = Form(default=50),
) -> DocumentInfo:
    """
    Upload and index a document for RAG.
    
    Supports PDF, DOCX, and plain text files.
    
    Args:
        file: Document file to upload.
        collection: Collection to add document to.
        chunk_size: Size of text chunks.
        chunk_overlap: Overlap between chunks.
    
    Returns:
        DocumentInfo: Information about the indexed document.
    
    Raises:
        HTTPException: If upload or indexing fails.
    """
    if not settings.RAG_ENABLED:
        raise HTTPException(
            status_code=400,
            detail="RAG is disabled. Enable it in configuration.",
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required.",
        )

    logger.info(
        "Processing document upload",
        filename=file.filename,
        collection=collection,
        chunk_size=chunk_size,
    )

    # Validate file type
    allowed_types = {".pdf", ".docx", ".txt", ".md"}
    file_ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""

    if file_ext not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {allowed_types}",
        )

    try:
        # Read file content
        content_bytes = await file.read()

        # Extract text based on file type
        if file_ext == ".pdf":
            # PDF extraction
            try:
                import io

                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(content_bytes))
                content = "\n".join(page.extract_text() for page in reader.pages if page.extract_text())
            except ImportError:
                raise HTTPException(
                    status_code=500,
                    detail="PDF support requires pypdf. Install with: pip install pypdf",
                )
        elif file_ext == ".docx":
            # DOCX extraction
            try:
                import io

                from docx import Document
                doc = Document(io.BytesIO(content_bytes))
                content = "\n".join(para.text for para in doc.paragraphs if para.text)
            except ImportError:
                raise HTTPException(
                    status_code=500,
                    detail="DOCX support requires python-docx. Install with: pip install python-docx",
                )
        else:
            # Plain text (.txt, .md)
            content = content_bytes.decode("utf-8")

        if not content.strip():
            raise HTTPException(
                status_code=400,
                detail="Document is empty or could not extract text.",
            )

        # Index the document
        engine = get_rag_engine()
        doc_info = await engine.index_document(
            content=content,
            filename=file.filename,
            collection=collection,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            metadata={"file_type": file_ext},
        )

        logger.info(
            "Document indexed successfully",
            doc_id=doc_info.id,
            chunks=doc_info.chunks,
        )

        return doc_info

    except RAGError as e:
        logger.error("Document indexing failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Unexpected error in document upload", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to process document: {e}")


@router.get("/documents")
async def list_documents(collection: str | None = None) -> dict[str, Any]:
    """
    List indexed documents.
    
    Args:
        collection: Filter by collection name.
    
    Returns:
        List of indexed documents.
    """
    if not settings.RAG_ENABLED:
        raise HTTPException(
            status_code=400,
            detail="RAG is disabled.",
        )

    try:
        engine = get_rag_engine()
        documents = await engine.list_documents(collection)

        return {
            "documents": documents,
            "total": len(documents),
            "collection": collection,
        }
    except RAGError as e:
        logger.error("Failed to list documents", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str) -> dict[str, str]:
    """
    Delete an indexed document.
    
    Args:
        document_id: Document to delete.
    
    Returns:
        Status message.
    """
    if not settings.RAG_ENABLED:
        raise HTTPException(
            status_code=400,
            detail="RAG is disabled.",
        )

    logger.info("Deleting document", document_id=document_id)

    try:
        engine = get_rag_engine()
        deleted = await engine.delete_document(document_id)

        if deleted:
            return {"status": "deleted", "document_id": document_id}
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Document not found: {document_id}",
            )
    except RAGError as e:
        logger.error("Failed to delete document", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/collections")
async def list_collections() -> dict[str, Any]:
    """
    List RAG collections.
    
    Returns:
        List of collections with stats.
    """
    if not settings.RAG_ENABLED:
        raise HTTPException(
            status_code=400,
            detail="RAG is disabled.",
        )

    try:
        engine = get_rag_engine()
        collection_names = await engine.list_collections()

        # Get info for each collection
        collections = []
        for name in collection_names:
            info = await engine.get_collection_info(name)
            if info:
                collections.append(info)

        return {
            "collections": [c.model_dump() for c in collections],
            "total": len(collections),
        }
    except RAGError as e:
        logger.error("Failed to list collections", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/collections/{collection_name}", response_model=CollectionInfo)
async def get_collection(collection_name: str) -> CollectionInfo:
    """
    Get information about a specific collection.
    
    Args:
        collection_name: Name of the collection.
    
    Returns:
        CollectionInfo: Collection details.
    """
    if not settings.RAG_ENABLED:
        raise HTTPException(
            status_code=400,
            detail="RAG is disabled.",
        )

    try:
        engine = get_rag_engine()
        info = await engine.get_collection_info(collection_name)

        if not info:
            raise HTTPException(
                status_code=404,
                detail=f"Collection not found: {collection_name}",
            )

        return info
    except RAGError as e:
        logger.error("Failed to get collection", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/collections/{collection_name}")
async def clear_collection(collection_name: str) -> dict[str, Any]:
    """
    Clear all documents from a collection.
    
    Args:
        collection_name: Collection to clear.
    
    Returns:
        Status and count of removed documents.
    """
    if not settings.RAG_ENABLED:
        raise HTTPException(
            status_code=400,
            detail="RAG is disabled.",
        )

    logger.info("Clearing collection", collection=collection_name)

    try:
        engine = get_rag_engine()
        count = await engine.clear_collection(collection_name)

        return {
            "status": "cleared",
            "collection": collection_name,
            "documents_removed": count,
        }
    except RAGError as e:
        logger.error("Failed to clear collection", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_rag_stats() -> dict[str, Any]:
    """
    Get RAG system statistics.
    
    Returns:
        System stats including vector store and embedding info.
    """
    if not settings.RAG_ENABLED:
        raise HTTPException(
            status_code=400,
            detail="RAG is disabled.",
        )

    try:
        engine = get_rag_engine()
        return engine.get_stats()
    except RAGError as e:
        logger.error("Failed to get stats", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

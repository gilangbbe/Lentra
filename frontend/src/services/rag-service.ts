/**
 * RAG Service
 *
 * API service for RAG (Retrieval-Augmented Generation) operations.
 */

import { apiClient } from "@/lib/api-client";
import type {
  RagQueryRequest,
  RagQueryResponse,
  DocumentInfo,
  CollectionInfo,
  RAGStatus,
  TextIngestRequest,
} from "@/types";

/**
 * Get RAG system status.
 */
export async function getRagStatus(): Promise<RAGStatus> {
  const response = await apiClient.get<RAGStatus>("/rag/status");
  return response.data;
}

/**
 * Query the RAG system for relevant context.
 */
export async function queryRag(request: RagQueryRequest): Promise<RagQueryResponse> {
  const response = await apiClient.post<RagQueryResponse>("/rag/query", {
    query: request.query,
    collection: request.collection,
    top_k: request.topK,
    score_threshold: request.scoreThreshold,
    include_metadata: request.includeMetadata,
  });
  return response.data;
}

/**
 * Upload a document for indexing.
 */
export async function uploadDocument(
  file: File,
  collection: string = "default",
  chunkSize: number = 512,
  chunkOverlap: number = 50
): Promise<DocumentInfo> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("collection", collection);
  formData.append("chunk_size", chunkSize.toString());
  formData.append("chunk_overlap", chunkOverlap.toString());

  // Let axios set the Content-Type automatically with the correct boundary
  const response = await apiClient.post<DocumentInfo>("/rag/documents", formData);
  return response.data;
}

/**
 * Ingest text directly (without file upload).
 */
export async function ingestText(request: TextIngestRequest): Promise<DocumentInfo> {
  const response = await apiClient.post<DocumentInfo>("/rag/ingest", {
    text: request.text,
    title: request.title,
    collection: request.collection,
    chunk_size: request.chunkSize,
    chunk_overlap: request.chunkOverlap,
    metadata: request.metadata,
  });
  return response.data;
}

/**
 * List indexed documents.
 */
export async function listDocuments(
  collection?: string
): Promise<{ documents: DocumentInfo[]; total: number }> {
  const params = collection ? { collection } : {};
  const response = await apiClient.get<{ documents: DocumentInfo[]; total: number }>(
    "/rag/documents",
    { params }
  );
  return response.data;
}

/**
 * Delete a document.
 */
export async function deleteDocument(
  documentId: string
): Promise<{ status: string; documentId: string }> {
  const response = await apiClient.delete<{ status: string; document_id: string }>(
    `/rag/documents/${documentId}`
  );
  return {
    status: response.data.status,
    documentId: response.data.document_id,
  };
}

/**
 * List collections.
 */
export async function listCollections(): Promise<{
  collections: CollectionInfo[];
  total: number;
}> {
  const response = await apiClient.get<{ collections: CollectionInfo[]; total: number }>(
    "/rag/collections"
  );
  return response.data;
}

/**
 * Get collection info.
 */
export async function getCollectionInfo(name: string): Promise<CollectionInfo> {
  const response = await apiClient.get<CollectionInfo>(`/rag/collections/${name}`);
  return response.data;
}

/**
 * Clear a collection.
 */
export async function clearCollection(name: string): Promise<{
  status: string;
  collection: string;
  documentsRemoved: number;
}> {
  const response = await apiClient.delete<{
    status: string;
    collection: string;
    documents_removed: number;
  }>(`/rag/collections/${name}`);
  return {
    status: response.data.status,
    collection: response.data.collection,
    documentsRemoved: response.data.documents_removed,
  };
}

/**
 * Get RAG statistics.
 */
export async function getRagStats(): Promise<Record<string, unknown>> {
  const response = await apiClient.get<Record<string, unknown>>("/rag/stats");
  return response.data;
}

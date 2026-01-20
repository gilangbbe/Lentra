/**
 * Lentra Frontend - Type Definitions
 *
 * Shared TypeScript types for the frontend application.
 * These types mirror the backend Pydantic models for consistency.
 */

// =============================================================================
// Model Types
// =============================================================================

/**
 * Response from a single model generation.
 */
export interface ModelResponse {
  modelId: string;
  text: string;
  latencyMs: number;
  tokens: number;
  promptTokens?: number;
  finishReason?: "stop" | "length" | "error";
  metadata?: Record<string, unknown>;
}

/**
 * Character visual configuration.
 */
export interface CharacterVisual {
  type: "2D" | "2.5D" | "3D";
  primaryColor: string;
  aura?: string;
  animation: string;
  avatarUrl?: string;
}

/**
 * Model character definition.
 */
export interface ModelCharacter {
  name: string;
  traits: string[];
  visual: CharacterVisual;
}

/**
 * Full model information.
 */
export interface ModelInfo {
  id: string;
  backend: string;
  name: string;
  description?: string;
  available: boolean;
  loaded: boolean;
  totalRequests: number;
  avgLatencyMs?: number;
  lastUsed?: string;
  character?: ModelCharacter;
  contextLength: number;
  supportsStreaming: boolean;
}

// =============================================================================
// Prompt Types
// =============================================================================

/**
 * Generation parameters.
 */
export interface GenerationParams {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stop?: string[];
  repeatPenalty?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

/**
 * RAG retrieval parameters.
 */
export interface RAGParams {
  topK?: number;
  scoreThreshold?: number;
  collection?: string;
  includeSources?: boolean;
  contextTemplate?: string;
}

/**
 * Request to submit a prompt.
 */
export interface PromptRequest {
  prompt: string;
  systemPrompt?: string;
  instructionPrompt?: string;
  modelIds?: string[];
  useRag?: boolean;
  ragParams?: RAGParams;
  contextText?: string;
  params?: GenerationParams;
  stream?: boolean;
}

/**
 * Response from prompt submission.
 */
export interface PromptResponse {
  prompt: string;
  responses: ModelResponse[];
  ragContext?: string;
  totalLatencyMs: number;
}

// =============================================================================
// RAG Types
// =============================================================================

/**
 * Retrieved document chunk.
 */
export interface DocumentChunk {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/**
 * RAG query request.
 */
export interface RagQueryRequest {
  query: string;
  collection?: string;
  topK?: number;
  scoreThreshold?: number;
  includeMetadata?: boolean;
}

/**
 * RAG query response.
 */
export interface RagQueryResponse {
  query: string;
  chunks: DocumentChunk[];
  totalChunks: number;
  assembledContext: string;
  retrievalLatencyMs: number;
}

/**
 * Document information.
 */
export interface DocumentInfo {
  id: string;
  filename: string;
  collection: string;
  chunks: number;
  indexedAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * RAG collection information.
 */
export interface CollectionInfo {
  name: string;
  documentCount: number;
  chunkCount: number;
  createdAt: string;
  embeddingModel: string;
}

/**
 * RAG status response.
 */
export interface RAGStatus {
  enabled: boolean;
  initialized: boolean;
  embeddingModel: string;
  chunkSize: number;
  chunkOverlap: number;
  topK: number;
  totalDocuments?: number;
  totalChunks?: number;
}

/**
 * Text ingest request.
 */
export interface TextIngestRequest {
  text: string;
  title?: string;
  collection?: string;
  chunkSize?: number;
  chunkOverlap?: number;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Evaluation Types
// =============================================================================

/**
 * Evaluation score for a single response.
 */
export interface EvaluationScore {
  modelId: string;
  relevance: number;
  clarity: number;
  hallucinationRisk: number;
  finalScore: number;
  reasoning?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Evaluation mode options.
 */
export type EvaluationMode =
  | "heuristic"
  | "embedding_similarity"
  | "llm_judge"
  | "human_vote"
  | "ensemble";

/**
 * Evaluate request.
 */
export interface EvaluateRequest {
  prompt: string;
  responses: ModelResponse[];
  mode?: EvaluationMode;
  referenceText?: string;
  weights?: Record<string, number>;
  judgeModelId?: string;
}

/**
 * Evaluate response.
 */
export interface EvaluateResponse {
  mode: string;
  scores: EvaluationScore[];
  winner?: string;
  ranking: string[];
  ensembleOutput?: string;
  evaluationLatencyMs: number;
}

// =============================================================================
// UI State Types
// =============================================================================

/**
 * Application view modes.
 */
export type ViewMode = "arena" | "comparison" | "rag-inspector" | "model-profile";

/**
 * Theme options.
 */
export type Theme = "light" | "dark" | "system";

/**
 * Toast notification type.
 */
export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

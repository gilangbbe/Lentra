/**
 * Lentra Common Types
 *
 * Shared type definitions for API contracts between frontend and backend.
 * These types define the canonical shape of data exchanged over the wire.
 *
 * Naming Conventions:
 * - API types use snake_case to match Python/FastAPI conventions
 * - Frontend can transform to camelCase in the API client layer
 */

// =============================================================================
// Model Types
// =============================================================================

/**
 * Supported LLM backend providers.
 */
export type ModelBackend = "ollama" | "llamacpp" | "huggingface" | "openai" | "anthropic";

/**
 * Model availability status.
 */
export type ModelStatus = "available" | "loading" | "not_found" | "error";

/**
 * Model information returned from backend.
 */
export interface ModelInfo {
  id: string;
  name: string;
  backend: ModelBackend;
  size_bytes?: number;
  parameter_count?: string;
  quantization?: string;
  context_length?: number;
  status: ModelStatus;
  metadata?: Record<string, unknown>;
}

/**
 * Model generation parameters.
 */
export interface GenerationParams {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  stop_sequences?: string[];
  repeat_penalty?: number;
  seed?: number;
}

// =============================================================================
// Prompt Types
// =============================================================================

/**
 * System persona definition.
 */
export interface Persona {
  id: string;
  name: string;
  description?: string;
  system_prompt: string;
  avatar_emoji?: string;
  color?: string;
}

/**
 * Request to run a prompt against multiple models.
 */
export interface PromptRequest {
  prompt: string;
  model_ids: string[];
  persona?: Persona;
  generation_params?: GenerationParams;
  stream?: boolean;
}

/**
 * Response from a single model.
 */
export interface ModelResponse {
  model_id: string;
  model_name: string;
  response_text: string;
  latency_ms: number;
  token_count: number;
  tokens_per_second?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated response from running prompt against multiple models.
 */
export interface PromptResponse {
  request_id: string;
  prompt: string;
  responses: ModelResponse[];
  created_at: string;
}

// =============================================================================
// Streaming Types
// =============================================================================

/**
 * Chunk emitted during streaming response.
 */
export interface StreamChunk {
  model_id: string;
  chunk: string;
  done: boolean;
  token_count?: number;
}

/**
 * WebSocket message types.
 */
export type WSMessageType =
  | "stream_start"
  | "stream_chunk"
  | "stream_end"
  | "stream_error"
  | "ping"
  | "pong";

/**
 * WebSocket message envelope.
 */
export interface WSMessage {
  type: WSMessageType;
  request_id: string;
  payload: StreamChunk | { error: string } | Record<string, never>;
  timestamp: string;
}

// =============================================================================
// RAG Types
// =============================================================================

/**
 * Document chunk stored in vector database.
 */
export interface DocumentChunk {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
}

/**
 * Retrieved context for RAG.
 */
export interface RetrievedContext {
  chunks: DocumentChunk[];
  query: string;
  similarity_scores: number[];
}

/**
 * RAG query request.
 */
export interface RAGQueryRequest {
  query: string;
  top_k?: number;
  similarity_threshold?: number;
  filters?: Record<string, unknown>;
}

/**
 * Document ingestion request.
 */
export interface IngestRequest {
  content: string;
  source_id: string;
  metadata?: Record<string, unknown>;
  chunk_size?: number;
  chunk_overlap?: number;
}

/**
 * Document ingestion response.
 */
export interface IngestResponse {
  source_id: string;
  chunks_created: number;
  status: "success" | "partial" | "error";
  message?: string;
}

// =============================================================================
// Evaluation Types
// =============================================================================

/**
 * Comparison mode for model evaluation.
 */
export type CompareMode =
  | "heuristic"
  | "embedding"
  | "llm_judge"
  | "human_vote"
  | "ensemble";

/**
 * Individual model score.
 */
export interface ModelScore {
  model_id: string;
  score: number;
  reasoning?: string;
  breakdown?: Record<string, number>;
}

/**
 * Comparison request.
 */
export interface CompareRequest {
  prompt: string;
  responses: ModelResponse[];
  mode: CompareMode;
  criteria?: string[];
  reference_answer?: string;
}

/**
 * Comparison result.
 */
export interface CompareResult {
  request_id: string;
  mode: CompareMode;
  winner?: string;
  is_tie: boolean;
  scores: ModelScore[];
  reasoning?: string;
  evaluated_at: string;
}

/**
 * Human vote input.
 */
export interface HumanVote {
  comparison_id: string;
  winner_model_id: string;
  voter_notes?: string;
}

// =============================================================================
// Session Types
// =============================================================================

/**
 * Arena session containing history.
 */
export interface ArenaSession {
  id: string;
  name?: string;
  created_at: string;
  updated_at: string;
  exchanges: PromptExchange[];
  selected_models: string[];
  active_persona?: Persona;
}

/**
 * Single prompt-response exchange in a session.
 */
export interface PromptExchange {
  id: string;
  prompt: string;
  responses: ModelResponse[];
  comparison?: CompareResult;
  human_vote?: HumanVote;
  timestamp: string;
}

// =============================================================================
// API Response Wrappers
// =============================================================================

/**
 * Standard success response wrapper.
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
  };
}

/**
 * Standard error response.
 */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Union type for API responses.
 */
export type ApiResult<T> = ApiResponse<T> | ApiError;

// =============================================================================
// Health & Status Types
// =============================================================================

/**
 * Backend health status.
 */
export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  uptime_seconds: number;
  components: {
    ollama: ComponentStatus;
    vector_store: ComponentStatus;
  };
}

/**
 * Component status.
 */
export interface ComponentStatus {
  status: "up" | "down" | "unknown";
  latency_ms?: number;
  message?: string;
}

// =============================================================================
// Type Guards
// =============================================================================

export function isApiError(result: ApiResult<unknown>): result is ApiError {
  return result.success === false;
}

export function isApiSuccess<T>(result: ApiResult<T>): result is ApiResponse<T> {
  return result.success === true;
}

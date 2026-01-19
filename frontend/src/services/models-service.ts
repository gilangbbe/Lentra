/**
 * Models Service
 *
 * API service for model-related operations.
 */

import { apiClient } from "@/lib/api-client";
import type { ModelInfo } from "@/types";

interface ModelListResponse {
  models: ModelInfo[];
  total: number;
}

/**
 * Get list of all available models.
 *
 * @returns Promise resolving to list of models
 */
export async function getModels(): Promise<ModelInfo[]> {
  const response = await apiClient.get<ModelListResponse>("/models");
  return response.data.models;
}

/**
 * Get detailed information about a specific model.
 *
 * @param modelId - Model identifier
 * @returns Promise resolving to model info
 */
export async function getModelInfo(modelId: string): Promise<ModelInfo> {
  const response = await apiClient.get<ModelInfo>(`/models/${modelId}`);
  return response.data;
}

/**
 * Pre-load a model into memory.
 *
 * @param modelId - Model to load
 */
export async function loadModel(modelId: string): Promise<void> {
  await apiClient.post(`/models/${modelId}/load`);
}

/**
 * Unload a model from memory.
 *
 * @param modelId - Model to unload
 */
export async function unloadModel(modelId: string): Promise<void> {
  await apiClient.post(`/models/${modelId}/unload`);
}

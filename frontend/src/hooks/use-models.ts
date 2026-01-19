/**
 * useModels Hook
 *
 * Custom hook for accessing and managing model state.
 */

import { useEffect } from "react";
import { useModelsStore } from "@/stores/models-store";

/**
 * Hook for managing models with automatic fetching.
 */
export function useModels() {
  const {
    models,
    selectedModelIds,
    isLoading,
    error,
    fetchModels,
    selectModel,
    deselectModel,
    toggleModel,
    selectAllModels,
    deselectAllModels,
    clearError,
  } = useModelsStore();

  // Fetch models on mount
  useEffect(() => {
    if (models.length === 0) {
      void fetchModels();
    }
  }, [models.length, fetchModels]);

  // Computed values
  const selectedModels = models.filter((m) => selectedModelIds.includes(m.id));
  const availableModels = models.filter((m) => m.available);
  const hasModels = models.length > 0;
  const hasSelectedModels = selectedModelIds.length > 0;

  return {
    // State
    models,
    selectedModelIds,
    selectedModels,
    availableModels,
    isLoading,
    error,
    hasModels,
    hasSelectedModels,

    // Actions
    fetchModels,
    selectModel,
    deselectModel,
    toggleModel,
    selectAllModels,
    deselectAllModels,
    clearError,
  };
}

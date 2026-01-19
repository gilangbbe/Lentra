/**
 * usePrompt Hook
 *
 * Custom hook for prompt submission and response handling.
 */

import { useCallback } from "react";
import { usePromptStore } from "@/stores/prompt-store";
import { useModelsStore } from "@/stores/models-store";

/**
 * Hook for managing prompt state and submission.
 */
export function usePrompt() {
  const {
    currentPrompt,
    responses,
    ragContext,
    isLoading,
    error,
    history,
    params,
    setPrompt,
    setParams,
    submitCurrentPrompt,
    clearResponses,
    clearHistory,
    clearError,
  } = usePromptStore();

  const { selectedModelIds } = useModelsStore();

  // Submit with currently selected models
  const submit = useCallback(
    async (useRag = false) => {
      await submitCurrentPrompt(selectedModelIds, useRag);
    },
    [selectedModelIds, submitCurrentPrompt]
  );

  // Computed values
  const hasResponses = responses.length > 0;
  const canSubmit = currentPrompt.trim().length > 0 && selectedModelIds.length > 0 && !isLoading;

  return {
    // State
    currentPrompt,
    responses,
    ragContext,
    isLoading,
    error,
    history,
    params,
    hasResponses,
    canSubmit,

    // Actions
    setPrompt,
    setParams,
    submit,
    clearResponses,
    clearHistory,
    clearError,
  };
}

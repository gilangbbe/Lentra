/**
 * Prompt Store
 *
 * Zustand store for managing prompt and response state.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { PromptResponse, ModelResponse, GenerationParams } from "@/types";
import { submitPrompt } from "@/services/prompt-service";

interface PromptState {
  // State
  currentPrompt: string;
  responses: ModelResponse[];
  ragContext: string | null;
  isLoading: boolean;
  error: string | null;
  history: PromptResponse[];
  params: GenerationParams;

  // Actions
  setPrompt: (prompt: string) => void;
  setParams: (params: Partial<GenerationParams>) => void;
  submitCurrentPrompt: (modelIds: string[], useRag?: boolean) => Promise<void>;
  clearResponses: () => void;
  clearHistory: () => void;
  clearError: () => void;
}

const defaultParams: GenerationParams = {
  temperature: 0.7,
  maxTokens: 1024,
  topP: 0.9,
  topK: 40,
};

export const usePromptStore = create<PromptState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentPrompt: "",
      responses: [],
      ragContext: null,
      isLoading: false,
      error: null,
      history: [],
      params: defaultParams,

      // Actions
      setPrompt: (prompt: string) => {
        set({ currentPrompt: prompt });
      },

      setParams: (params: Partial<GenerationParams>) => {
        set({ params: { ...get().params, ...params } });
      },

      submitCurrentPrompt: async (modelIds: string[], useRag = false) => {
        const { currentPrompt, params, history } = get();

        if (!currentPrompt.trim()) {
          set({ error: "Please enter a prompt" });
          return;
        }

        if (modelIds.length === 0) {
          set({ error: "Please select at least one model" });
          return;
        }

        set({ isLoading: true, error: null, responses: [], ragContext: null });

        try {
          const response = await submitPrompt({
            prompt: currentPrompt,
            modelIds,
            useRag,
            params,
          });

          set({
            responses: response.responses,
            ragContext: response.ragContext ?? null,
            isLoading: false,
            history: [response, ...history].slice(0, 50), // Keep last 50
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to submit prompt",
            isLoading: false,
          });
        }
      },

      clearResponses: () => {
        set({ responses: [], ragContext: null, error: null });
      },

      clearHistory: () => {
        set({ history: [] });
      },

      clearError: () => set({ error: null }),
    }),
    { name: "prompt-store" }
  )
);

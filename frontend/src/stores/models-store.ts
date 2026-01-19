/**
 * Models Store
 *
 * Zustand store for managing model state.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { ModelInfo } from "@/types";
import { getModels, loadModel, unloadModel } from "@/services/models-service";

interface ModelsState {
  // State
  models: ModelInfo[];
  selectedModelIds: string[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchModels: () => Promise<void>;
  selectModel: (modelId: string) => void;
  deselectModel: (modelId: string) => void;
  toggleModel: (modelId: string) => void;
  selectAllModels: () => void;
  deselectAllModels: () => void;
  loadModelById: (modelId: string) => Promise<void>;
  unloadModelById: (modelId: string) => Promise<void>;
  clearError: () => void;
}

export const useModelsStore = create<ModelsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      models: [],
      selectedModelIds: [],
      isLoading: false,
      error: null,

      // Actions
      fetchModels: async () => {
        set({ isLoading: true, error: null });
        try {
          const models = await getModels();
          set({ models, isLoading: false });

          // Auto-select first model if none selected
          if (get().selectedModelIds.length === 0 && models.length > 0 && models[0]) {
            set({ selectedModelIds: [models[0].id] });
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to fetch models",
            isLoading: false,
          });
        }
      },

      selectModel: (modelId: string) => {
        const { selectedModelIds } = get();
        if (!selectedModelIds.includes(modelId)) {
          set({ selectedModelIds: [...selectedModelIds, modelId] });
        }
      },

      deselectModel: (modelId: string) => {
        const { selectedModelIds } = get();
        set({ selectedModelIds: selectedModelIds.filter((id) => id !== modelId) });
      },

      toggleModel: (modelId: string) => {
        const { selectedModelIds, selectModel, deselectModel } = get();
        if (selectedModelIds.includes(modelId)) {
          deselectModel(modelId);
        } else {
          selectModel(modelId);
        }
      },

      selectAllModels: () => {
        const { models } = get();
        set({ selectedModelIds: models.map((m) => m.id) });
      },

      deselectAllModels: () => {
        set({ selectedModelIds: [] });
      },

      loadModelById: async (modelId: string) => {
        try {
          await loadModel(modelId);
          // Refresh models to get updated loaded state
          await get().fetchModels();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to load model",
          });
        }
      },

      unloadModelById: async (modelId: string) => {
        try {
          await unloadModel(modelId);
          await get().fetchModels();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to unload model",
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    { name: "models-store" }
  )
);

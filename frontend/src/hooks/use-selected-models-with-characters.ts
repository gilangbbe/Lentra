/**
 * useSelectedModelsWithCharacters Hook
 *
 * Custom hook to get selected models along with their assigned 3D characters.
 */

import { useMemo } from "react";
import { useModels } from "./use-models";
import { useCharacterAssignmentStore, type Character3D } from "@/stores/character-assignment-store";
import type { SelectedModelWithCharacter } from "@/components/game/game-arena-scene";

/**
 * Hook that combines selected models with their character assignments.
 */
export function useSelectedModelsWithCharacters() {
  const { models, selectedModelIds, selectedModels } = useModels();
  const { assignments, getCharacterForModel } = useCharacterAssignmentStore();

  // Build list of selected models with their character assignments
  const selectedModelsWithCharacters = useMemo((): SelectedModelWithCharacter[] => {
    return selectedModels
      .filter((model) => assignments[model.id]) // Only include models with character assignments
      .map((model) => ({
        modelId: model.id,
        modelName: model.name,
        characterId: assignments[model.id] as Character3D,
      }));
  }, [selectedModels, assignments]);

  // Check if all selected models have character assignments
  const allSelectedHaveCharacters = useMemo(() => {
    return selectedModelIds.every((id) => assignments[id]);
  }, [selectedModelIds, assignments]);

  return {
    selectedModelsWithCharacters,
    allSelectedHaveCharacters,
    selectedCount: selectedModelIds.length,
    readyCount: selectedModelsWithCharacters.length,
  };
}

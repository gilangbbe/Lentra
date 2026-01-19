/**
 * Character Assignment Store
 * 
 * Zustand store for managing which 3D character represents each LLM model.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// Available 3D character models
export type Character3D = "lizard_wizard" | "skull_knight";

export interface Character3DInfo {
  id: Character3D;
  name: string;
  modelPath: string;
  description: string;
  primaryColor: string;
}

export const AVAILABLE_CHARACTERS: Character3DInfo[] = [
  {
    id: "lizard_wizard",
    name: "Lizard Wizard",
    modelPath: "/models/lizard_wizard.glb",
    description: "A mystical lizard wielding arcane powers",
    primaryColor: "#4ade80", // green
  },
  {
    id: "skull_knight",
    name: "Skull Knight",
    modelPath: "/models/skull_knight.glb",
    description: "A fearsome undead warrior from the abyss",
    primaryColor: "#a855f7", // purple
  },
];

interface CharacterAssignmentState {
  // Map of modelId -> characterId
  assignments: Record<string, Character3D>;
  
  // Actions
  assignCharacter: (modelId: string, characterId: Character3D) => void;
  removeAssignment: (modelId: string) => void;
  getCharacterForModel: (modelId: string) => Character3DInfo | null;
  clearAllAssignments: () => void;
}

export const useCharacterAssignmentStore = create<CharacterAssignmentState>()(
  devtools(
    persist(
      (set, get) => ({
        assignments: {},

        assignCharacter: (modelId: string, characterId: Character3D) => {
          set((state) => ({
            assignments: {
              ...state.assignments,
              [modelId]: characterId,
            },
          }));
        },

        removeAssignment: (modelId: string) => {
          set((state) => {
            const { [modelId]: _, ...rest } = state.assignments;
            return { assignments: rest };
          });
        },

        getCharacterForModel: (modelId: string) => {
          const characterId = get().assignments[modelId];
          if (!characterId) return null;
          return AVAILABLE_CHARACTERS.find((c) => c.id === characterId) || null;
        },

        clearAllAssignments: () => {
          set({ assignments: {} });
        },
      }),
      {
        name: "lentra-character-assignments",
      }
    )
  )
);

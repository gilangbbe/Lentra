"use client";

/**
 * Character Select Arena
 * 
 * A game-style character selection screen that displays all available
 * LLM models as selectable characters with stunning visual effects.
 * Users can assign a 3D character to represent each LLM model.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Swords, Users, Sparkles } from "lucide-react";
import { useModels } from "@/hooks/use-models";
import { CharacterCard } from "./character-card";
import { FloatingIslandScene } from "./floating-island-scene";
import { CharacterPicker } from "./character-picker";
import { useCharacterAssignmentStore } from "@/stores/character-assignment-store";
import { cn } from "@/lib/utils";

interface CharacterSelectArenaProps {
  onBattleReady?: () => void;
  className?: string;
}

export function CharacterSelectArena({ onBattleReady, className }: CharacterSelectArenaProps) {
  const {
    models,
    selectedModelIds,
    isLoading,
    error,
    toggleModel,
    fetchModels,
  } = useModels();

  const { assignments } = useCharacterAssignmentStore();
  const [mounted, setMounted] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedModelForPicker, setSelectedModelForPicker] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle model card click - open character picker
  const handleModelSelect = (modelId: string, modelName: string) => {
    // If already selected and has character, toggle off
    if (selectedModelIds.includes(modelId) && assignments[modelId]) {
      toggleModel(modelId);
      return;
    }
    // Open character picker for new selection or to change character
    setSelectedModelForPicker({ id: modelId, name: modelName });
    setPickerOpen(true);
  };

  // Handle picker close
  const handlePickerClose = () => {
    // If user selected a character, also select the model
    if (selectedModelForPicker && assignments[selectedModelForPicker.id]) {
      if (!selectedModelIds.includes(selectedModelForPicker.id)) {
        toggleModel(selectedModelForPicker.id);
      }
    }
    setPickerOpen(false);
    setSelectedModelForPicker(null);
  };

  const selectedCount = selectedModelIds.length;
  // Can only start battle if all selected models have character assignments
  const allSelectedHaveCharacters = selectedModelIds.every((id) => assignments[id]);
  const canStartBattle = selectedCount >= 1 && allSelectedHaveCharacters;

  return (
    <div className={cn("relative min-h-screen overflow-hidden", className)}>
      {/* 3D Floating Island Background */}
      {mounted && (
        <div className="fixed inset-0 -z-5">
          <FloatingIslandScene showIsland={true} intensity="medium" />
        </div>
      )}

      {/* Gradient overlay for readability */}
      <div className="fixed inset-0 bg-gradient-to-b from-sky-900/40 via-transparent to-sky-950/60 -z-4 pointer-events-none" />

      {/* Animated background fallback */}
      <div className="fixed inset-0 bg-gradient-to-br from-sky-400 via-blue-500 to-sky-600 -z-10" />

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-white mb-2 tracking-wider">
            <span className="bg-gradient-to-r from-sky-100 via-white to-sky-100 bg-clip-text text-transparent drop-shadow-lg">
              SELECT YOUR CHAMPIONS
            </span>
          </h1>
          <p className="text-sky-100 text-sm">
            Choose the AI models to compete in the arena
          </p>
        </motion.div>

        {/* Selection counter */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/20 border border-white/30 backdrop-blur-sm"
        >
          <Users className="w-5 h-5 text-white" />
          <span className="text-white font-medium">
            <span className="text-sky-100 font-bold">{selectedCount}</span>
            <span className="text-sky-200 mx-1">/</span>
            <span className="text-sky-100">{models.length}</span>
            <span className="text-sky-200 ml-2">Selected</span>
          </span>
        </motion.div>
      </header>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-12 h-12 text-sky-200" />
          </motion.div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-md mx-auto mt-20 p-6 rounded-xl bg-red-950/50 border border-red-500/30 text-center"
        >
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => void fetchModels()}
            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      )}

      {/* Empty state */}
      {!isLoading && !error && models.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-md mx-auto mt-20 p-8 rounded-xl bg-slate-800/50 border border-slate-700/50 text-center"
        >
          <div className="text-6xl mb-4">🎮</div>
          <h3 className="text-xl font-bold text-white mb-2">No Champions Available</h3>
          <p className="text-slate-400 text-sm mb-4">
            Make sure Ollama is running and has models installed.
          </p>
          <button
            onClick={() => void fetchModels()}
            className="px-6 py-2 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 transition-colors border border-sky-500/30"
          >
            Refresh
          </button>
        </motion.div>
      )}

      {/* Character grid */}
      {!isLoading && !error && models.length > 0 && (
        <div className="relative z-10 px-8 py-8">
          <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
            {models.map((model, index) => (
              <CharacterCard
                key={model.id}
                model={model}
                isSelected={selectedModelIds.includes(model.id)}
                onSelect={() => handleModelSelect(model.id, model.name)}
                assignedCharacter={assignments[model.id]}
                index={index}
              />
            ))}
          </div>
        </div>
      )}

      {/* Battle button */}
      <motion.div
        initial={{ opacity: 0, y: 20, x: "-50%" }}
        animate={{ opacity: 1, y: 0, x: "-50%" }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-8 left-1/2 z-20"
        >
        <button
          onClick={onBattleReady}
          disabled={!canStartBattle}
          className={cn(
            "group relative px-12 py-4 rounded-xl font-bold text-lg tracking-wider uppercase transition-all duration-300",
            canStartBattle
              ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-400 hover:to-blue-500 hover:scale-105 hover:shadow-[0_0_40px_rgba(14,165,233,0.4)]"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          )}
        >
          {/* Button glow effect */}
          {canStartBattle && (
            <div className="absolute -inset-1 bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity -z-10" />
          )}
          
          <span className="flex items-center gap-3">
            <Swords className="w-6 h-6" />
            {canStartBattle ? "Enter Arena" : "Select Champions"}
          </span>
        </button>
      </motion.div>

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-8 right-8 text-sky-100/70 text-xs text-right"
      >
        <p>Click cards to assign 3D characters</p>
        <p>Each model needs a character to battle</p>
      </motion.div>

      {/* Character Picker Modal */}
      {selectedModelForPicker && (
        <CharacterPicker
          isOpen={pickerOpen}
          onClose={handlePickerClose}
          modelId={selectedModelForPicker.id}
          modelName={selectedModelForPicker.name}
        />
      )}
    </div>
  );
}

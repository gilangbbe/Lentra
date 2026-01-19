"use client";

/**
 * Character Select Arena
 * 
 * A game-style character selection screen that displays all available
 * LLM models as selectable characters with stunning visual effects.
 */

import { motion } from "framer-motion";
import { Swords, Users, Sparkles } from "lucide-react";
import { useModels } from "@/hooks/use-models";
import { CharacterCard } from "./character-card";
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

  const selectedCount = selectedModelIds.length;
  const canStartBattle = selectedCount >= 1;

  return (
    <div className={cn("relative min-h-screen", className)}>
      {/* Animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 -z-10" />
      
      {/* Grid pattern overlay */}
      <div 
        className="fixed inset-0 -z-10 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Radial glow effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-white mb-2 tracking-wider">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              SELECT YOUR CHAMPIONS
            </span>
          </h1>
          <p className="text-slate-400 text-sm">
            Choose the AI models to compete in the arena
          </p>
        </motion.div>

        {/* Selection counter */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 inline-flex items-center gap-3 px-6 py-3 rounded-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm"
        >
          <Users className="w-5 h-5 text-purple-400" />
          <span className="text-white font-medium">
            <span className="text-purple-400">{selectedCount}</span>
            <span className="text-slate-500 mx-1">/</span>
            <span className="text-slate-400">{models.length}</span>
            <span className="text-slate-500 ml-2">Selected</span>
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
            <Sparkles className="w-12 h-12 text-purple-400" />
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
            className="px-6 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors border border-purple-500/30"
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
                onSelect={() => toggleModel(model.id)}
                index={index}
              />
            ))}
          </div>
        </div>
      )}

      {/* Battle button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20"
      >
        <button
          onClick={onBattleReady}
          disabled={!canStartBattle}
          className={cn(
            "group relative px-12 py-4 rounded-xl font-bold text-lg tracking-wider uppercase transition-all duration-300",
            canStartBattle
              ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 hover:scale-105 hover:shadow-[0_0_40px_rgba(168,85,247,0.4)]"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          )}
        >
          {/* Button glow effect */}
          {canStartBattle && (
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity -z-10" />
          )}
          
          <span className="flex items-center gap-3">
            <Swords className="w-5 h-5" />
            {canStartBattle ? "Enter Arena" : "Select Champions"}
          </span>
        </button>
      </motion.div>

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-8 right-8 text-slate-500 text-xs text-right"
      >
        <p>Click cards to select/deselect</p>
        <p>Select at least 1 champion to battle</p>
      </motion.div>
    </div>
  );
}

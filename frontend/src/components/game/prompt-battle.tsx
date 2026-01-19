"use client";

/**
 * Prompt Battle Component
 * 
 * The main battle interface where users can submit prompts
 * and watch their selected champions compete.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, Trophy, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModels } from "@/hooks/use-models";
import { BattleStage } from "./battle-stage";
import type { ModelInfo, ModelResponse } from "@/types";

interface PromptBattleProps {
  onBack?: () => void;
  className?: string;
}

interface Champion {
  model: ModelInfo;
  response?: ModelResponse;
  isGenerating?: boolean;
}

export function PromptBattle({ onBack, className }: PromptBattleProps) {
  const { models, selectedModelIds } = useModels();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [winner, setWinner] = useState<string | undefined>();
  const [battleCount, setBattleCount] = useState(0);

  // Initialize champions from selected models
  const selectedModels = models.filter(m => selectedModelIds.includes(m.id));
  
  // Initialize champions if needed
  if (champions.length === 0 && selectedModels.length > 0) {
    setChampions(selectedModels.map(model => ({ model })));
  }

  const handleSubmit = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setWinner(undefined);
    setBattleCount(prev => prev + 1);

    // Set all champions to generating state
    setChampions(prev => prev.map(c => ({ ...c, isGenerating: true, response: undefined })));

    try {
      const response = await fetch("http://localhost:8000/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model_ids: selectedModelIds,
        }),
      });

      const data = await response.json();

      // Update champions with responses
      setChampions(prev => prev.map(champion => {
        const modelResponse = data.responses?.find(
          (r: ModelResponse) => r.modelId === champion.model.id || r.model_id === champion.model.id
        );
        return {
          ...champion,
          isGenerating: false,
          response: modelResponse ? {
            modelId: modelResponse.modelId || modelResponse.model_id,
            text: modelResponse.text,
            latencyMs: modelResponse.latencyMs || modelResponse.latency_ms,
            tokens: modelResponse.tokens,
          } : undefined,
        };
      }));

      // Determine winner (fastest response for now)
      if (data.responses?.length > 0) {
        const sorted = [...data.responses].sort((a, b) => 
          (a.latencyMs || a.latency_ms || 0) - (b.latencyMs || b.latency_ms || 0)
        );
        setWinner(sorted[0]?.modelId || sorted[0]?.model_id);
      }

    } catch (error) {
      console.error("Battle failed:", error);
      setChampions(prev => prev.map(c => ({ ...c, isGenerating: false })));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setPrompt("");
    setChampions(selectedModels.map(model => ({ model })));
    setWinner(undefined);
  };

  return (
    <div className={cn("relative min-h-screen", className)}>
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 -z-10" />
      
      {/* Grid pattern */}
      <div 
        className="fixed inset-0 -z-10 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 bg-slate-900/50 backdrop-blur-sm border-b border-slate-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Selection</span>
        </button>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-sm">Battles: {battleCount}</span>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </header>

      {/* Battle stage */}
      <div className="relative z-10 flex-1 overflow-auto pb-40">
        <BattleStage 
          champions={champions} 
          isLoading={isGenerating}
          winner={winner}
        />
      </div>

      {/* Prompt input bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-8 pb-6 px-6"
      >
        <div className="max-w-4xl mx-auto">
          {/* Winner announcement */}
          <AnimatePresence>
            {winner && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-4 text-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-300 text-sm font-medium">
                    Fastest Response: {champions.find(c => c.model.id === winner)?.model.name || winner}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input area */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl blur" />
            <div className="relative flex items-center gap-3 p-2 rounded-xl bg-slate-900 border border-slate-700">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Enter your battle prompt..."
                disabled={isGenerating}
                className={cn(
                  "flex-1 bg-transparent px-4 py-3 text-white placeholder-slate-500 outline-none",
                  "disabled:opacity-50"
                )}
              />
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isGenerating}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
                  prompt.trim() && !isGenerating
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                )}
              >
                {isGenerating ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Battle!</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

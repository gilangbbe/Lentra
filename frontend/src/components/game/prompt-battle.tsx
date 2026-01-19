"use client";

/**
 * Prompt Battle Component
 * 
 * The main battle interface where users can submit prompts
 * and watch their selected LLM models compete with responses.
 * Features an immersive 3D arena background for visual appeal.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, Trophy, RotateCcw, Sparkles, BarChart3, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModels } from "@/hooks/use-models";
import { useCharacterAssignmentStore, type Character3D } from "@/stores/character-assignment-store";
import { BattleStage } from "./battle-stage";
import { EvaluationSummary } from "./evaluation-score-card";
import { GameArenaScene, type SelectedModelWithCharacter } from "./game-arena-scene";
import type { ModelInfo, ModelResponse, EvaluationMode, EvaluationScore, EvaluateResponse } from "@/types";

interface PromptBattleProps {
  onBack?: () => void;
  className?: string;
}

interface Champion {
  model: ModelInfo;
  characterId?: Character3D;
  response?: ModelResponse;
  isGenerating?: boolean;
}

const EVALUATION_MODES: { id: EvaluationMode; label: string; description: string }[] = [
  { id: "heuristic", label: "Quick", description: "Fast heuristic scoring" },
  { id: "embedding_similarity", label: "Semantic", description: "Embedding similarity" },
  { id: "llm_judge", label: "AI Judge", description: "LLM-as-judge evaluation" },
  { id: "ensemble", label: "Ensemble", description: "Combined strategies" },
];

export function PromptBattle({ onBack, className }: PromptBattleProps) {
  const { models, selectedModelIds } = useModels();
  const { assignments } = useCharacterAssignmentStore();
  const [prompt, setPrompt] = useState("");
  const [useRag, setUseRag] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [champions, setChampions] = useState<Champion[]>([]);
  const [winner, setWinner] = useState<string | undefined>();
  const [battleCount, setBattleCount] = useState(0);
  
  // Evaluation state
  const [evaluationMode, setEvaluationMode] = useState<EvaluationMode>("heuristic");
  const [evaluationScores, setEvaluationScores] = useState<EvaluationScore[]>([]);
  const [evaluationLatency, setEvaluationLatency] = useState<number | undefined>();
  const [showEvalDropdown, setShowEvalDropdown] = useState(false);
  const [showEvalResults, setShowEvalResults] = useState(false);

  // Initialize champions from selected models with their character assignments
  const selectedModels = models.filter(m => selectedModelIds.includes(m.id));
  
  // Build selected models with characters for 3D scene
  const selectedModelsWithCharacters: SelectedModelWithCharacter[] = selectedModels
    .filter(m => assignments[m.id])
    .map(m => ({
      modelId: m.id,
      modelName: m.name,
      characterId: assignments[m.id] as Character3D,
    }));
  
  // Initialize champions if needed
  useEffect(() => {
    if (selectedModels.length > 0 && champions.length === 0) {
      setChampions(selectedModels.map(model => ({ 
        model, 
        characterId: assignments[model.id] as Character3D | undefined 
      })));
    }
  }, [selectedModels, assignments, champions.length]);

  const handleSubmit = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setWinner(undefined);
    setEvaluationScores([]);
    setShowEvalResults(false);
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
      const updatedChampions = champions.map(champion => {
        const modelResponse = data.responses?.find((r: { modelId?: string; model_id?: string }) => 
          r.modelId === champion.model.id || r.model_id === champion.model.id
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
      });
      setChampions(updatedChampions);

      // Run evaluation
      if (data.responses?.length > 0) {
        await runEvaluation(prompt.trim(), data.responses);
      }

    } catch (error) {
      console.error("Battle failed:", error);
      setChampions(prev => prev.map(c => ({ ...c, isGenerating: false })));
    } finally {
      setIsGenerating(false);
    }
  };

  const runEvaluation = async (promptText: string, responses: ModelResponse[]) => {
    setIsEvaluating(true);
    try {
      const evalResponse = await fetch("http://localhost:8000/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          responses: responses.map(r => ({
            model_id: r.modelId || (r as { model_id?: string }).model_id,
            text: r.text,
            latency_ms: r.latencyMs || (r as { latency_ms?: number }).latency_ms,
            tokens: r.tokens,
          })),
          mode: evaluationMode,
        }),
      });

      const evalData: EvaluateResponse = await evalResponse.json();
      
      // Convert snake_case to camelCase for frontend
      const convertedScores = evalData.scores.map(s => ({
        modelId: (s as { model_id?: string }).model_id || s.modelId,
        relevance: s.relevance,
        clarity: s.clarity,
        hallucinationRisk: (s as { hallucination_risk?: number }).hallucination_risk ?? s.hallucinationRisk,
        finalScore: (s as { final_score?: number }).final_score ?? s.finalScore,
        reasoning: s.reasoning,
        metadata: s.metadata,
      }));

      setEvaluationScores(convertedScores);
      setEvaluationLatency(evalData.evaluationLatencyMs || (evalData as { evaluation_latency_ms?: number }).evaluation_latency_ms);
      setWinner(evalData.winner);
      setShowEvalResults(true);

    } catch (error) {
      console.error("Evaluation failed:", error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleReset = () => {
    setPrompt("");
    setChampions(selectedModels.map(model => ({ 
      model,
      characterId: assignments[model.id] as Character3D | undefined 
    })));
    setWinner(undefined);
    setEvaluationScores([]);
    setShowEvalResults(false);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn("relative min-h-screen overflow-hidden", className)}>
      {/* 3D Arena Background with assigned characters */}
      {mounted && (
        <div className="fixed inset-0 -z-5">
          <GameArenaScene 
            showCharacters={true} 
            enableOrbitControls={false}
            selectedModels={selectedModelsWithCharacters}
          />
        </div>
      )}

      {/* Light overlay for readability (blue sky theme) */}
      <div className="fixed inset-0 bg-gradient-to-b from-sky-900/40 via-transparent to-slate-950/70 -z-4 pointer-events-none" />
      
      {/* Fallback background */}
      <div className="fixed inset-0 bg-gradient-to-br from-sky-400 via-blue-500 to-sky-600 -z-10" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 bg-white/10 backdrop-blur-sm border-b border-white/20">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Selection</span>
        </button>

        <div className="flex items-center gap-4">
          {/* Evaluation Mode Selector */}
          <div className="relative">
            <button
              onClick={() => setShowEvalDropdown(!showEvalDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <span>{EVALUATION_MODES.find(m => m.id === evaluationMode)?.label || "Eval"}</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform", showEvalDropdown && "rotate-180")} />
            </button>
            
            <AnimatePresence>
              {showEvalDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full mt-1 right-0 w-48 bg-slate-900/95 backdrop-blur-sm rounded-lg border border-white/20 shadow-xl overflow-hidden z-50"
                >
                  {EVALUATION_MODES.map(mode => (
                    <button
                      key={mode.id}
                      onClick={() => {
                        setEvaluationMode(mode.id);
                        setShowEvalDropdown(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm transition-colors",
                        evaluationMode === mode.id 
                          ? "bg-sky-500/20 text-sky-400"
                          : "text-white/70 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <div className="font-medium">{mode.label}</div>
                      <div className="text-[10px] text-white/50">{mode.description}</div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RAG Toggle */}
          <label className="flex items-center gap-2 text-white/70 hover:text-white cursor-pointer">
            <input
              type="checkbox"
              checked={useRag}
              onChange={(e) => setUseRag(e.target.checked)}
              className="h-4 w-4 rounded border-white/30 text-sky-500 focus:ring-sky-500"
            />
            <Sparkles className="h-4 w-4 text-sky-300" />
            <span className="text-sm">Use RAG</span>
          </label>

          <div className="flex items-center gap-2 text-white/70">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-sm">Battles: {battleCount}</span>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
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

        {/* Evaluation Results Panel */}
        <AnimatePresence>
          {showEvalResults && evaluationScores.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed right-4 top-24 bottom-48 w-72 overflow-auto z-30"
            >
              <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-white/20 p-4 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-sky-400" />
                    Evaluation Results
                  </h3>
                  <button
                    onClick={() => setShowEvalResults(false)}
                    className="text-white/50 hover:text-white text-xs"
                  >
                    Hide
                  </button>
                </div>
                <EvaluationSummary
                  scores={evaluationScores}
                  winner={winner}
                  mode={evaluationMode}
                  evaluationLatencyMs={evaluationLatency}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Evaluating indicator */}
        <AnimatePresence>
          {isEvaluating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed bottom-52 left-1/2 -translate-x-1/2 z-30"
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/20 border border-sky-500/30 backdrop-blur-sm">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-sky-300/30 border-t-sky-300 rounded-full"
                />
                <span className="text-sky-300 text-sm">Evaluating responses...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Prompt input bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-sky-950 via-sky-950/95 to-transparent pt-8 pb-6 px-6"
      >
        <div className="max-w-4xl mx-auto">
          {/* Winner announcement */}
          <AnimatePresence>
            {winner && !isEvaluating && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-4 text-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30 backdrop-blur-sm">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-300 text-sm font-medium">
                    Winner: {champions.find(c => c.model.id === winner)?.model.name || winner}
                  </span>
                  {evaluationScores.length > 0 && (
                    <span className="text-yellow-300/60 text-xs">
                      ({Math.round((evaluationScores.find(s => s.modelId === winner)?.finalScore || 0) * 100)}%)
                    </span>
                  )}
                </div>
                {!showEvalResults && evaluationScores.length > 0 && (
                  <button
                    onClick={() => setShowEvalResults(true)}
                    className="ml-2 text-sky-400 text-xs hover:text-sky-300 underline"
                  >
                    Show details
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input area */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-sky-500/30 to-blue-600/30 rounded-2xl blur" />
            <div className="relative flex items-center gap-3 p-2 rounded-xl bg-slate-900/90 backdrop-blur-sm border border-white/20">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Enter your battle prompt..."
                disabled={isGenerating}
                className={cn(
                  "flex-1 bg-transparent px-4 py-3 text-white placeholder-white/40 outline-none",
                  "disabled:opacity-50"
                )}
              />
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim() || isGenerating}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all",
                  prompt.trim() && !isGenerating
                    ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-sky-500/25"
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

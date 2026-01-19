"use client";

/**
 * Evaluation Score Card Component
 * 
 * Displays the evaluation scores for a model response with
 * visual indicators for relevance, clarity, and hallucination risk.
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Target, 
  Sparkles, 
  AlertTriangle, 
  Trophy,
  Brain,
  BarChart3,
  Zap,
} from "lucide-react";
import type { EvaluationScore, EvaluationMode } from "@/types";

interface ScoreBarProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  inverse?: boolean; // For hallucination risk where lower is better
}

function ScoreBar({ label, value, icon, color, inverse }: ScoreBarProps) {
  const displayValue = inverse ? 1 - value : value;
  const percentage = Math.round(displayValue * 100);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-white/70">{label}</span>
        </div>
        <span className="font-mono text-white/90">{percentage}%</span>
      </div>
      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

interface EvaluationScoreCardProps {
  score: EvaluationScore;
  isWinner?: boolean;
  rank?: number;
  mode?: EvaluationMode;
  className?: string;
}

export function EvaluationScoreCard({ 
  score, 
  isWinner, 
  rank,
  mode,
  className 
}: EvaluationScoreCardProps) {
  const finalPercentage = Math.round(score.finalScore * 100);
  
  // Get mode icon
  const modeIcon = {
    heuristic: <Zap className="w-3 h-3" />,
    embedding_similarity: <Brain className="w-3 h-3" />,
    llm_judge: <Sparkles className="w-3 h-3" />,
    ensemble: <BarChart3 className="w-3 h-3" />,
    human_vote: <Trophy className="w-3 h-3" />,
  }[mode || "heuristic"];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "rounded-lg p-3 space-y-3",
        "bg-slate-800/50 backdrop-blur-sm",
        "border",
        isWinner ? "border-yellow-500/50" : "border-white/10",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isWinner && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              <Trophy className="w-4 h-4 text-yellow-400" />
            </motion.div>
          )}
          {rank && (
            <span className={cn(
              "text-xs font-bold px-1.5 py-0.5 rounded",
              rank === 1 ? "bg-yellow-500/20 text-yellow-400" :
              rank === 2 ? "bg-slate-500/20 text-slate-300" :
              rank === 3 ? "bg-orange-500/20 text-orange-400" :
              "bg-slate-700/50 text-white/50"
            )}>
              #{rank}
            </span>
          )}
          {mode && (
            <div className="flex items-center gap-1 text-[10px] text-white/50 uppercase">
              {modeIcon}
              <span>{mode.replace("_", " ")}</span>
            </div>
          )}
        </div>
        
        {/* Final Score Badge */}
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold",
          finalPercentage >= 80 ? "bg-green-500/20 text-green-400" :
          finalPercentage >= 60 ? "bg-sky-500/20 text-sky-400" :
          finalPercentage >= 40 ? "bg-yellow-500/20 text-yellow-400" :
          "bg-red-500/20 text-red-400"
        )}>
          <span>{finalPercentage}</span>
        </div>
      </div>

      {/* Score Bars */}
      <div className="space-y-2">
        <ScoreBar
          label="Relevance"
          value={score.relevance}
          icon={<Target className="w-3 h-3 text-sky-400" />}
          color="#38bdf8"
        />
        <ScoreBar
          label="Clarity"
          value={score.clarity}
          icon={<Sparkles className="w-3 h-3 text-emerald-400" />}
          color="#34d399"
        />
        <ScoreBar
          label="Confidence"
          value={score.hallucinationRisk}
          icon={<AlertTriangle className="w-3 h-3 text-amber-400" />}
          color="#fbbf24"
          inverse
        />
      </div>

      {/* Reasoning */}
      {score.reasoning && (
        <p className="text-[10px] text-white/50 leading-relaxed border-t border-white/10 pt-2">
          {score.reasoning}
        </p>
      )}
    </motion.div>
  );
}

interface EvaluationSummaryProps {
  scores: EvaluationScore[];
  winner?: string;
  mode?: EvaluationMode;
  evaluationLatencyMs?: number;
  className?: string;
}

export function EvaluationSummary({
  scores,
  winner,
  mode,
  evaluationLatencyMs,
  className,
}: EvaluationSummaryProps) {
  if (scores.length === 0) return null;

  // Sort by final score
  const sortedScores = [...scores].sort((a, b) => b.finalScore - a.finalScore);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-white/70">
          <BarChart3 className="w-4 h-4 text-sky-400" />
          <span className="font-medium">Evaluation Results</span>
          {mode && (
            <span className="text-[10px] text-white/50 uppercase px-1.5 py-0.5 rounded bg-white/5">
              {mode.replace("_", " ")}
            </span>
          )}
        </div>
        {evaluationLatencyMs && (
          <span className="text-[10px] text-white/50">
            {evaluationLatencyMs.toFixed(0)}ms
          </span>
        )}
      </div>

      {/* Score Cards */}
      <div className="grid gap-2">
        {sortedScores.map((score, index) => (
          <EvaluationScoreCard
            key={score.modelId}
            score={score}
            isWinner={score.modelId === winner}
            rank={index + 1}
            mode={mode}
          />
        ))}
      </div>
    </div>
  );
}

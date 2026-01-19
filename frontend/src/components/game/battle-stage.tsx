"use client";

/**
 * Battle Stage Component
 * 
 * Displays the selected champions on a battle stage with their
 * avatars and response areas during the prompt battle.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Swords, Crown, Clock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModelInfo, ModelResponse } from "@/types";

interface Champion {
  model: ModelInfo;
  response?: ModelResponse;
  isGenerating?: boolean;
}

interface BattleStageProps {
  champions: Champion[];
  isLoading?: boolean;
  winner?: string;
  className?: string;
}

// Get character emoji based on model name
function getCharacterEmoji(modelId: string): string {
  const silhouettes: Record<string, string> = {
    llama: "🦙",
    mistral: "🌪️",
    deepseek: "🔮",
    codellama: "👨‍💻",
    phi: "φ",
    gemma: "💎",
    qwen: "🐉",
    default: "🤖",
  };
  const id = modelId.toLowerCase();
  for (const [key, emoji] of Object.entries(silhouettes)) {
    if (id.includes(key)) return emoji;
  }
  return silhouettes.default;
}

function ChampionSlot({ champion, index, total, isWinner }: { 
  champion: Champion; 
  index: number; 
  total: number;
  isWinner: boolean;
}) {
  const { model, response, isGenerating } = champion;
  const primaryColor = model.character?.visual?.primaryColor || "#667EEA";
  const emoji = getCharacterEmoji(model.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15 }}
      className={cn(
        "relative flex flex-col items-center",
        "w-full max-w-md"
      )}
    >
      {/* Winner crown */}
      <AnimatePresence>
        {isWinner && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute -top-8 z-20"
          >
            <Crown className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Champion avatar area */}
      <div className="relative mb-4">
        {/* Aura glow */}
        <motion.div
          className="absolute inset-0 rounded-full blur-xl"
          style={{ 
            background: `radial-gradient(circle, ${primaryColor}40 0%, transparent 70%)`,
            transform: "scale(2)",
          }}
          animate={{
            scale: [2, 2.3, 2],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Avatar container */}
        <motion.div
          animate={isGenerating ? { 
            y: [0, -5, 0],
            rotate: [0, 2, -2, 0],
          } : { y: [0, -5, 0] }}
          transition={{
            duration: isGenerating ? 0.5 : 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={cn(
            "relative w-24 h-24 rounded-2xl overflow-hidden",
            "bg-gradient-to-b from-slate-800 to-slate-900",
            "border-2 shadow-2xl",
            isWinner ? "border-yellow-400" : "border-slate-600"
          )}
          style={{
            borderColor: !isWinner ? primaryColor : undefined,
            boxShadow: `0 0 30px ${primaryColor}40`,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl">{emoji}</span>
          </div>
        </motion.div>

        {/* Generating indicator */}
        {isGenerating && (
          <motion.div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <div 
              className="px-3 py-1 rounded-full text-[10px] font-bold uppercase"
              style={{ backgroundColor: primaryColor, color: "white" }}
            >
              Thinking...
            </div>
          </motion.div>
        )}
      </div>

      {/* Champion name */}
      <h3 
        className="text-lg font-bold tracking-wide mb-1"
        style={{ 
          color: primaryColor,
          textShadow: `0 0 20px ${primaryColor}60`,
        }}
      >
        {model.character?.name || model.name}
      </h3>
      <p className="text-xs text-slate-500 font-mono mb-4">{model.id}</p>

      {/* Response card */}
      <motion.div
        layout
        className={cn(
          "w-full rounded-xl overflow-hidden",
          "bg-slate-900/80 backdrop-blur-sm",
          "border border-slate-700/50",
          response ? "min-h-[200px]" : "min-h-[100px]"
        )}
        style={{
          borderColor: response ? `${primaryColor}40` : undefined,
        }}
      >
        {response ? (
          <div className="p-4">
            <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
              {response.text}
            </p>
            
            {/* Stats */}
            <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-between text-[10px] text-slate-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{response.latencyMs?.toFixed(0)}ms</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                <span>{response.tokens} tokens</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-8">
            <p className="text-slate-600 text-sm italic">
              {isGenerating ? "Generating response..." : "Awaiting prompt..."}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function BattleStage({ champions, isLoading, winner, className }: BattleStageProps) {
  if (champions.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-20", className)}>
        <div className="text-center">
          <Swords className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500">Select champions to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Battle arena floor effect */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-purple-950/20 to-transparent pointer-events-none" />

      {/* Champions grid */}
      <div className={cn(
        "grid gap-8 p-8",
        champions.length === 1 ? "grid-cols-1 max-w-md mx-auto" :
        champions.length === 2 ? "grid-cols-2 max-w-3xl mx-auto" :
        champions.length === 3 ? "grid-cols-3 max-w-5xl mx-auto" :
        "grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto"
      )}>
        {champions.map((champion, index) => (
          <ChampionSlot
            key={champion.model.id}
            champion={champion}
            index={index}
            total={champions.length}
            isWinner={winner === champion.model.id}
          />
        ))}
      </div>

      {/* VS indicator for 2 champions */}
      {champions.length === 2 && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-50" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center border-2 border-white/20">
              <span className="text-white font-bold text-xl">VS</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

"use client";

/**
 * Battle Stage Component
 * 
 * Displays the selected champions on a battle stage with their
 * avatars and response areas during the prompt battle.
 * Integrates 3D character assignments.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Swords, Crown, Clock, MessageSquare } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import { Suspense } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import type { ModelInfo, ModelResponse } from "@/types";
import { AVAILABLE_CHARACTERS, type Character3D } from "@/stores/character-assignment-store";

interface Champion {
  model: ModelInfo;
  characterId?: Character3D;
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
  return silhouettes.default ?? "🤖";
}

// 3D Character mini preview for the battle card
function CharacterMiniPreview({ characterId }: { characterId: Character3D }) {
  const charInfo = AVAILABLE_CHARACTERS.find((c) => c.id === characterId);
  if (!charInfo) return null;
  
  const { scene } = useGLTF(charInfo.modelPath);
  const clonedScene = scene.clone();

  return (
    <primitive 
      object={clonedScene} 
      scale={characterId === "skull_knight" ? 0.01 : 0.3}
      position={[0, characterId === "skull_knight" ? -1.4 : -0.3, 0]}
      rotation={[0, 0.3, 0]}
    />
  );
}

function ChampionSlot({ champion, index, isWinner }: { 
  champion: Champion; 
  index: number; 
  isWinner: boolean;
}) {
  const { model, characterId, response, isGenerating } = champion;
  const charInfo = characterId ? AVAILABLE_CHARACTERS.find(c => c.id === characterId) : null;
  const primaryColor = charInfo?.primaryColor || model.character?.visual?.primaryColor || "#0ea5e9";
  const emoji = getCharacterEmoji(model.id);
  const characterName = charInfo?.name;

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
            background: `radial-gradient(circle, ${primaryColor}60 0%, transparent 70%)`,
            transform: "scale(2)",
          }}
          animate={{
            scale: [2, 2.3, 2],
            opacity: [0.5, 0.7, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Avatar container - 3D character or emoji */}
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
            "bg-gradient-to-b from-slate-800/80 to-slate-900/80 backdrop-blur-sm",
            "border-2 shadow-2xl",
            isWinner ? "border-yellow-400" : "border-white/30"
          )}
          style={{
            borderColor: !isWinner ? primaryColor : undefined,
            boxShadow: `0 0 30px ${primaryColor}50`,
          }}
        >
          {characterId ? (
            // 3D Character preview
            <Canvas
              camera={{ position: [0, 0, 2], fov: 45 }}
              style={{ background: "transparent" }}
            >
              <ambientLight intensity={0.8} />
              <directionalLight position={[3, 3, 3]} intensity={1} />
              <Suspense fallback={null}>
                <CharacterMiniPreview characterId={characterId} />
                <Environment preset="sunset" />
              </Suspense>
            </Canvas>
          ) : (
            // Emoji fallback
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl">{emoji}</span>
            </div>
          )}
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

      {/* Champion name - show character name if assigned */}
      <h3 
        className="text-lg font-bold tracking-wide mb-0.5"
        style={{ 
          color: primaryColor,
          textShadow: `0 0 20px ${primaryColor}60`,
        }}
      >
        {characterName || model.character?.name || model.name}
      </h3>
      <p className="text-xs text-white font-medium mb-0.5">{model.name}</p>
      <p className="text-[10px] text-white/50 font-mono mb-4">{model.id}</p>

      {/* Response card */}
      <motion.div
        layout
        className={cn(
          "w-full rounded-xl overflow-hidden",
          "bg-slate-900/70 backdrop-blur-md",
          "border border-white/20",
          response ? "min-h-[200px]" : "min-h-[100px]"
        )}
        style={{
          borderColor: response ? `${primaryColor}50` : undefined,
          boxShadow: response ? `0 0 20px ${primaryColor}20` : undefined,
        }}
      >
        {response ? (
          <div className="p-4">
            <div className="text-white text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:text-white prose-strong:text-white prose-code:text-sky-300 prose-code:bg-slate-800/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-800/50 prose-pre:border prose-pre:border-white/10">
              <ReactMarkdown>
                {response.text}
              </ReactMarkdown>
            </div>
            
            {/* Stats */}
            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between text-[10px] text-white/60">
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
            <p className="text-white/40 text-sm italic">
              {isGenerating ? "Generating response..." : "Awaiting prompt..."}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export function BattleStage({ champions, isLoading: _isLoading, winner, className }: BattleStageProps) {
  if (champions.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-20", className)}>
        <div className="text-center">
          <Swords className="w-16 h-16 text-white/30 mx-auto mb-4" />
          <p className="text-white/50">Select champions to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Battle arena floor effect */}

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
            isWinner={winner === champion.model.id}
          />
        ))}
      </div>

      {/* VS indicator for 2 champions - centered between cards */}
      {champions.length === 2 && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="absolute top-32 left-0 right-0 flex justify-center z-10 pointer-events-none"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-blue-600 rounded-full blur-xl opacity-50" />
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center border-2 border-white/30 shadow-lg shadow-sky-500/30">
              <span className="text-white font-bold text-lg">VS</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

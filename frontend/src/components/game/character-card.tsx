"use client";

/**
 * Character Card Component
 * 
 * A game-style character card that represents an LLM model.
 * Features floating animation, aura effects, and selection glow.
 * Shows the assigned 3D character when selected.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Brain, MessageSquare } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import type { ModelInfo } from "@/types";
import { AVAILABLE_CHARACTERS, type Character3D } from "@/stores/character-assignment-store";

interface CharacterCardProps {
  model: ModelInfo;
  isSelected: boolean;
  onSelect: () => void;
  assignedCharacter?: Character3D;
  index: number;
}

// Character silhouette based on model type
const CHARACTER_SILHOUETTES: Record<string, string> = {
  llama: "🦙",
  mistral: "🌪️",
  deepseek: "🔮",
  codellama: "👨‍💻",
  phi: "φ",
  gemma: "💎",
  qwen: "🐉",
  default: "🤖",
};

// Get character emoji based on model name
function getCharacterEmoji(modelId: string): string {
  const id = modelId.toLowerCase();
  for (const [key, emoji] of Object.entries(CHARACTER_SILHOUETTES)) {
    if (id.includes(key)) return emoji;
  }
  return CHARACTER_SILHOUETTES.default ?? "🤖";
}

// Get aura gradient based on character visual
function getAuraGradient(model: ModelInfo): string {
  const color = model.character?.visual?.primaryColor || "#667EEA";
  return `radial-gradient(ellipse at center, ${color}40 0%, ${color}10 50%, transparent 70%)`;
}

// 3D Character mini preview component
function CharacterMiniPreview({ characterId }: { characterId: Character3D }) {
  const charInfo = AVAILABLE_CHARACTERS.find((c) => c.id === characterId);
  if (!charInfo) return null;
  
  const { scene } = useGLTF(charInfo.modelPath);
  const clonedScene = scene.clone();

  return (
    <primitive 
      object={clonedScene} 
      scale={characterId === "skull_knight" ? 0.012 : 0.35}
      position={[0, characterId === "skull_knight" ? -0.8 : -0.4, 0]}
      rotation={[0, 0.5, 0]}
    />
  );
}

export function CharacterCard({ model, isSelected, onSelect, assignedCharacter, index }: CharacterCardProps) {
  const character = model.character;
  const assignedCharInfo = assignedCharacter ? AVAILABLE_CHARACTERS.find((c) => c.id === assignedCharacter) : null;
  const primaryColor = assignedCharInfo?.primaryColor || character?.visual?.primaryColor || "#667EEA";
  const traits = character?.traits || ["adaptable"];
  const emoji = getCharacterEmoji(model.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateY: -15 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        rotateY: 0,
      }}
      transition={{ 
        delay: index * 0.1,
        type: "spring",
        stiffness: 100,
      }}
      whileHover={{ 
        scale: 1.05,
        y: -10,
        transition: { type: "spring", stiffness: 300 }
      }}
      onClick={onSelect}
      className={cn(
        "relative cursor-pointer select-none",
        "w-48 h-72 perspective-1000"
      )}
    >
      {/* Outer glow when selected */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -inset-4 rounded-3xl blur-xl z-0"
            style={{ 
              background: `radial-gradient(ellipse at center, ${primaryColor}60, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Card container */}
      <div
        className={cn(
          "relative w-full h-full rounded-2xl overflow-hidden",
          "bg-gradient-to-b from-slate-900/90 to-slate-950/95",
          "border-2 transition-all duration-300",
          "shadow-2xl backdrop-blur-sm",
          isSelected 
            ? "border-opacity-100 shadow-[0_0_40px_rgba(0,0,0,0.5)]" 
            : "border-slate-700/50 hover:border-slate-600"
        )}
        style={{
          borderColor: isSelected ? primaryColor : undefined,
          boxShadow: isSelected 
            ? `0 0 60px ${primaryColor}40, inset 0 0 30px ${primaryColor}10` 
            : undefined,
        }}
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          {isSelected && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                  initial={{ 
                    x: Math.random() * 200,
                    y: 300,
                    opacity: 0 
                  }}
                  animate={{ 
                    y: -50,
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </>
          )}
        </div>

        {/* Character aura */}
        <div 
          className="absolute inset-0 opacity-60"
          style={{ background: getAuraGradient(model) }}
        />

        {/* Top badge - Model type */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
          <span 
            className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-black/40 backdrop-blur-sm"
            style={{ color: primaryColor }}
          >
            {model.backend}
          </span>
          {model.supportsStreaming && (
            <Zap 
              className="w-4 h-4" 
              style={{ color: primaryColor }}
            />
          )}
        </div>

        {/* Character avatar area */}
        <div className="relative h-36 flex items-center justify-center mt-6">
          {/* Show 3D character if assigned, otherwise show emoji */}
          {assignedCharacter ? (
            <div className="w-24 h-28 relative">
              <Canvas
                camera={{ position: [0, 0, 2.5], fov: 50 }}
                style={{ background: "transparent" }}
              >
                <ambientLight intensity={0.7} />
                <directionalLight position={[3, 3, 3]} intensity={1} />
                <Suspense fallback={null}>
                  <CharacterMiniPreview characterId={assignedCharacter} />
                  <Environment preset="sunset" />
                </Suspense>
              </Canvas>
              {/* Character name badge */}
              <div 
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider whitespace-nowrap"
                style={{ backgroundColor: `${primaryColor}40`, color: primaryColor }}
              >
                {assignedCharInfo?.name}
              </div>
            </div>
          ) : (
            /* Floating animation for emoji */
            <motion.div
              animate={{ 
                y: [0, -8, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative"
            >
              {/* Character glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full blur-lg"
                style={{ 
                  background: `radial-gradient(circle, ${primaryColor}40 0%, transparent 70%)`,
                  transform: "scale(1.5)",
                }}
                animate={{
                  scale: [1.5, 1.8, 1.5],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              
              {/* Character emoji/avatar */}
              <span className="text-6xl relative z-10 drop-shadow-2xl">
                {emoji}
              </span>
              
              {/* Click to assign hint */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-white/50 whitespace-nowrap">
                Click to assign
              </div>
            </motion.div>
          )}
        </div>

        {/* Character info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          {/* Name */}
          <h3 
            className="text-lg font-bold tracking-wide text-center mb-1"
            style={{ 
              color: primaryColor,
              textShadow: `0 0 20px ${primaryColor}80`,
            }}
          >
            {character?.name || model.name}
          </h3>
          
          {/* Model ID */}
          <p className="text-[10px] text-slate-400 text-center mb-2 font-mono truncate">
            {model.id}
          </p>

          {/* Traits */}
          <div className="flex flex-wrap justify-center gap-1 mb-3">
            {traits.slice(0, 2).map((trait) => (
              <span
                key={trait}
                className="px-2 py-0.5 text-[9px] rounded-full bg-white/10 text-slate-300 capitalize"
              >
                {trait}
              </span>
            ))}
          </div>

          {/* Stats bar */}
          <div className="flex justify-center gap-3 text-[10px] text-slate-400">
            <div className="flex items-center gap-1">
              <Brain className="w-3 h-3" style={{ color: primaryColor }} />
              <span>{model.contextLength / 1000}K</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" style={{ color: primaryColor }} />
              <span>{model.totalRequests}</span>
            </div>
          </div>
        </div>

        {/* Selection indicator */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-3 right-3 z-20"
            >
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

"use client";

/**
 * Character Picker Modal
 * 
 * A modal dialog that lets users select which 3D character
 * should represent an LLM model in the arena.
 */

import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Sparkles } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, Environment, ContactShadows } from "@react-three/drei";
import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { 
  AVAILABLE_CHARACTERS, 
  type Character3D,
  type Character3DInfo,
  useCharacterAssignmentStore 
} from "@/stores/character-assignment-store";
import { cn } from "@/lib/utils";

interface CharacterPickerProps {
  isOpen: boolean;
  onClose: () => void;
  modelId: string;
  modelName: string;
}

// 3D Character preview component
function CharacterPreview({ character }: { character: Character3DInfo }) {
  const { scene } = useGLTF(character.modelPath);
  const groupRef = useRef<THREE.Group>(null);
  
  // Gentle rotation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    }
  });

  // Clone the scene for independent rendering
  const clonedScene = scene.clone();

  return (
    <group ref={groupRef}>
      <primitive 
        object={clonedScene} 
        scale={character.id === "skull_knight" ? 0.015 : 0.4}
        position={[0, character.id === "skull_knight" ? -1 : -0.5, 0]}
      />
    </group>
  );
}

// Character option card with 3D preview
function CharacterOption({ 
  character, 
  isSelected,
  onSelect,
}: { 
  character: Character3DInfo;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-center p-4 rounded-2xl transition-all duration-300",
        "border-2 backdrop-blur-sm",
        isSelected
          ? "border-sky-400 bg-sky-500/20 shadow-[0_0_30px_rgba(14,165,233,0.3)]"
          : "border-white/20 bg-white/10 hover:border-white/40 hover:bg-white/20"
      )}
    >
      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      )}

      {/* 3D Preview */}
      <div className="w-40 h-40 rounded-xl overflow-hidden bg-gradient-to-b from-slate-800/50 to-slate-900/50">
        <Canvas
          camera={{ position: [0, 0, 3], fov: 50 }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <Suspense fallback={null}>
            <CharacterPreview character={character} />
            <Environment preset="sunset" />
          </Suspense>
          <ContactShadows
            position={[0, -1, 0]}
            opacity={0.4}
            scale={3}
            blur={2}
          />
        </Canvas>
      </div>

      {/* Character info */}
      <div className="mt-3 text-center">
        <h3 
          className="text-lg font-bold text-white"
          style={{ textShadow: `0 0 20px ${character.primaryColor}` }}
        >
          {character.name}
        </h3>
        <p className="text-xs text-sky-200/70 mt-1 max-w-[160px]">
          {character.description}
        </p>
      </div>

      {/* Glow effect when selected */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -inset-1 rounded-2xl -z-10 blur-xl"
          style={{ background: `${character.primaryColor}30` }}
        />
      )}
    </motion.button>
  );
}

export function CharacterPicker({ isOpen, onClose, modelId, modelName }: CharacterPickerProps) {
  const { assignments, assignCharacter } = useCharacterAssignmentStore();
  const currentAssignment = assignments[modelId];

  const handleSelect = (characterId: Character3D) => {
    assignCharacter(modelId, characterId);
  };

  const handleConfirm = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 rounded-3xl border border-white/20 shadow-2xl pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-sky-400" />
                    Choose Your Champion
                  </h2>
                  <p className="text-sky-200/60 text-sm mt-1">
                    Select a 3D character to represent <span className="text-sky-300 font-medium">{modelName}</span>
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Character options */}
              <div className="p-6">
                <div className="flex justify-center gap-6">
                  {AVAILABLE_CHARACTERS.map((character) => (
                    <CharacterOption
                      key={character.id}
                      character={character}
                      isSelected={currentAssignment === character.id}
                      onSelect={() => handleSelect(character.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-white/10">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!currentAssignment}
                  className={cn(
                    "px-8 py-2.5 rounded-xl font-medium transition-all duration-300",
                    currentAssignment
                      ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-sky-500/25"
                      : "bg-slate-700 text-slate-400 cursor-not-allowed"
                  )}
                >
                  Confirm Selection
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

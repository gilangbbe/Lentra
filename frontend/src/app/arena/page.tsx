"use client";

/**
 * Game Arena Page
 * 
 * The main game-style interface for Lentra.
 * Features a character selection screen and battle arena.
 */

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CharacterSelectArena, PromptBattle } from "@/components/game";

type GamePhase = "select" | "battle";

export default function GameArenaPage() {
  const [phase, setPhase] = useState<GamePhase>("select");

  return (
    <AnimatePresence mode="wait">
      {phase === "select" ? (
        <motion.div
          key="select"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
        >
          <CharacterSelectArena 
            onBattleReady={() => setPhase("battle")}
          />
        </motion.div>
      ) : (
        <motion.div
          key="battle"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PromptBattle 
            onBack={() => setPhase("select")}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

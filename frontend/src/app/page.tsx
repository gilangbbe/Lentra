"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Swords, Sparkles, Gamepad2 } from "lucide-react";
import { SpaceBackground } from "@/components/game";

/**
 * Home Page - Landing & Navigation
 *
 * Provides a stunning game-style entry point with options
 * for the arena mode or classic mode.
 */
export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden">
      {/* 3D Blue Sky Background */}
      {mounted && (
        <div className="fixed inset-0 -z-5">
          <SpaceBackground />
        </div>
      )}

      {/* Fallback gradient */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-sky-400 via-sky-300 to-sky-200" />

      <div className="relative z-10 text-center px-6">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <h1 className="text-7xl font-bold tracking-wider mb-4">
            <span className="bg-gradient-to-r from-sky-600 via-blue-600 to-sky-600 bg-clip-text text-transparent drop-shadow-lg">
              LENTRA
            </span>
          </h1>
          <p className="text-sky-800 text-lg tracking-wide">
            Local AI Arena • Multi-Model Battles
          </p>
        </motion.div>

        {/* Floating mascot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-12"
        >
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative inline-block"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-sky-500 to-blue-500 rounded-full blur-2xl opacity-30" />
            
            <div className="relative text-8xl">
              🎮
            </div>
          </motion.div>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {/* Main CTA - Enter Arena */}
          <button
            onClick={() => router.push("/arena")}
            className="group relative px-10 py-5 rounded-xl font-bold text-xl tracking-wider uppercase transition-all duration-300 bg-gradient-to-r from-sky-600 to-blue-600 text-white hover:from-sky-500 hover:to-blue-500 hover:scale-105 hover:shadow-[0_0_50px_rgba(56,189,248,0.5)]"
          >
            {/* Button glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-sky-600 to-blue-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity -z-10" />
            
            <span className="flex items-center gap-3">
              <Swords className="w-6 h-6" />
              Enter Arena
            </span>
          </button>

          {/* Secondary - Classic Mode */}
          <button
            onClick={() => router.push("/classic")}
            className="px-8 py-4 rounded-xl font-medium text-lg tracking-wide transition-all duration-300 bg-white/50 text-sky-800 hover:bg-white/70 hover:text-sky-900 border border-sky-300 hover:border-sky-400 backdrop-blur-sm"
          >
            <span className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5" />
              Classic Mode
            </span>
          </button>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-sky-700"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-500" />
            <span>Local AI Models</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>Side-by-Side Battles</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span>RAG Powered</span>
          </div>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 text-sky-600 text-xs"
        >
          Powered by Ollama • Built for AI Enthusiasts
        </motion.p>
      </div>
    </div>
  );
}

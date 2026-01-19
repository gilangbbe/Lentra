"use client";

/**
 * Header Component
 *
 * Main application header with navigation and actions.
 */

import { Zap } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import type { ViewMode } from "@/types";

const navItems: { id: ViewMode; label: string }[] = [
  { id: "arena", label: "Prompt Arena" },
  { id: "comparison", label: "Comparison" },
  { id: "rag-inspector", label: "RAG Inspector" },
  { id: "model-profile", label: "Models" },
];

export function Header() {
  const { viewMode, setViewMode } = useUIStore();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-white px-6">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-semibold text-gray-900">Lentra</span>
      </div>

      {/* Navigation */}
      <nav className="flex items-center gap-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setViewMode(item.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              viewMode === item.id
                ? "bg-primary-50 text-primary-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">v0.1.0</span>
      </div>
    </header>
  );
}

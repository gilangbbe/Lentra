"use client";

/**
 * Sidebar Component
 *
 * Collapsible sidebar with model selection and settings.
 */

import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { ModelSelector } from "@/components/arena/model-selector";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-border bg-white transition-all duration-300",
        sidebarOpen ? "w-72" : "w-16"
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-4 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white shadow-sm hover:bg-gray-50"
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {sidebarOpen ? (
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-600" />
        )}
      </button>

      {/* Content */}
      <div className={cn("flex-1 overflow-hidden", sidebarOpen ? "p-4" : "p-2")}>
        {sidebarOpen ? (
          <>
            <h2 className="mb-4 text-sm font-semibold text-gray-900">Models</h2>
            <ModelSelector />
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 pt-8">
            <div className="h-8 w-8 rounded-lg bg-primary-100" title="Models" />
          </div>
        )}
      </div>

      {/* Footer */}
      {sidebarOpen && (
        <div className="border-t border-border p-4">
          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      )}
    </aside>
  );
}

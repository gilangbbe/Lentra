/**
 * UI Store
 *
 * Zustand store for managing UI state.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { ViewMode, Theme, Toast } from "@/types";
import { generateId } from "@/lib/utils";

interface UIState {
  // State
  viewMode: ViewMode;
  theme: Theme;
  sidebarOpen: boolean;
  toasts: Toast[];

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        viewMode: "arena",
        theme: "system",
        sidebarOpen: true,
        toasts: [],

        // Actions
        setViewMode: (mode: ViewMode) => {
          set({ viewMode: mode });
        },

        setTheme: (theme: Theme) => {
          set({ theme });
        },

        toggleSidebar: () => {
          set({ sidebarOpen: !get().sidebarOpen });
        },

        setSidebarOpen: (open: boolean) => {
          set({ sidebarOpen: open });
        },

        addToast: (toast: Omit<Toast, "id">) => {
          const id = generateId();
          const newToast: Toast = { ...toast, id };

          set({ toasts: [...get().toasts, newToast] });

          // Auto-remove after duration
          const duration = toast.duration ?? 5000;
          if (duration > 0) {
            setTimeout(() => {
              get().removeToast(id);
            }, duration);
          }
        },

        removeToast: (id: string) => {
          set({ toasts: get().toasts.filter((t) => t.id !== id) });
        },

        clearToasts: () => {
          set({ toasts: [] });
        },
      }),
      {
        name: "lentra-ui-storage",
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
        }),
      }
    ),
    { name: "ui-store" }
  )
);

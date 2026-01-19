/**
 * useToast Hook
 *
 * Custom hook for displaying toast notifications.
 */

import { useCallback } from "react";
import { useUIStore } from "@/stores/ui-store";
import type { Toast } from "@/types";

/**
 * Hook for managing toast notifications.
 */
export function useToast() {
  const { toasts, addToast, removeToast, clearToasts } = useUIStore();

  const toast = useCallback(
    (options: Omit<Toast, "id">) => {
      addToast(options);
    },
    [addToast]
  );

  const success = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "success", title, message });
    },
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "error", title, message });
    },
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "warning", title, message });
    },
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string) => {
      addToast({ type: "info", title, message });
    },
    [addToast]
  );

  return {
    toasts,
    toast,
    success,
    error,
    warning,
    info,
    removeToast,
    clearToasts,
  };
}

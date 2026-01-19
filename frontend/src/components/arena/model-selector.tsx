"use client";

/**
 * Model Selector Component
 *
 * List of available models with selection toggles.
 */

import { Check, AlertCircle, RefreshCw } from "lucide-react";
import { useModels } from "@/hooks/use-models";
import { Spinner } from "@/components/ui/loading";
import { getModelColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function ModelSelector() {
  const {
    models,
    selectedModelIds,
    isLoading,
    error,
    toggleModel,
    fetchModels,
  } = useModels();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-center">
        <AlertCircle className="mx-auto mb-2 h-6 w-6 text-red-500" />
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={() => void fetchModels()}
          className="mt-2 text-sm font-medium text-red-600 hover:text-red-800"
        >
          Try again
        </button>
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-600">No models available</p>
        <p className="mt-1 text-xs text-gray-500">
          Make sure Ollama is running and has models installed.
        </p>
        <button
          onClick={() => void fetchModels()}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-800"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {models.map((model) => {
        const isSelected = selectedModelIds.includes(model.id);
        const color = getModelColor(model.id);

        return (
          <button
            key={model.id}
            onClick={() => toggleModel(model.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
              isSelected
                ? "bg-primary-50 ring-1 ring-primary-200"
                : "hover:bg-gray-50"
            )}
          >
            {/* Color indicator */}
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
            />

            {/* Model info */}
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-gray-900">
                {model.name}
              </p>
              <p className="truncate text-xs text-gray-500">{model.id}</p>
            </div>

            {/* Selection indicator */}
            <div
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded border",
                isSelected
                  ? "border-primary-600 bg-primary-600"
                  : "border-gray-300 bg-white"
              )}
            >
              {isSelected && <Check className="h-3 w-3 text-white" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

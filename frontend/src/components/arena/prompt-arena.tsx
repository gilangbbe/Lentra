"use client";

/**
 * Prompt Arena Component
 *
 * Main view for submitting prompts and viewing responses.
 * Per architecture: "Submit a single prompt to multiple models"
 */

import { useState, type KeyboardEvent } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ResponseCard } from "@/components/arena/response-card";
import { Spinner } from "@/components/ui/loading";
import { usePrompt } from "@/hooks/use-prompt";
import { useModels } from "@/hooks/use-models";

export function PromptArena() {
  const {
    currentPrompt,
    responses,
    isLoading,
    error,
    setPrompt,
    submit,
    canSubmit,
  } = usePrompt();

  const { selectedModels, hasSelectedModels } = useModels();
  const [useRag, setUseRag] = useState(false);

  const handleSubmit = async () => {
    await submit(useRag);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (canSubmit) {
        void handleSubmit();
      }
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Prompt Input */}
      <Card variant="bordered">
        <CardContent className="space-y-4">
          <Textarea
            value={currentPrompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your prompt here... (Ctrl+Enter to submit)"
            className="min-h-[120px]"
            disabled={isLoading}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* RAG Toggle */}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useRag}
                  onChange={(e) => setUseRag(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <Sparkles className="h-4 w-4 text-purple-500" />
                Use RAG
              </label>

              {/* Selected models count */}
              <span className="text-sm text-gray-500">
                {selectedModels.length} model{selectedModels.length !== 1 ? "s" : ""} selected
              </span>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              isLoading={isLoading}
            >
              <Send className="mr-2 h-4 w-4" />
              Send to Models
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {!hasSelectedModels && (
            <p className="text-sm text-amber-600">
              Please select at least one model from the sidebar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <p className="text-sm text-gray-600">Generating responses...</p>
          </div>
        </div>
      )}

      {/* Responses Grid */}
      {!isLoading && responses.length > 0 && (
        <div className="flex-1 overflow-auto">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Responses ({responses.length})
          </h2>
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.min(responses.length, 3)}, 1fr)`,
            }}
          >
            {responses.map((response) => (
              <ResponseCard key={response.modelId} response={response} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && responses.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Send className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No responses yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Enter a prompt and select models to get started.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

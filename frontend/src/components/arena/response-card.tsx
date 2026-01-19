"use client";

/**
 * Response Card Component
 *
 * Displays a single model's response with metadata.
 */

import { Copy, Clock, Hash } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ModelResponse } from "@/types";
import { formatLatency, formatNumber, getModelColor } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ResponseCardProps {
  response: ModelResponse;
}

export function ResponseCard({ response }: ResponseCardProps) {
  const { success } = useToast();
  const color = getModelColor(response.modelId);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(response.text);
    success("Copied!", "Response copied to clipboard");
  };

  return (
    <Card variant="bordered" className="flex flex-col">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="font-medium text-gray-900">
            {response.modelId.split(":")[0]}
          </span>
          <span className="text-xs text-gray-500">{response.modelId}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 w-8 p-0"
          title="Copy response"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </CardHeader>

      {/* Content */}
      <CardContent className="flex-1">
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap text-gray-700">{response.text}</p>
        </div>
      </CardContent>

      {/* Footer with metrics */}
      <CardFooter className="flex items-center gap-4 py-2 text-xs text-gray-500">
        <div className="flex items-center gap-1" title="Latency">
          <Clock className="h-3 w-3" />
          {formatLatency(response.latencyMs)}
        </div>
        <div className="flex items-center gap-1" title="Tokens generated">
          <Hash className="h-3 w-3" />
          {formatNumber(response.tokens)} tokens
        </div>
        {response.finishReason && (
          <span
            className={`rounded px-1.5 py-0.5 ${
              response.finishReason === "stop"
                ? "bg-green-100 text-green-700"
                : response.finishReason === "length"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
            }`}
          >
            {response.finishReason}
          </span>
        )}
      </CardFooter>
    </Card>
  );
}

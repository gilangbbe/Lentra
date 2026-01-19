/**
 * Prompt Service
 *
 * API service for prompt-related operations.
 */

import { apiClient, getErrorMessage } from "@/lib/api-client";
import type { PromptRequest, PromptResponse } from "@/types";

/**
 * Submit a prompt to one or more models.
 *
 * @param request - Prompt request parameters
 * @returns Promise resolving to prompt response with all model outputs
 */
export async function submitPrompt(request: PromptRequest): Promise<PromptResponse> {
  const response = await apiClient.post<PromptResponse>("/prompt", request);
  return response.data;
}

/**
 * Submit a prompt with streaming response.
 *
 * @param request - Prompt request parameters
 * @param onToken - Callback for each received token
 * @param onComplete - Callback when streaming completes
 * @param onError - Callback for errors
 */
export async function submitPromptStream(
  request: PromptRequest,
  onToken: (modelId: string, token: string) => void,
  onComplete: (response: PromptResponse) => void,
  onError: (error: string) => void
): Promise<void> {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

  try {
    const ws = new WebSocket(`${wsUrl}/ws/prompt`);

    ws.onopen = () => {
      ws.send(JSON.stringify(request));
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as
        | { type: "token"; modelId: string; token: string }
        | { type: "complete"; response: PromptResponse }
        | { type: "error"; message: string };

      if (data.type === "token") {
        onToken(data.modelId, data.token);
      } else if (data.type === "complete") {
        onComplete(data.response);
        ws.close();
      } else if (data.type === "error") {
        onError(data.message);
        ws.close();
      }
    };

    ws.onerror = () => {
      onError("WebSocket connection error");
    };
  } catch (error) {
    onError(getErrorMessage(error));
  }
}

/**
 * Evaluation Service
 *
 * API service for evaluation and comparison operations.
 */

import { apiClient } from "@/lib/api-client";
import type { EvaluateRequest, EvaluateResponse } from "@/types";

/**
 * Evaluate and compare model responses.
 *
 * @param request - Evaluation request with responses to compare
 * @returns Promise resolving to evaluation results
 */
export async function evaluateResponses(request: EvaluateRequest): Promise<EvaluateResponse> {
  const response = await apiClient.post<EvaluateResponse>("/evaluate", request);
  return response.data;
}

/**
 * Human vote ballot for blind comparison.
 */
export interface HumanVoteBallot {
  ballotId: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
  expiresAt: string;
}

/**
 * Create a ballot for human voting.
 *
 * @param request - Evaluation request (will use human_vote mode)
 * @returns Promise resolving to ballot for voting
 */
export async function createVoteBallot(request: EvaluateRequest): Promise<HumanVoteBallot> {
  const response = await apiClient.post<HumanVoteBallot>("/evaluate/ballot", {
    ...request,
    mode: "human_vote",
  });
  return response.data;
}

/**
 * Submit a human vote.
 *
 * @param ballotId - Ballot identifier
 * @param selectedOption - Index of selected option
 * @param reasoning - Optional reasoning for selection
 */
export async function submitVote(
  ballotId: string,
  selectedOption: number,
  reasoning?: string
): Promise<void> {
  await apiClient.post("/evaluate/vote", {
    ballotId,
    selectedOption,
    reasoning,
  });
}

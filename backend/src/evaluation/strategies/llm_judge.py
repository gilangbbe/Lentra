"""
LLM-as-Judge Evaluation Strategy

Uses a meta-model to evaluate and score LLM responses.
The judge model analyzes responses for relevance, clarity,
and potential hallucination.
"""

import json
import re
from typing import Any

from src.core.config import settings
from src.core.logging import get_logger
from src.models.runner import ModelRunner
from src.schemas.evaluation import EvaluationScore

logger = get_logger(__name__)


# Judge prompt template
JUDGE_SYSTEM_PROMPT = """You are an expert evaluator of AI-generated responses. Your task is to evaluate the quality of responses to user prompts.

Evaluate each response on these criteria (score 0.0 to 1.0):

1. **Relevance** (0.0-1.0): How well does the response address the user's prompt?
   - 1.0: Perfectly addresses all aspects of the prompt
   - 0.7-0.9: Addresses most aspects with minor gaps
   - 0.4-0.6: Partially addresses the prompt
   - 0.0-0.3: Barely relevant or off-topic

2. **Clarity** (0.0-1.0): How clear, well-structured, and understandable is the response?
   - 1.0: Crystal clear, excellent structure, easy to follow
   - 0.7-0.9: Clear with good organization
   - 0.4-0.6: Understandable but could be better organized
   - 0.0-0.3: Confusing or poorly structured

3. **Hallucination Risk** (0.0-1.0): How likely is the response to contain made-up or incorrect information?
   - 0.0: Very low risk, sticks to verifiable facts or clearly marks speculation
   - 0.3-0.5: Some claims that may need verification
   - 0.6-0.8: Contains questionable claims
   - 1.0: High risk of fabricated information

IMPORTANT: You must respond ONLY with valid JSON in this exact format:
{
  "relevance": <float>,
  "clarity": <float>,
  "hallucination_risk": <float>,
  "reasoning": "<brief explanation>"
}"""


JUDGE_USER_PROMPT = """Evaluate the following response to the user's prompt.

## User Prompt:
{prompt}

{context_section}

## Response to Evaluate:
{response}

## Your Evaluation (JSON only):"""


class LLMJudgeStrategy:
    """
    LLM-as-Judge evaluation strategy.
    
    Uses a capable language model (typically the same or different model)
    to evaluate responses. This provides nuanced evaluation that can
    catch semantic issues that heuristic methods miss.
    
    Per architecture, this is the "Meta-model scoring" evaluation mode.
    """

    def __init__(
        self,
        judge_model: str | None = None,
        runner: ModelRunner | None = None,
    ) -> None:
        """
        Initialize the LLM-as-Judge strategy.
        
        Args:
            judge_model: Model ID to use as judge. Defaults to config.
            runner: ModelRunner instance for generating. Creates new if not provided.
        """
        self._judge_model = judge_model or settings.OLLAMA_DEFAULT_MODEL
        self._runner = runner
        self._initialized = False

        logger.info(
            "LLM-as-Judge strategy created",
            judge_model=self._judge_model,
        )

    async def initialize(self) -> None:
        """Initialize the strategy."""
        if self._initialized:
            return

        if self._runner is None:
            self._runner = ModelRunner()

        self._initialized = True
        logger.info("LLM-as-Judge strategy initialized")

    async def evaluate(
        self,
        prompt: str,
        responses: list[dict[str, Any]],
        context: str | None = None,
        judge_model: str | None = None,
    ) -> list[EvaluationScore]:
        """
        Evaluate responses using an LLM judge.
        
        Args:
            prompt: The user's original prompt/query.
            responses: List of responses with 'model_id', 'content', 'latency'.
            context: Optional RAG context used in generation.
            judge_model: Override judge model for this evaluation.
        
        Returns:
            List of EvaluationScore objects for each response.
        """
        if not self._initialized:
            await self.initialize()

        if not responses:
            return []

        judge = judge_model or self._judge_model
        scores = []

        # Build context section
        context_section = ""
        if context:
            context_section = f"""## Context Provided:
{context[:2000]}  # Truncate long contexts
"""

        for i, response in enumerate(responses):
            response_text = response.get("content", "")
            model_id = response.get("model_id", f"model_{i}")

            # Build evaluation prompt
            eval_prompt = JUDGE_USER_PROMPT.format(
                prompt=prompt,
                context_section=context_section,
                response=response_text[:3000],  # Truncate very long responses
            )

            # Full prompt for the judge
            full_prompt = f"{JUDGE_SYSTEM_PROMPT}\n\n{eval_prompt}"

            try:
                # Get judge evaluation
                judge_response = await self._runner.generate(
                    model_id=judge,
                    prompt=full_prompt,
                    params={
                        "temperature": 0.1,  # Low temp for consistent judging
                        "max_tokens": 500,
                    },
                )

                # Parse the JSON response
                parsed_scores = self._parse_judge_response(judge_response.text)

                if parsed_scores:
                    relevance = parsed_scores.get("relevance", 0.5)
                    clarity = parsed_scores.get("clarity", 0.5)
                    hallucination_risk = parsed_scores.get("hallucination_risk", 0.5)
                    reasoning = parsed_scores.get("reasoning", "LLM judge evaluation")

                    # Compute final score
                    final_score = self._compute_final_score(
                        relevance, clarity, hallucination_risk
                    )

                    scores.append(
                        EvaluationScore(
                            model_id=model_id,
                            relevance=round(relevance, 4),
                            clarity=round(clarity, 4),
                            hallucination_risk=round(hallucination_risk, 4),
                            final_score=round(final_score, 4),
                            reasoning=reasoning,
                            metadata={
                                "strategy": "llm_judge",
                                "judge_model": judge,
                                "has_context": context is not None,
                                "response_length": len(response_text),
                                "raw_judge_response": judge_response.text[:500],
                            },
                        )
                    )
                else:
                    # Fallback if parsing fails
                    scores.append(self._create_fallback_score(model_id, response_text))

            except Exception as e:
                logger.error(
                    "Judge evaluation failed",
                    model_id=model_id,
                    error=str(e),
                )
                scores.append(self._create_fallback_score(model_id, response_text))

        logger.debug(
            "LLM judge evaluation complete",
            num_responses=len(responses),
            judge_model=judge,
        )

        return scores

    def _parse_judge_response(self, response: str) -> dict[str, Any] | None:
        """
        Parse JSON from the judge's response.
        
        Handles common formatting issues like markdown code blocks.
        
        Args:
            response: Raw judge response text.
        
        Returns:
            Parsed dictionary or None if parsing fails.
        """
        # Try direct JSON parse first
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass

        # Try to extract JSON from markdown code block
        json_pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
        match = re.search(json_pattern, response)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # Try to find JSON object anywhere in response
        json_obj_pattern = r"\{[\s\S]*?\}"
        matches = re.findall(json_obj_pattern, response)
        for potential_json in matches:
            try:
                parsed = json.loads(potential_json)
                # Validate expected fields
                if any(k in parsed for k in ["relevance", "clarity", "hallucination_risk"]):
                    return parsed
            except json.JSONDecodeError:
                continue

        logger.warning(
            "Failed to parse judge response",
            response_preview=response[:200],
        )
        return None

    def _compute_final_score(
        self, relevance: float, clarity: float, hallucination_risk: float
    ) -> float:
        """
        Compute final score from component scores.
        
        Args:
            relevance: Relevance score.
            clarity: Clarity score.
            hallucination_risk: Hallucination risk score.
        
        Returns:
            Final composite score in range [0, 1].
        """
        # LLM judge scores are authoritative, weight relevance highly
        score = (
            0.50 * relevance
            + 0.25 * clarity
            + 0.25 * (1.0 - hallucination_risk)
        )
        return max(0.0, min(1.0, score))

    def _create_fallback_score(
        self, model_id: str, response_text: str
    ) -> EvaluationScore:
        """
        Create a fallback score when judge evaluation fails.
        
        Args:
            model_id: Model identifier.
            response_text: Response content.
        
        Returns:
            Default EvaluationScore.
        """
        return EvaluationScore(
            model_id=model_id,
            relevance=0.5,
            clarity=0.5,
            hallucination_risk=0.5,
            final_score=0.5,
            reasoning="Judge evaluation failed; using default scores.",
            metadata={
                "strategy": "llm_judge",
                "fallback": True,
                "response_length": len(response_text),
            },
        )

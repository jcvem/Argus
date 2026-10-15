"""Gemini provider and dependency injection seam for Aristotle policy drafting."""

import logging
from typing import Protocol, runtime_checkable
from google import genai
from google.genai import types

from aristotle_api.models import (
    RedactionPolicy,
    normalize_and_dedupe_rules,
)
from aristotle_api.prompt import SYSTEM_INSTRUCTION, build_user_prompt

logger = logging.getLogger("aristotle_api.provider")


class AristotleProviderError(Exception):
    """Base exception for Aristotle policy draft providers."""


class UpstreamProviderError(AristotleProviderError):
    """Raised when upstream AI provider call fails or is unreachable."""


class PolicySchemaValidationError(AristotleProviderError):
    """Raised when model response cannot be parsed or validated against RedactCore schema."""


@runtime_checkable
class PolicyDraftProvider(Protocol):
    """Protocol establishing the dependency injection seam for policy drafting."""

    model: str

    async def draft_policy(
        self,
        request_text: str,
        policy_id: str | None = None,
        policy_name: str | None = None,
    ) -> tuple[RedactionPolicy, list[str]]:
        """Drafts a RedactCore policy from natural language specifications."""
        ...


class GeminiPolicyProvider:
    """Official Google Gemini Developer API policy drafting provider using google-genai."""

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash") -> None:
        if not api_key or not api_key.strip():
            raise ValueError("GEMINI_API_KEY must be a non-empty string")
        self.api_key = api_key
        self.model = model
        self.client = genai.Client(api_key=self.api_key)

    async def draft_policy(
        self,
        request_text: str,
        policy_id: str | None = None,
        policy_name: str | None = None,
    ) -> tuple[RedactionPolicy, list[str]]:
        """Calls Gemini with structured schema output, validates, normalizes, and dedupes rules."""
        user_prompt = build_user_prompt(request_text, policy_id, policy_name)

        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            response_mime_type="application/json",
            response_schema=RedactionPolicy,
            temperature=0.0,
        )

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=user_prompt,
                config=config,
            )
        except Exception as exc:
            # Strictly avoid logging raw request_text or API key
            logger.error("Upstream Gemini API call failed: %s", type(exc).__name__)
            raise UpstreamProviderError("Gemini API call failed") from exc

        # Parse and validate response
        raw_text = getattr(response, "text", None)
        raw_policy: RedactionPolicy

        if raw_text and raw_text.strip():
            clean_text = raw_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            elif clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            clean_text = clean_text.strip()

            try:
                raw_policy = RedactionPolicy.model_validate_json(clean_text)
            except Exception as exc:
                logger.error("Failed to validate JSON model output: %s", type(exc).__name__)
                raise PolicySchemaValidationError(
                    "Model output failed RedactCore policy schema validation"
                ) from exc
        elif hasattr(response, "parsed") and response.parsed is not None:
            parsed = response.parsed
            if isinstance(parsed, RedactionPolicy):
                raw_policy = parsed
            else:
                try:
                    raw_policy = RedactionPolicy.model_validate(parsed)
                except Exception as exc:
                    logger.error("Failed to validate parsed model output: %s", type(exc).__name__)
                    raise PolicySchemaValidationError(
                        "Model output failed RedactCore policy schema validation"
                    ) from exc
        else:
            logger.error("Gemini returned empty or unparseable response")
            raise PolicySchemaValidationError("Upstream model returned empty or missing response")

        # Deterministically normalize and dedupe rules
        deduped_rules, dedupe_warnings = normalize_and_dedupe_rules(raw_policy.rules)

        final_policy_id = (
            policy_id.strip()
            if policy_id and policy_id.strip()
            else (raw_policy.policy_id.strip() if raw_policy.policy_id else "draft-policy")
        )
        final_policy_name = (
            policy_name.strip()
            if policy_name and policy_name.strip()
            else (raw_policy.name.strip() if raw_policy.name else final_policy_id)
        )

        final_policy = RedactionPolicy(
            policy_id=final_policy_id,
            name=final_policy_name,
            version=raw_policy.version or "1.0.0",
            description=raw_policy.description or f"Draft policy for {final_policy_name}",
            default_action=raw_policy.default_action,
            require_figure_review=raw_policy.require_figure_review,
            allowed_subjects=raw_policy.allowed_subjects,
            rules=deduped_rules,
        )

        warnings: list[str] = [
            "This policy is an unverified draft generated by an AI model. It must be reviewed and tested before activation.",
        ]
        warnings.extend(dedupe_warnings)

        return final_policy, warnings

"""FastAPI application for Aristotle policy drafting service."""

import logging
import os
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from aristotle_api.models import DraftPolicyRequest, DraftPolicyResponse
from aristotle_api.provider import (
    GeminiPolicyProvider,
    PolicyDraftProvider,
    PolicySchemaValidationError,
    UpstreamProviderError,
)

# Configure safe structured logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("aristotle_api")

app = FastAPI(
    title="Argus Aristotle Policy Drafting API",
    version="0.1.0",
    description="Declarative RedactCore policy drafting using Google Gemini Developer API",
)

# CORS configuration allowing ArgusBC and local workbenches
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://argus-guardian.web.app",
        "https://argus-guardian.firebaseapp.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:8787",
        "http://127.0.0.1:8787",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Sanitize validation errors to guarantee no sensitive request text or secrets leak."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": "Invalid request: empty, oversized, or malformed request payload"},
    )


def get_provider() -> PolicyDraftProvider:
    """Dependency injection seam providing the policy drafting provider.

    Validates that GEMINI_API_KEY is present in the server environment.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or not api_key.strip():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY environment variable is not configured",
        )
    model = os.environ.get("ARISTOTLE_MODEL", "gemini-2.5-flash")
    return GeminiPolicyProvider(api_key=api_key.strip(), model=model)


@app.get("/", status_code=status.HTTP_200_OK)
@app.get("/health", status_code=status.HTTP_200_OK)
@app.get("/healthz", status_code=status.HTTP_200_OK)
async def healthz() -> dict[str, str]:
    """Health check endpoint. Always returns status ok without requiring GEMINI_API_KEY."""
    return {"status": "ok", "service": "aristotle-api", "version": "0.1.0"}


@app.post("/v1/policy/draft", response_model=DraftPolicyResponse, status_code=status.HTTP_200_OK)
async def draft_policy(
    req: DraftPolicyRequest,
    provider: Annotated[PolicyDraftProvider, Depends(get_provider)],
) -> DraftPolicyResponse:
    """Drafts a declarative RedactCore-compatible policy from natural language.

    Invariants:
    - Rejects empty, whitespace-only, and requests exceeding 8,000 characters with 400.
    - Requires GEMINI_API_KEY; fails with 503 if missing.
    - Fails safely with 502/503 on upstream Gemini or validation failure.
    - Never leaks user request text or API keys in logs or responses.
    - Emits draft_only=True artifacts.
    """
    # Strict validation of input length and content
    stripped_text = req.request.strip()
    if not stripped_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request text cannot be empty or whitespace only",
        )
    if len(req.request) > 8000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Request text exceeds maximum limit of 8000 characters",
        )

    # Safe logging of metadata only
    logger.info(
        "Received policy draft request: length=%d, custom_id=%s, custom_name=%s",
        len(req.request),
        bool(req.policy_id),
        bool(req.policy_name),
    )

    try:
        policy, warnings = await provider.draft_policy(
            request_text=stripped_text,
            policy_id=req.policy_id,
            policy_name=req.policy_name,
        )
    except UpstreamProviderError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upstream AI provider error during policy drafting",
        )
    except PolicySchemaValidationError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to validate upstream model response against RedactCore policy schema",
        )
    except Exception:
        logger.error("Unexpected error in policy draft handler")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="An error occurred while drafting the policy",
        )

    active_model = getattr(provider, "model", os.environ.get("ARISTOTLE_MODEL", "gemini-2.5-flash"))

    logger.info(
        "Policy draft completed: policy_id=%s, rules_count=%d",
        policy.policy_id,
        len(policy.rules),
    )

    return DraftPolicyResponse(
        policy=policy,
        warnings=warnings,
        draft_only=True,
        model=active_model,
    )

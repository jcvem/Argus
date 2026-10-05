# Multi-stage / optimized slim production image for Argus RedactCore API
FROM python:3.12-slim

# Install uv for fast, deterministic dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Environment defaults for Cloud Run & ephemeral demo container runtime
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080 \
    REDACTCORE_STORAGE_DIR=/tmp/redactcore-data \
    REDACTCORE_ENABLE_DEMO_FIXTURES=true \
    REDACTCORE_POLICIES_DIR=/app/policies \
    REDACTCORE_FIXTURES_DIR=/app/fixtures \
    REDACTCORE_WEB_DIR=/app/web

# Create unprivileged application user and group
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -m -s /bin/bash appuser

# Set working directory
WORKDIR /app

# Copy dependency specification and project metadata
COPY pyproject.toml README.md ./

# Copy application source tree and install dependencies
COPY src/ ./src/
RUN uv pip install --no-cache --system ".[ocr-gemini]"

# Copy runtime configuration, policies, static web UI, and demo fixtures
COPY policies/ ./policies/
COPY web/ ./web/
COPY fixtures/ ./fixtures/

# Create ephemeral data store and assign ownership to unprivileged user
RUN mkdir -p /tmp/redactcore-data && \
    chown -R appuser:appuser /tmp/redactcore-data /app

# Run as non-root user
USER appuser

# Document listening port
EXPOSE 8080

# Start FastAPI application via uvicorn with shell variable expansion for Cloud Run PORT
CMD ["sh", "-c", "exec uvicorn redact_core.api:app --host 0.0.0.0 --port ${PORT:-8080}"]

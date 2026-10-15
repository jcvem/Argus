# Multi-stage or slim production container for Argus Aristotle API
# Cloud Run-compatible, non-root user, PORT-aware
FROM python:3.12-slim

# Prevent Python from buffering stdout/stderr and writing .pyc files
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

WORKDIR /app

# Create a non-root service user with explicit UID
RUN groupadd -g 10001 appuser && \
    useradd -u 10001 -g appuser -m -s /bin/bash appuser

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package metadata and source code
COPY pyproject.toml README.md /app/
COPY src/ /app/src/
RUN pip install --no-cache-dir .

# Change ownership of /app to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Cloud Run injects the PORT environment variable (default: 8080)
EXPOSE 8080

# Launch uvicorn listening on 0.0.0.0:${PORT}
CMD ["sh", "-c", "exec uvicorn aristotle_api.main:app --host 0.0.0.0 --port ${PORT:-8080}"]

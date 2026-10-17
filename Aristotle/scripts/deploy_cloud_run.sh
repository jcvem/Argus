#!/usr/bin/env bash
# Deploy Argus Aristotle API to Google Cloud Run via Cloud Build
# Usage:
#   ./scripts/deploy_cloud_run.sh [OPTIONS]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

PROJECT_ID="${PROJECT_ID:-argus-guardian}"
REGION="${REGION:-asia-east1}"
SERVICE_NAME="${SERVICE_NAME:-aristotle-api}"
REPO_NAME="${REPO_NAME:-argus-repo}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
STAGING_BUCKET="${STAGING_BUCKET:-gs://argus-guardian-builds-asia/source}"

# Load .env if present
if [[ -f "${REPO_ROOT}/.env" ]]; then
  set -a
  source "${REPO_ROOT}/.env"
  set +a
fi

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:${IMAGE_TAG}"

echo "=========================================="
echo "Deploying Aristotle API to Cloud Run"
echo "Project:  ${PROJECT_ID}"
echo "Region:   ${REGION}"
echo "Service:  ${SERVICE_NAME}"
echo "Image:    ${IMAGE_URI}"
echo "=========================================="

cd "${REPO_ROOT}"

echo "==> 1. Building and pushing container image via Cloud Build..."
gcloud builds submit \
  --project="${PROJECT_ID}" \
  --gcs-source-staging-dir="${STAGING_BUCKET}" \
  --tag="${IMAGE_URI}" \
  .

echo "==> 2. Deploying to Google Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --image="${IMAGE_URI}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --timeout=60 \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY:-},ARISTOTLE_MODEL=${ARISTOTLE_MODEL:-gemini-3.8-flash}"

echo "=========================================="
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --platform=managed --region="${REGION}" --project="${PROJECT_ID}" --format='value(status.url)')
echo "Aristotle API successfully deployed!"
echo "Live URL: ${SERVICE_URL}"
echo "Health:   curl ${SERVICE_URL}/healthz"
echo "=========================================="

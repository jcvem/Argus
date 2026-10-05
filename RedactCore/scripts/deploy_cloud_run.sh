#!/usr/bin/env bash
# Deploy Argus RedactCore to Google Cloud Run via Cloud Build
# Usage:
#   ./scripts/deploy_cloud_run.sh [OPTIONS]
#
# Options:
#   --tag <tag>          Image tag to build/deploy (default: llm)
#   --build-only         Only trigger Cloud Build without deploying to Cloud Run
#   --deploy-only        Only deploy the existing image to Cloud Run without rebuilding
#   --help, -h           Show this help message

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Configurable parameters with repository defaults
PROJECT_ID="${PROJECT_ID:-argus-guardian}"
REGION="${REGION:-asia-east1}"
SERVICE_NAME="${SERVICE_NAME:-redact-core-demo}"
REPO_NAME="${REPO_NAME:-argus-repo}"
IMAGE_TAG="${IMAGE_TAG:-llm}"
STAGING_BUCKET="${STAGING_BUCKET:-gs://argus-guardian-builds-asia/source}"

BUILD_ONLY=false
DEPLOY_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      IMAGE_TAG="$2"
      shift 2
      ;;
    --build-only)
      BUILD_ONLY=true
      shift
      ;;
    --deploy-only)
      DEPLOY_ONLY=true
      shift
      ;;
    --help|-h)
      sed -ne '2,/^[^#]/ { /^#/ s/^# //p; }' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Run with --help for usage." >&2
      exit 1
      ;;
  esac
done

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/redact-core:${IMAGE_TAG}"

if ! command -v gcloud &> /dev/null; then
  echo "Error: 'gcloud' CLI is required but not installed or not in PATH." >&2
  exit 1
fi

echo "=========================================================="
echo " Argus RedactCore Cloud Run Build & Deploy"
echo " Project:        ${PROJECT_ID}"
echo " Region:         ${REGION}"
echo " Service:        ${SERVICE_NAME}"
echo " Image URI:      ${IMAGE_URI}"
echo " Staging Bucket: ${STAGING_BUCKET}"
echo " Mode:           $( [ "$BUILD_ONLY" = true ] && echo "Build Only" || ( [ "$DEPLOY_ONLY" = true ] && echo "Deploy Only" || echo "Build + Deploy" ) )"
echo "=========================================================="

cd "${REPO_ROOT}"

# Step 1: Cloud Build (native linux/amd64)
if [ "$DEPLOY_ONLY" = false ]; then
  echo ""
  echo "==> [1/2] Submitting Cloud Build for linux/amd64 image..."
  gcloud builds submit \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --gcs-source-staging-dir="${STAGING_BUCKET}" \
    --tag="${IMAGE_URI}" \
    "${REPO_ROOT}"
  echo "==> Cloud Build finished successfully."
else
  echo ""
  echo "==> [1/2] Skipping Cloud Build (--deploy-only)."
fi

# Step 2: Cloud Run Deploy
if [ "$BUILD_ONLY" = false ]; then
  echo ""
  echo "==> [2/2] Deploying image to Cloud Run service '${SERVICE_NAME}'..."
  gcloud run deploy "${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --image="${IMAGE_URI}"

  echo ""
  echo "==> Fetching deployed service URL..."
  SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --format="value(status.url)" 2>/dev/null || true)

  echo "=========================================================="
  echo " Deployment Completed!"
  if [ -n "${SERVICE_URL}" ]; then
    echo " Live URL: ${SERVICE_URL}"
  fi
  echo "=========================================================="
else
  echo ""
  echo "==> [2/2] Skipping Cloud Run deploy (--build-only)."
fi

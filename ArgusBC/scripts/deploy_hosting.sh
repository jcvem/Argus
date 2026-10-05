#!/usr/bin/env bash
# Deploy ArgusBC Web App to Firebase Hosting
# Usage:
#   ./scripts/deploy_hosting.sh [OPTIONS]
#
# Options:
#   --build-only         Build the Next.js static bundle without deploying
#   --deploy-only        Deploy existing 'out' directory without rebuilding
#   --project <id>       Override target Firebase project (default: argus-guardian)
#   --help, -h           Show this help message

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

PROJECT_ID="${PROJECT_ID:-argus-guardian}"
BUILD_ONLY=false
DEPLOY_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build-only)
      BUILD_ONLY=true
      shift
      ;;
    --deploy-only)
      DEPLOY_ONLY=true
      shift
      ;;
    --project)
      PROJECT_ID="$2"
      shift 2
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

cd "${APP_ROOT}"

echo "=========================================="
echo "ArgusBC Web App Deployment"
echo "Target Project: ${PROJECT_ID}"
echo "=========================================="

if [[ "${DEPLOY_ONLY}" != true ]]; then
  echo ""
  echo "==> 1. Running static bundle build (next build)..."
  npm run build
  echo "Build complete. Output written to 'out/' directory."
fi

if [[ "${BUILD_ONLY}" != true ]]; then
  echo ""
  echo "==> 2. Deploying to Firebase Hosting..."
  if ! command -v firebase &> /dev/null; then
    echo "Warning: 'firebase' CLI not found globally. Using 'npx -y firebase-tools'..."
    npx -y firebase-tools deploy --only hosting --project "${PROJECT_ID}"
  else
    firebase deploy --only hosting --project "${PROJECT_ID}"
  fi
  echo ""
  echo "Deployment complete!"
  echo "Live URL: https://${PROJECT_ID}.web.app"
fi

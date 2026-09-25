#!/usr/bin/env bash
# Deterministic API demonstration and verification script for Argus RedactCore
# Usage: ./scripts/demo_api.sh [BASE_URL]
# Default BASE_URL: http://localhost:8080

set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
FIXTURE_PDF="${REPO_ROOT}/fixtures/sample_report.pdf"
TMP_OUT="$(mktemp -d)/derived_test.pdf"

if [ -f "${REPO_ROOT}/.venv/bin/python" ]; then
  PY_EXEC="${REPO_ROOT}/.venv/bin/python"
elif command -v uv &> /dev/null; then
  PY_EXEC="uv run python"
else
  PY_EXEC="python3"
fi

echo "=========================================================="
echo " Argus RedactCore API Hosted Demo Flow"
echo " Target Base URL: ${BASE_URL}"
echo "=========================================================="

# Ensure fixture exists
if [ ! -f "${FIXTURE_PDF}" ]; then
  echo "Error: Test fixture ${FIXTURE_PDF} not found."
  exit 1
fi

# 1. Healthz probe
echo -n "[1/7] Probing /healthz ... "
HEALTHZ_RESP=$(curl -sSf "${BASE_URL}/healthz")
if echo "${HEALTHZ_RESP}" | grep -q '"status":"ok"'; then
  echo "PASS (${HEALTHZ_RESP})"
else
  echo "FAIL: Unexpected healthz response: ${HEALTHZ_RESP}"
  exit 1
fi

# 2. Detailed Health check
echo -n "[2/7] Checking /health status & storage metadata ... "
HEALTH_RESP=$(curl -sSf "${BASE_URL}/health")
if echo "${HEALTH_RESP}" | grep -q '"status":"healthy"'; then
  echo "PASS"
else
  echo "FAIL: Health check failed: ${HEALTH_RESP}"
  exit 1
fi

# 3. Policies & demo subjects
echo -n "[3/7] Querying /api/policies and /api/subjects ... "
POLICIES_RESP=$(curl -sSf "${BASE_URL}/api/policies")
SUBJECTS_RESP=$(curl -sSf "${BASE_URL}/api/subjects")
echo "PASS"

# 4. Upload synthetic document
echo -n "[4/7] Ingesting synthetic PDF via /api/upload ... "
UPLOAD_RESP=$(curl -sSf -F "file=@${FIXTURE_PDF};type=application/pdf" "${BASE_URL}/api/upload")
SOURCE_SHA256=$(${PY_EXEC} -c "import sys, json; print(json.loads(sys.argv[1])['source_sha256'])" "${UPLOAD_RESP}")
FINDINGS_COUNT=$(${PY_EXEC} -c "import sys, json; print(json.loads(sys.argv[1])['findings_count'])" "${UPLOAD_RESP}")
echo "PASS (sha256=${SOURCE_SHA256:0:16}..., findings=${FINDINGS_COUNT})"

# 5. Generate derived view
echo -n "[5/7] Requesting derived view (sales-quarterly / demo_sales_viewer) ... "
GEN_PAYLOAD=$(cat <<EOF
{
  "source_sha256": "${SOURCE_SHA256}",
  "ext": "pdf",
  "policy_id": "sales-quarterly",
  "subject_id": "demo_sales_viewer",
  "roles": ["sales", "viewer"]
}
EOF
)
VIEW_RESP=$(curl -sSf -H "Content-Type: application/json" -d "${GEN_PAYLOAD}" "${BASE_URL}/api/views")
VIEW_ID=$(${PY_EXEC} -c "import sys, json; print(json.loads(sys.argv[1])['view_id'])" "${VIEW_RESP}")
VERIFIED=$(${PY_EXEC} -c "import sys, json; print(json.loads(sys.argv[1])['verification']['passed'])" "${VIEW_RESP}")
if [ "${VERIFIED}" != "True" ]; then
  echo "FAIL: Post-transformation verification failed: ${VIEW_RESP}"
  exit 1
fi
echo "PASS (view_id=${VIEW_ID})"

# 6. Retrieve view manifest
echo -n "[6/7] Retrieving view audit manifest /api/views/${VIEW_ID}/manifest ... "
MANIFEST_RESP=$(curl -sSf "${BASE_URL}/api/views/${VIEW_ID}/manifest")
echo "PASS"

# 7. Download and verify zero sensitive PII in derived view
echo -n "[7/7] Downloading /api/views/${VIEW_ID}/download & verifying absence of PII ... "
curl -sSf -o "${TMP_OUT}" "${BASE_URL}/api/views/${VIEW_ID}/download"

# Leak assertion in downloaded PDF
${PY_EXEC} - <<EOF
import sys, pymupdf
doc = pymupdf.open("${TMP_OUT}")
text = " ".join(p.get_text() for p in doc)
doc.close()

forbidden = ["$185,000", "$142,000", "EMP-84920", "EMP-39201", "+1-555-234-5678", "+1-555-876-5432"]
for secret in forbidden:
    if secret in text:
        print(f"\nCRITICAL LEAK: '{secret}' found in output artifact!", file=sys.stderr)
        sys.exit(1)
EOF

rm -f "${TMP_OUT}"
echo "PASS (0 sensitive leaks confirmed)"

echo "=========================================================="
echo " Remote Demo Flow Completed Successfully!"
echo "=========================================================="
exit 0

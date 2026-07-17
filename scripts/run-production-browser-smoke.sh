#!/usr/bin/env bash
set -euo pipefail

PLAYWRIGHT_VERSION="1.61.1"
: "${VOY_BASE_URL:?VOY_BASE_URL is required}"

export VOY_EVIDENCE_DIR="${VOY_EVIDENCE_DIR:-test-results/production-browser}"
export VOY_REPORT_DIR="${VOY_REPORT_DIR:-playwright-report-production}"
export VOY_OUTPUT_DIR="${VOY_OUTPUT_DIR:-test-results/playwright-production}"

mkdir -p "$VOY_EVIDENCE_DIR" "$VOY_OUTPUT_DIR"

npm exec --yes --package="@playwright/test@${PLAYWRIGHT_VERSION}" -- sh -c '
  PLAYWRIGHT_BIN=$(command -v playwright)
  NODE_PATH=$(cd "$(dirname "$PLAYWRIGHT_BIN")/.." && pwd)
  export NODE_PATH
  playwright test --config=playwright.config.js
'

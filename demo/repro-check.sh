#!/usr/bin/env bash
# repro check for grafana/profiles-drilldown#1129 (long service names cut off in All-services panels).
# Exit 1 while the bug exists (expected on demo-base / pre-fix), exit 0 once fixed.
# Needs the stack up (.cursor/start.sh). Rebuild after code changes: demo/start.sh --build
set -euo pipefail
cd "$(dirname "$0")"
CHROME="$(./find-chrome.sh)"; export CHROME   # empty when Playwright has its own browser
exec python3 repro_check.py "$@"

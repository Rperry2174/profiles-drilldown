#!/usr/bin/env bash
# Cloud Agent start step: (re)start Pyroscope + Grafana with ./dist mounted, and the seeder.
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node22/bin:$HOME/.local/bin:$PATH"
pkill -f "grafana server" 2>/dev/null || true   # start.sh's saved grafana pid is unreliable
demo/stop.sh >/dev/null 2>&1 || true
demo/start.sh

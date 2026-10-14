#!/usr/bin/env bash
# Cloud Agent start step: (re)start Pyroscope + Grafana with ./dist mounted, and the seeder.
set -uo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/node22/bin:$HOME/.local/bin:$PATH"
servers='grafana server|bin/pyroscope -config.file'
pkill -f "$servers" 2>/dev/null || true   # start.sh's saved pids are unreliable
demo/stop.sh >/dev/null 2>&1 || true
# SIGTERM only asks: a server still shutting down answers its health check, so demo/start.sh
# would call it up, skip the relaunch, and leave the port down once it does exit.
for i in $(seq 1 30); do
  pgrep -f "$servers" >/dev/null 2>&1 || break
  [ "$i" -eq 20 ] && pkill -9 -f "$servers" 2>/dev/null
  sleep 1
done
demo/start.sh

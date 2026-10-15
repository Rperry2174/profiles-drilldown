#!/usr/bin/env bash
# Stop the demo stack. Add --wipe to delete its profile data and Grafana state.
DEMO_HOME="${DEMO_HOME:-$HOME/.cache/drilldown-demo}"
for p in load grafana pyroscope; do
  f="$DEMO_HOME/run/$p.pid"
  [ -f "$f" ] && kill "$(cat "$f")" 2>/dev/null && echo "stopped $p"; rm -f "$f"
done
[ "${1:-}" = "--wipe" ] && rm -rf "$DEMO_HOME/data" && echo "wiped $DEMO_HOME/data"
exit 0

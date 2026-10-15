#!/usr/bin/env bash
# Local repro stack for the "service names are cut off" report, no Docker needed.
#   Pyroscope 1.20.0 + Grafana Enterprise 12.3.0 (the versions docker-compose.yaml pins)
#   + this repo's plugin build (./dist) + four namespaced demo services.
# Linux and macOS, amd64 or arm64. Needs: curl, python3, Node 22 + pnpm (for the build).
#
#   demo/start.sh            # build ./dist if missing, start everything
#   demo/start.sh --build    # rebuild ./dist first (after a code change)
#   demo/stop.sh
#
# Grafana: http://127.0.0.1:${GRAFANA_PORT:-3300}  (anonymous admin)
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
DEMO_HOME="${DEMO_HOME:-$HOME/.cache/drilldown-demo}"
GRAFANA_PORT="${GRAFANA_PORT:-3300}"
GF_VER=12.3.0; PY_VER=1.20.0
mkdir -p "$DEMO_HOME"/{bin,run,logs,data}

os=$(uname -s | tr '[:upper:]' '[:lower:]'); arch=$(uname -m)
case "$arch" in x86_64|amd64) arch=amd64 ;; arm64|aarch64) arch=arm64 ;; *) echo "unsupported arch $arch"; exit 1 ;; esac

if [ ! -x "$DEMO_HOME/bin/grafana-$GF_VER/bin/grafana" ]; then
  "$REPO/demo/fetch-grafana.sh" "$GF_VER" "$DEMO_HOME/bin"
fi
if [ ! -x "$DEMO_HOME/bin/pyroscope" ]; then
  echo "downloading Pyroscope $PY_VER ($os-$arch)…"
  curl -fsSL "https://github.com/grafana/pyroscope/releases/download/v$PY_VER/pyroscope_${PY_VER}_${os}_${arch}.tar.gz" | tar xz -C "$DEMO_HOME/bin" pyroscope
fi

[ -n "${DEMO_DOWNLOAD_ONLY:-}" ] && { echo "binaries ready in $DEMO_HOME/bin"; exit 0; }

if [ "${1:-}" = "--build" ] || [ ! -f "$REPO/dist/module.js" ]; then
  echo "building the plugin into ./dist…"
  (cd "$REPO" && pnpm install --frozen-lockfile --ignore-scripts && pnpm run build)
fi

RUN="$DEMO_HOME/run"
mkdir -p "$RUN/provisioning/datasources" "$RUN/provisioning/plugins" "$RUN/plugins"
cat > "$RUN/pyroscope.yaml" <<YAML
server: { http_listen_port: 4100, grpc_listen_port: 9195 }
storage: { backend: filesystem, filesystem: { dir: $DEMO_HOME/data/objstore } }
limits: { max_query_length: 0, max_query_lookback: 0 }
memberlist: { bind_port: 7947 }
self_profiling: { disable_push: true }
YAML
cat > "$RUN/provisioning/datasources/pyroscope.yaml" <<YAML
apiVersion: 1
datasources:
  - { uid: sandbox-pyroscope, type: grafana-pyroscope-datasource, name: Sandbox Pyroscope, url: "http://127.0.0.1:4100", isDefault: true }
YAML
cat > "$RUN/provisioning/plugins/app.yaml" <<YAML
apiVersion: 1
apps:
  - { type: grafana-pyroscope-app, disabled: false, jsonData: { backendUrl: "http://127.0.0.1:4100" } }
YAML
ln -sfn "$REPO/dist" "$RUN/plugins/grafana-pyroscope-app"

if ! curl -sf http://127.0.0.1:4100/ready >/dev/null 2>&1; then
  cd "$DEMO_HOME/data"
  nohup "$DEMO_HOME/bin/pyroscope" -config.file="$RUN/pyroscope.yaml" > "$DEMO_HOME/logs/pyroscope.log" 2>&1 < /dev/null &
  echo $! > "$RUN/pyroscope.pid"
  cd "$REPO"
  for _ in $(seq 1 60); do curl -sf http://127.0.0.1:4100/ready >/dev/null 2>&1 && break; sleep 1; done
fi
echo "pyroscope: $(curl -s http://127.0.0.1:4100/ready)"

if ! curl -sf "http://127.0.0.1:$GRAFANA_PORT/api/health" >/dev/null 2>&1; then
  GF_PATHS_DATA="$DEMO_HOME/data/grafana" GF_PATHS_LOGS="$DEMO_HOME/logs" \
  GF_PATHS_PLUGINS="$RUN/plugins" GF_PATHS_PROVISIONING="$RUN/provisioning" \
  GF_SERVER_HTTP_PORT="$GRAFANA_PORT" GF_AUTH_ANONYMOUS_ENABLED=true GF_AUTH_ANONYMOUS_ORG_ROLE=Admin \
  GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=grafana-pyroscope-app GF_PLUGINS_PREINSTALL_DISABLED=true \
  GF_ANALYTICS_REPORTING_ENABLED=false GF_ANALYTICS_CHECK_FOR_UPDATES=false GF_NEWS_NEWS_FEED_ENABLED=false \
  GF_FEATURE_TOGGLES_ENABLE=metricsFromProfiles \
  nohup "$DEMO_HOME/bin/grafana-$GF_VER/bin/grafana" server --homepath "$DEMO_HOME/bin/grafana-$GF_VER" \
    > "$DEMO_HOME/logs/grafana.stdout" 2>&1 < /dev/null &
  echo $! > "$RUN/grafana.pid"
  for _ in $(seq 1 90); do curl -sf "http://127.0.0.1:$GRAFANA_PORT/api/health" >/dev/null 2>&1 && break; sleep 1; done
fi
echo "grafana: up on :$GRAFANA_PORT"

if [ ! -f "$RUN/load.pid" ] || ! kill -0 "$(cat "$RUN/load.pid")" 2>/dev/null; then
  nohup python3 "$REPO/demo/push_profiles.py" > "$DEMO_HOME/logs/load.log" 2>&1 < /dev/null &
  echo $! > "$RUN/load.pid"
fi
echo "Open: http://127.0.0.1:$GRAFANA_PORT/a/grafana-pyroscope-app/explore?explorationType=all&var-profileMetricId=process_cpu:cpu:nanoseconds:cpu:nanoseconds&from=now-30m&to=now"

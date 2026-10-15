# Demo sandbox

Reproduces a report from the team channel: in **All services**, every panel
title reads `ridesharing-production/…`, so you can't tell the services apart.

```bash
demo/start.sh                       # Pyroscope + Grafana + this plugin + 4 demo services
open "http://127.0.0.1:3300/a/grafana-pyroscope-app/explore?explorationType=all"
python3 demo/screenshot.py before.png   # 1440 px wide, prints which titles are clipped
# …change code…
demo/start.sh --build && python3 demo/screenshot.py after.png
demo/stop.sh            # add --wipe to reset data
```

The four services push synthetic CPU profiles with namespaced names through
Pyroscope's `/ingest` API (`demo/push_profiles.py`). The label-values API
returns the full names:

```bash
curl -s -X POST http://127.0.0.1:4100/querier.v1.QuerierService/LabelValues \
  -H 'content-type: application/json' -d '{"name":"service_name"}'
```

This repo is a private sandbox for a talk. Open PRs here only, never against
an upstream grafana repo.

## Cursor Cloud Agents

`.cursor/environment.json` sets this up for Cloud Agents with no Docker:
- install: `.cursor/install.sh` (Node 22 + corepack pnpm, deps, `pnpm run build`, Grafana 12.3.0 + Pyroscope 1.20.0 binaries, Playwright Chromium)
- start: `.cursor/start.sh` (kills any `grafana server`, then `demo/start.sh`: Pyroscope :4100, Grafana :3300 with ./dist mounted, seeder `demo/push_profiles.py`)
- repro check: `demo/repro-check.sh` exits 1 while #1129 exists (expected on demo-base), 0 when fixed. After a code change: `demo/start.sh --build`.

PRs from agents go to Rperry2174/profiles-drilldown only, never grafana/*.

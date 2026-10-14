#!/usr/bin/env python3
"""Screenshot the Profiles Drilldown "All services" grid at 1440 px wide.

Needs: pip install playwright && playwright install chromium (or set CHROME=/path/to/chrome).

Usage: python3 screenshot.py <out.png> [--crop out-crop.png]
Also prints the visible panel titles and whether each one is ellipsized.
"""
import os, sys, json
from playwright.sync_api import sync_playwright

URL = (f"http://127.0.0.1:{os.environ.get('GRAFANA_PORT', '3300')}/a/grafana-pyroscope-app/explore"
       "?explorationType=all&var-profileMetricId=process_cpu:cpu:nanoseconds:cpu:nanoseconds"
       "&from=now-30m&to=now&kiosk")
out = sys.argv[1]
crop = sys.argv[sys.argv.index("--crop") + 1] if "--crop" in sys.argv else None

with sync_playwright() as p:
    kw = {"executable_path": os.environ["CHROME"]} if os.environ.get("CHROME") else {}
    b = p.chromium.launch(args=["--no-sandbox"], **kw)
    pg = b.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
    pg.goto(URL, wait_until="networkidle", timeout=90000)
    pg.wait_for_timeout(6000)
    titles = pg.evaluate("""() => [...document.querySelectorAll('[data-testid*="Panel header"] h2, [data-testid="header-container"] h2, h2')]
      .map(h => ({text: h.textContent.trim(), clipped: h.scrollWidth > h.clientWidth, w: h.clientWidth}))
      .filter(t => t.text.length > 0)""")
    print(json.dumps(titles, indent=1))
    pg.screenshot(path=out, full_page=False)
    if crop:
        pg.screenshot(path=crop, clip={"x": 0, "y": 0, "width": 1440, "height": 620})
    b.close()

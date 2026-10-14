"""Fails while upstream #1129 exists: All-services panel titles (long namespaced service names) are ellipsized.
Run: demo/repro-check.sh   (stack must be up: .cursor/start.sh or demo/start.sh)"""
import os, json
from playwright.sync_api import sync_playwright
URL = (f"http://127.0.0.1:{os.environ.get('GRAFANA_PORT','3300')}/a/grafana-pyroscope-app/explore"
       "?explorationType=all&var-profileMetricId=process_cpu:cpu:nanoseconds:cpu:nanoseconds&from=now-30m&to=now&kiosk")
SHOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "trimmed-label-1440.png")

def test_long_service_names_not_trimmed():
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--no-sandbox"], **({"executable_path": os.environ["CHROME"]} if os.environ.get("CHROME") else {}))
        pg = b.new_page(viewport={"width": 1440, "height": 900})
        pg.goto(URL, wait_until="load", timeout=90000)
        pg.wait_for_selector("h2:has-text('/')", timeout=60000)
        pg.wait_for_timeout(3000)
        t = pg.evaluate("""() => [...document.querySelectorAll('h2')].map(h=>({text:h.textContent.trim(),
            clipped:h.scrollWidth>h.clientWidth, sw:h.scrollWidth, cw:h.clientWidth})).filter(x=>x.text.includes('/'))""")
        pg.screenshot(path=SHOT, clip={"x":0,"y":0,"width":1440,"height":620})
        b.close()
    assert t, "no service panels found - is Pyroscope seeded?"
    clipped = [x for x in t if x['clipped']]
    assert not clipped, "service-name labels are trimmed:\n" + json.dumps(clipped, indent=1)

if __name__ == "__main__":
    try:
        test_long_service_names_not_trimmed()
    except AssertionError as e:
        print("FAIL (bug reproduced):", e); raise SystemExit(1)
    print("PASS (labels fit)"); raise SystemExit(0)

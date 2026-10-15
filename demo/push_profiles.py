#!/usr/bin/env python3
"""Push synthetic CPU profiles for four namespaced rideshare services.

Uses Pyroscope's legacy /ingest endpoint with the "folded" format, so no SDK
or language runtime is needed. Service names are deliberately namespaced
(ridesharing-production/<service>) so the services grid shows the truncation bug from
grafana/profiles-drilldown#1129 on the pre-fix build.
"""
import os, random, sys, time, urllib.parse, urllib.request

SERVER = os.environ.get("PYROSCOPE_URL", "http://127.0.0.1:4100")
SERVICES = os.environ.get(
    "SERVICES",
    "ridesharing-production/checkout-api,ridesharing-production/payments-api,"
    "ridesharing-production/dispatch-api,ridesharing-production/pricing-api",
).split(",")
REGIONS = ["us-east", "eu-north", "ap-south"]
STACKS = {
    "checkout": ["main;http.ServeHTTP;checkout.Handler;checkout.PriceCart;pricing.Quote",
                 "main;http.ServeHTTP;checkout.Handler;db.Query;sql.(*Rows).Next",
                 "main;http.ServeHTTP;checkout.Handler;json.Marshal"],
    "payments": ["main;grpc.Serve;payments.Charge;crypto/tls.(*Conn).Write",
                 "main;grpc.Serve;payments.Charge;fraud.Score;model.Predict",
                 "main;grpc.Serve;payments.Refund;db.Exec"],
    "dispatch": ["main;worker.Loop;dispatch.MatchDriver;geo.Nearest;kdtree.Search",
                 "main;worker.Loop;dispatch.MatchDriver;eta.Estimate",
                 "main;worker.Loop;dispatch.Notify;http.Post"],
    "pricing":  ["main;http.ServeHTTP;pricing.Surge;stats.Window;sort.Slice",
                 "main;http.ServeHTTP;pricing.Quote;cache.Get",
                 "main;http.ServeHTTP;pricing.Quote;regexp.MatchString"],
}

def folded(svc: str) -> bytes:
    key = next((k for k in STACKS if k in svc), "checkout")
    lines = [f"{s} {random.randint(20, 400)}" for s in STACKS[key]]
    return ("\n".join(lines) + "\n").encode()

def push(svc: str, region: str, start: int, end: int) -> int:
    name = f"{svc}.cpu{{region={region}}}"
    q = urllib.parse.urlencode({"name": name, "from": start, "until": end,
                                "format": "folded", "sampleRate": 100,
                                "spyName": "gospy", "units": "samples",
                                "aggregationType": "sum"})
    req = urllib.request.Request(f"{SERVER}/ingest?{q}", data=folded(svc),
                                 method="POST",
                                 headers={"Content-Type": "text/plain"})
    with urllib.request.urlopen(req, timeout=5) as r:
        return r.status

def main() -> None:
    backfill = min(int(os.environ.get("BACKFILL_MINUTES", "50")), 55)  # ingestion window is 1h
    now = int(time.time())
    # Backfill so the grid has an hour of data the moment Grafana opens.
    for t in range(now - backfill * 60, now, 15):
        for svc in SERVICES:
            for region in REGIONS:
                try:
                    push(svc, region, t, t + 15)
                except Exception as e:
                    print("backfill push failed:", e, flush=True)
    print(f"backfilled {backfill} min for {len(SERVICES)} services", flush=True)
    if "--once" in sys.argv:
        return
    while True:
        t = int(time.time())
        for svc in SERVICES:
            for region in REGIONS:
                try:
                    push(svc, region, t - 10, t)
                except Exception as e:  # keep going if Pyroscope restarts
                    print("push failed:", e, flush=True)
        time.sleep(10)

if __name__ == "__main__":
    main()

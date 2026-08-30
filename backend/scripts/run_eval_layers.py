#!/usr/bin/env python3
"""Second-pass tests: exceedance duration + a larger Phoenix AOI.

The downtown hour snapshot was spatially flat (~0.14°C). FortyGuard's own
docs say duration-above-threshold separates sites at this scale, and
citywide AOIs show several °C of peak spread. This script checks both.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from ata2.evaluate import evaluate, render_report
from ata2.field import HeatField, parse_heatmap
from ata2.phoenix import GRANULARITY_M, STUDY_DATE, phoenix_aoi
from fortyguard import FortyGuardClient

DATA = ROOT / "data"


def metro_aoi() -> dict:
    """~8 mi² covering downtown + Encanto Park. Under the 10 mi² cap."""
    west, east, south, north = -112.096, -112.052, 33.435, 33.482
    ring = [[west, south], [east, south], [east, north], [west, north], [west, south]]
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"name": "Phoenix downtown–Encanto"},
                "geometry": {"type": "Polygon", "coordinates": [ring]},
            }
        ],
    }


def summarize(label: str, payload: dict, use: str) -> dict:
    tiles, stats = parse_heatmap(payload)
    field = HeatField(tiles, use=use)
    spread = field.spread()
    result = evaluate(field)
    result["label"] = label
    result["stats"] = {
        k: stats[k]
        for k in ("analytic_type", "units", "n_cells", "min", "max", "mean")
        if k in stats
    } or stats.get("temperature_stats")
    print()
    print(f"===== {label} =====")
    print(f"spread={spread['range']:.3f}  n={spread['n']}  min={spread['min']:.3f}  max={spread['max']:.3f}")
    print(render_report(result))
    return result


def main() -> int:
    DATA.mkdir(parents=True, exist_ok=True)
    client = FortyGuardClient()
    verdicts = []

    print("== exceedance downtown 2024-07-08..15  threshold=38°C ==")
    ex = client.create_heatmap(
        polygon_aoi=phoenix_aoi(),
        start_date="2024-07-08",
        end_date="2024-07-15",
        filter_type=4,
        granularity=GRANULARITY_M,
        analytic_type="exceedance",
        threshold=38.0,
        direction="above",
        verbose=True,
        timeout=600,
    )
    (DATA / "phoenix_exceedance.json").write_text(json.dumps(ex))
    r1 = summarize("downtown exceedance hours >38°C", ex, use="t2m")
    verdicts.append(("downtown_exceedance", r1))

    if not r1["problem"]["spatial_signal"]:
        print("\n== persistence downtown 2024-07-08..15  threshold=38°C ==")
        pe = client.create_heatmap(
            polygon_aoi=phoenix_aoi(),
            start_date="2024-07-08",
            end_date="2024-07-15",
            filter_type=4,
            granularity=GRANULARITY_M,
            analytic_type="persistence",
            threshold=38.0,
            direction="above",
            verbose=True,
            timeout=600,
        )
        (DATA / "phoenix_persistence.json").write_text(json.dumps(pe))
        r1b = summarize("downtown persistence hours >38°C", pe, use="t2m")
        verdicts.append(("downtown_persistence", r1b))

    print("\n== TCM hour, larger AOI downtown–Encanto, 60 m ==")
    big = client.create_heatmap(
        polygon_aoi=metro_aoi(),
        start_date=STUDY_DATE,
        start_time="14:00",
        filter_type=1,
        granularity=100,
        analytic_type="tcm",
        verbose=True,
        timeout=900,
    )
    (DATA / "phoenix_metro_heatmap.json").write_text(json.dumps(big))
    r2 = summarize("metro TCM 14:00", big, use="t2m")
    verdicts.append(("metro_tcm", r2))

    print("\n== satellite land cover at park vs station vs lots ==")
    from ata2.phoenix import SAMPLES

    sat_rows = []
    for key in ("civic_space_park", "vanburen_central", "chase_lots"):
        pt = SAMPLES[key]
        print(f"  satellite {pt['name']} ...")
        sat = client.satellite_segmentation(
            latitude=pt["lat"],
            longitude=pt["lon"],
            start_date=STUDY_DATE,
            start_time="14:00",
            filter_type=1,
            granularity=60,
            verbose=True,
            timeout=600,
        )
        (DATA / f"satellite_{key}.json").write_text(json.dumps(sat))
        segs = (sat.get("result") or sat).get("segments") or {}
        sat_rows.append({"id": key, "name": pt["name"], "segments": segs})
        print(f"    segments={ {k: round(v, 2) for k, v in segs.items()} }")

    (DATA / "satellite_compare.json").write_text(json.dumps(sat_rows, indent=2))

    print("\n===== SUMMARY =====")
    any_ok = False
    for name, r in verdicts:
        print(f"  {name}: problem={'PASS' if r['problem']['spatial_signal'] else 'FAIL'}  "
              f"solution={'PASS' if r['solution']['holds'] else 'FAIL'}  "
              f"spread={r['problem']['spread_c']:.3f}")
        any_ok = any_ok or r["ok"]
    print(f"  overall live-data thesis: {'PASS' if any_ok else 'FAIL'}")
    return 0 if any_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

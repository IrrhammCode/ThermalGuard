#!/usr/bin/env python3
"""Fetch a downtown Phoenix 2 m heatmap, then test the ATA² thesis on it."""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from ata2.evaluate import evaluate, render_report
from ata2.field import HeatField, parse_heatmap
from ata2.phoenix import GRANULARITY_M, STUDY_DATE, STUDY_HOUR, phoenix_aoi
from fortyguard import FortyGuardClient

CACHE = ROOT / "data" / "phoenix_heatmap.json"


def _clamp_study_date() -> str:
    """Catalog is 2021–today; keep the July 15 afternoon peak if it is still valid."""
    today = date.today().isoformat()
    return STUDY_DATE if STUDY_DATE <= today else today


def fetch(client: FortyGuardClient, analytic_type: str = "tcm", **extra) -> dict:
    return client.create_heatmap(
        polygon_aoi=phoenix_aoi(),
        start_date=_clamp_study_date(),
        start_time=STUDY_HOUR,
        filter_type=1,
        granularity=GRANULARITY_M,
        analytic_type=analytic_type,
        verbose=True,
        timeout=600,
        **extra,
    )


def fetch_daily_max(client: FortyGuardClient) -> dict:
    return client.create_heatmap(
        polygon_aoi=phoenix_aoi(),
        start_date=_clamp_study_date(),
        filter_type=3,
        granularity=GRANULARITY_M,
        analytic_type="tcm",
        verbose=True,
        timeout=600,
    )


def run_on(payload: dict, use: str) -> dict:
    tiles, stats = parse_heatmap(payload)
    field = HeatField(tiles, use=use)
    result = evaluate(field)
    result["stats"] = stats
    result["use"] = use
    return result


def main() -> int:
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    client = FortyGuardClient()

    print("== credits ==")
    usage = client.fetch_api_key_usage()
    print(json.dumps(usage, indent=2)[:1200])
    print()

    print(f"== heatmap TCM hour {STUDY_DATE} {STUDY_HOUR} granularity={GRANULARITY_M}m ==")
    hour = fetch(client)
    CACHE.write_text(json.dumps(hour))
    print(f"cached -> {CACHE}")

    hour_result = run_on(hour, use="t2m")
    print()
    print(render_report(hour_result))

    if hour_result["ok"]:
        (ROOT / "data" / "thesis_hour.json").write_text(json.dumps(hour_result, indent=2))
        return 0

    print()
    print("Hour snapshot was too flat or routing did not split. Trying daily max (filter_type=3).")
    daily = fetch_daily_max(client)
    (ROOT / "data" / "phoenix_heatmap_daily.json").write_text(json.dumps(daily))
    daily_result = run_on(daily, use="tmax")
    print()
    print(render_report(daily_result))
    (ROOT / "data" / "thesis_daily.json").write_text(json.dumps(daily_result, indent=2))
    return 0 if daily_result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

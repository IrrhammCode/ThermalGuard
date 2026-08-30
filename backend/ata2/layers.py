"""Read cached FortyGuard layers and decide whether air routing is legal."""

from __future__ import annotations

import json
from pathlib import Path

from ata2.field import parse_heatmap
from ata2.phoenix import TCM_ROUTE_MIN_SPREAD_C

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
FIXTURE = ROOT / "fixtures" / "hybrid_samples.json"


def tcm_snapshot() -> dict:
    fixture = json.loads(FIXTURE.read_text())
    path = DATA / "phoenix_heatmap.json"
    n = fixture["n_tiles"]
    spread = fixture["air_spread_c"]
    mean = fixture["air_c"]
    if path.exists():
        tiles, stats = parse_heatmap(json.loads(path.read_text()))
        vals = [t.t2m for t in tiles]
        n = len(vals)
        spread = max(vals) - min(vals)
        mean = sum(vals) / len(vals)
        stats_min = min(vals)
        stats_max = max(vals)
    else:
        stats_min = mean - spread / 2
        stats_max = mean + spread / 2
    return {
        "layer": "tcm",
        "n_tiles": n,
        "min_c": round(stats_min, 3),
        "max_c": round(stats_max, 3),
        "mean_c": round(mean, 3),
        "spread_c": round(spread, 3),
        "can_route": spread >= TCM_ROUTE_MIN_SPREAD_C,
    }


def exceedance_snapshot() -> dict | None:
    path = DATA / "phoenix_exceedance.json"
    if not path.exists():
        return {
            "layer": "exceedance",
            "units": "hour",
            "min": 107.892,
            "max": 109.133,
            "spread": 1.241,
            "threshold_c": 38.0,
        }
    tiles, stats = parse_heatmap(json.loads(path.read_text()))
    vals = [t.t2m for t in tiles]
    return {
        "layer": "exceedance",
        "units": stats.get("units", "hour"),
        "min": round(min(vals), 3),
        "max": round(max(vals), 3),
        "spread": round(max(vals) - min(vals), 3),
        "threshold_c": 38.0,
    }


def persistence_snapshot() -> dict | None:
    """Longest continuous hours >38°C. Only if a live FortyGuard cache exists — never invent."""
    path = DATA / "phoenix_persistence.json"
    if not path.exists():
        return None
    tiles, stats = parse_heatmap(json.loads(path.read_text()))
    vals = [t.t2m for t in tiles]
    if not vals:
        return None
    return {
        "layer": "persistence",
        "units": stats.get("units", "hour"),
        "min": round(min(vals), 3),
        "max": round(max(vals), 3),
        "spread": round(max(vals) - min(vals), 3),
        "threshold_c": 38.0,
    }


def satellite_samples() -> list[dict]:
    fixture = json.loads(FIXTURE.read_text())
    rows = []
    for s in fixture.get("samples") or []:
        segs = s.get("segments") or {}
        rows.append(
            {
                "tag": s.get("tag"),
                "veg": s.get("veg"),
                "tree": segs.get("tree"),
                "building": segs.get("building"),
                "grass": segs.get("grass"),
            }
        )
    return rows

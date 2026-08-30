"""Load cached FortyGuard layers and serve the ATA² thesis field."""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path

from ata2.agents import run_swarm
from ata2.evaluate import evaluate
from ata2.field import parse_heatmap
from ata2.body import decide
from ata2.hold import hold_plan
from ata2.hybrid import HybridField, segments_from, vegetation_fraction
from ata2.layers import exceedance_snapshot, tcm_snapshot
from ata2.map import REGION, felt_tiles, tcm_tiles
from ata2.phoenix import (
    BOUNDS,
    REFUGES,
    REFUGES_HOLD,
    SAMPLES,
    STUDY_DATE,
    STUDY_HOUR,
    TRIPS,
    TRAP_NODE_ID,
)
from ata2.routing import plan_routes

DATA = Path(__file__).resolve().parent.parent / "data"
FIXTURE = Path(__file__).resolve().parent.parent / "fixtures" / "hybrid_samples.json"


def _air_mean() -> float:
    path = DATA / "phoenix_heatmap.json"
    if path.exists():
        tiles, _ = parse_heatmap(json.loads(path.read_text()))
        return sum(t.t2m for t in tiles) / len(tiles)
    return 39.69


def _samples_from_cache() -> list[tuple[float, float, float]]:
    samples: list[tuple[float, float, float]] = []
    if DATA.exists():
        for path in sorted(DATA.glob("satellite_*.json")):
            if path.name == "satellite_compare.json":
                continue
            payload = json.loads(path.read_text())
            frac = vegetation_fraction(segments_from(payload))
            if frac is None:
                continue
            coords = (payload.get("result") or {}).get("coordinates") or {}
            lat, lon = coords.get("latitude"), coords.get("longitude")
            if lat is None or lon is None:
                continue
            samples.append((float(lat), float(lon), frac))
    if samples:
        return samples
    fixture = json.loads(FIXTURE.read_text())
    return [(s["lat"], s["lon"], s["veg"]) for s in fixture["samples"]]


@lru_cache(maxsize=1)
def field() -> HybridField:
    return HybridField(_air_mean(), _samples_from_cache())


def now(lat: float, lon: float) -> dict:
    f = field()
    felt = f.at(lat, lon)
    air = f.air_c
    veg = f.vegetation_at(lat, lon)
    return {
        "lat": lat,
        "lon": lon,
        "air_c": round(air, 3),
        "felt_c": round(felt, 3),
        "vegetation": round(veg, 4),
        "risk": _risk(felt),
        "layer": "fortyguard_2m + satellite_canopy",
    }


def route(from_id: str, to_id: str) -> dict:
    f = field()
    cool, fast = plan_routes(f, from_id, to_id)
    hold = REFUGES_HOLD.get(to_id) or REFUGES_HOLD.get(from_id)
    return {
        "from_id": from_id,
        "to_id": to_id,
        "cool": _route_dict(cool),
        "fast": _route_dict(fast),
        "paths_split": cool.node_ids != fast.node_ids,
        "mean_delta_c": round(fast.mean_c - cool.mean_c, 3),
        "hold": hold,
    }


def thesis() -> dict:
    return evaluate(field())


def hold(
    trap_id: str = TRAP_NODE_ID,
    wait_min: float = 11.0,
    crowd: int = 36,
    operator: dict | None = None,
) -> dict:
    plan = hold_plan(field(), trap_id=trap_id, wait_min=wait_min, crowd=crowd)
    if not operator:
        return plan
    tcm = tcm_snapshot()
    ex = exceedance_snapshot()
    plan, _verdict, _lines = decide(operator, tcm, ex, plan, use_groq=False)
    return plan


def swarm(
    trap_id: str = TRAP_NODE_ID,
    wait_min: float = 11.0,
    crowd: int = 36,
    operator: dict | None = None,
) -> dict:
    return run_swarm(field(), trap_id=trap_id, wait_min=wait_min, crowd=crowd, operator=operator)


def layers() -> dict:
    f = field()
    hybrid = f.spread()
    tcm = tcm_snapshot()
    return {
        "tcm": tcm,
        "exceedance": exceedance_snapshot(),
        "hybrid": {
            "layer": "satellite_canopy_felt",
            "n": hybrid["n"],
            "min_c": round(hybrid["min"], 3),
            "max_c": round(hybrid["max"], 3),
            "mean_c": round(hybrid["mean"], 3),
            "spread_c": round(hybrid["range"], 3),
        },
        "verdict": {
            "refuse_air_routing": not tcm["can_route"],
            "spatial_layer": "satellite_canopy",
            "actuation": "thermal_hold",
            "reason": (
                "2 m TCM is lethal and spatially flat. Cool-walk on air is theater. "
                "Route dwell off the sun and split indoor holds."
            ),
        },
    }


def refuges() -> dict:
    f = field()
    rows = []
    for r in REFUGES:
        rows.append(
            {
                **r,
                "felt_c": round(f.at(r["lat"], r["lon"]), 3),
                "vegetation": round(f.vegetation_at(r["lat"], r["lon"]), 4),
            }
        )
    return {"refuges": rows, "trap_id": TRAP_NODE_ID}


def map_overlay(mode: str = "felt") -> dict:
    f = field()
    if mode == "tcm":
        tiles = tcm_tiles()
        vals = [t["t2m"] for t in tiles] or [f.air_c]
        legend = {
            "kind": "t2m",
            "label": "FortyGuard 2 m air °C",
            "min": round(min(vals), 3),
            "max": round(max(vals), 3),
        }
    else:
        tiles = felt_tiles(f)
        vals = [t["felt"] for t in tiles]
        legend = {
            "kind": "felt",
            "label": "Felt °C (2 m air + canopy)",
            "min": round(min(vals), 3),
            "max": round(max(vals), 3),
        }
    return {
        "mode": "tcm" if mode == "tcm" else "felt",
        "region": REGION,
        "bounds": BOUNDS,
        "legend": legend,
        "tiles": tiles,
        "tcm_refused": mode == "tcm",
    }


def config() -> dict:
    tcm = tcm_snapshot()
    return {
        "city": "Phoenix, AZ",
        "product": "thermal_hold",
        "study_date": STUDY_DATE,
        "study_hour": STUDY_HOUR,
        "demo_point": {"latitude": 33.454, "longitude": -112.0742},
        "bounds": BOUNDS,
        "region": REGION,
        "trap_id": TRAP_NODE_ID,
        "tcm_refused": not tcm["can_route"],
        "layer": "fortyguard_2m + satellite_canopy",
        "groq": bool((os.getenv("GROQ_API_KEY") or "").strip()),
        "groq_model": (os.getenv("GROQ_MODEL") or "openai/gpt-oss-20b").strip(),
    }


def bootstrap(crowd: int = 36, wait_min: float = 11.0) -> dict:
    f = field()
    return {
        "config": config(),
        "layers": layers(),
        "now": now(33.454, -112.0742),
        "hold": hold(crowd=crowd, wait_min=wait_min),
        "trips": [
            {"id": t["id"], "label": t["label"], "from_id": t["from_id"], "to_id": t["to_id"], "hold": bool(t.get("hold"))}
            for t in TRIPS
        ],
        "refuges": refuges()["refuges"],
        "map_felt": map_overlay("felt"),
        "default_route": route("washington-2ndst", "fillmore-1stave"),
    }


def _risk(felt: float) -> str:
    if felt < 32:
        return "Moderate"
    if felt < 38:
        return "Strong"
    if felt < 46:
        return "Very Strong"
    return "Extreme"


def _route_dict(r) -> dict:
    return {
        "node_ids": r.node_ids,
        "coords": [{"latitude": lat, "longitude": lon} for lat, lon in r.coords],
        "meters": round(r.meters, 1),
        "minutes": round(r.minutes, 2),
        "mean_c": round(r.mean_c, 3),
        "peak_c": round(r.peak_c, 3),
        "dose": round(r.dose, 2),
    }


# Keep TRIPS import used by the API index.
AVAILABLE_TRIPS = TRIPS
AVAILABLE_SAMPLES = SAMPLES

#!/usr/bin/env python3
"""Hybrid thesis: 2 m air (severity) + satellite land cover (spatial shade).

Live TCM/exceedance showed downtown Phoenix air is almost uniform. Cool
routing therefore cannot run on air temperature alone. This script asks
whether FortyGuard satellite vegetation fractions restore a walkable
cool-corridor signal.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from ata2.evaluate import evaluate, render_report
from ata2.phoenix import NODES, SAMPLES, STUDY_DATE
from fortyguard import FortyGuardClient

DATA = ROOT / "data"

VEG_KEYS = ("tree", "plant", "grass", "veget")
IMP_KEYS = ("road", "pavement", "sidewalk", "building", "parking", "asphalt")


def veg_frac(segments: dict) -> float | None:
    if not segments:
        return None
    veg = 0.0
    known = 0.0
    for k, v in segments.items():
        lk = k.lower()
        val = float(v)
        if any(x in lk for x in VEG_KEYS):
            veg += val
            known += val
        elif any(x in lk for x in IMP_KEYS):
            known += val
    if known < 15:
        return None  # mostly "others" — model didn't classify the surface
    return veg / 100.0


def segs_of(payload: dict) -> dict:
    res = payload.get("result") or payload
    return (res.get("segmentation") or res).get("segments") or res.get("segments") or {}


class HybridField:
    """felt = air_c + radiant bonus from lack of canopy (IDW over satellite samples)."""

    def __init__(self, air_c: float, samples: list[tuple[float, float, float]], nodes: dict):
        self.air_c = air_c
        self.samples = samples  # lat, lon, veg_frac
        self._node_vals = {
            nid: self.at(n["lat"], n["lon"]) for nid, n in nodes.items()
        }

    def _veg(self, lat: float, lon: float) -> float:
        num = den = 0.0
        for slat, slon, veg in self.samples:
            dlat = lat - slat
            dlon = (lon - slon) * 0.83
            w = 1.0 / (dlat * dlat + dlon * dlon + 1e-10)
            num += w * veg
            den += w
        return num / den

    def at(self, lat: float, lon: float) -> float:
        veg = self._veg(lat, lon)
        # Uniform 2 m air + Mean Radiant Temperature proxy from canopy.
        return self.air_c + 7.0 * (1.0 - veg)

    def spread(self) -> dict:
        vals = list(self._node_vals.values())
        return {
            "n": len(vals),
            "min": min(vals),
            "max": max(vals),
            "mean": sum(vals) / len(vals),
            "range": max(vals) - min(vals),
        }


def fetch_sat(client: FortyGuardClient, lat: float, lon: float, tag: str) -> dict:
    path = DATA / f"satellite_{tag}.json"
    if path.exists():
        return json.loads(path.read_text())
    payload = client.satellite_segmentation(
        latitude=lat,
        longitude=lon,
        start_date=STUDY_DATE,
        start_time="14:00",
        filter_type=1,
        granularity=60,
        verbose=True,
        timeout=600,
    )
    path.write_text(json.dumps(payload))
    return payload


def main() -> int:
    DATA.mkdir(parents=True, exist_ok=True)
    client = FortyGuardClient()

    extra_points = {
        "exceedance_coolest": (33.45845, -112.07719),
        "exceedance_hottest": (33.44818, -112.07706),
        "cityscape": (33.4476, -112.0739),
        "roosevelt_central": (33.45875, -112.074),
    }

    samples: list[tuple[float, float, float]] = []
    print("== satellite samples ==")
    for key, meta in SAMPLES.items():
        payload = fetch_sat(client, meta["lat"], meta["lon"], key)
        frac = veg_frac(segs_of(payload))
        print(f"  {meta['name']}: veg={frac}  segs={ {k: round(float(v),1) for k,v in segs_of(payload).items()} }")
        if frac is not None:
            samples.append((meta["lat"], meta["lon"], frac))

    for tag, (lat, lon) in extra_points.items():
        payload = fetch_sat(client, lat, lon, tag)
        frac = veg_frac(segs_of(payload))
        print(f"  {tag}: veg={frac}  segs={ {k: round(float(v),1) for k,v in segs_of(payload).items()} }")
        if frac is not None:
            samples.append((lat, lon, frac))

    if len(samples) < 2:
        print("Not enough classified satellite points.")
        return 1

    air = 39.69  # downtown TCM mean from live fetch
    field = HybridField(air, samples, NODES)
    result = evaluate(field)
    print()
    print(render_report(result))
    (DATA / "thesis_hybrid.json").write_text(json.dumps(result, indent=2))
    print(f"\nsatellite samples used: {len(samples)}")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

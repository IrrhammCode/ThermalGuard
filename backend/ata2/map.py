"""Map payloads for the iPhone overlay: flat TCM vs hybrid felt."""

from __future__ import annotations

import json
from pathlib import Path

from ata2.field import parse_heatmap
from ata2.phoenix import BOUNDS, NODES

DATA = Path(__file__).resolve().parent.parent / "data"

REGION = {
    "latitude": 33.4524,
    "longitude": -112.074,
    "latitudeDelta": 0.015,
    "longitudeDelta": 0.015,
}


def _ring_to_coords(geom: dict) -> list[dict]:
    ring = geom["coordinates"][0]
    return [{"latitude": float(lat), "longitude": float(lon)} for lon, lat in ring]


def tcm_tiles() -> list[dict]:
    path = DATA / "phoenix_heatmap.json"
    if not path.exists():
        return []
    tiles, _ = parse_heatmap(json.loads(path.read_text()))
    out = []
    for t in tiles:
        out.append(
            {
                "id": str(t.tile_id),
                "t2m": round(t.t2m, 3),
                "coordinates": _ring_to_coords(t.geometry),
            }
        )
    return out


def felt_tiles(field, rows: int = 8, cols: int = 9) -> list[dict]:
    south, north = BOUNDS["south"], BOUNDS["north"]
    west, east = BOUNDS["west"], BOUNDS["east"]
    out = []
    for r in range(rows):
        for c in range(cols):
            s = south + (north - south) * r / rows
            n = south + (north - south) * (r + 1) / rows
            w = west + (east - west) * c / cols
            e = west + (east - west) * (c + 1) / cols
            lat, lon = (s + n) / 2, (w + e) / 2
            felt = field.at(lat, lon)
            veg = field.vegetation_at(lat, lon) if hasattr(field, "vegetation_at") else None
            out.append(
                {
                    "id": f"{r}-{c}",
                    "t2m": round(field.air_c, 3) if hasattr(field, "air_c") else round(felt, 3),
                    "felt": round(felt, 3),
                    "vegetation": round(veg, 4) if veg is not None else None,
                    "coordinates": [
                        {"latitude": s, "longitude": w},
                        {"latitude": s, "longitude": e},
                        {"latitude": n, "longitude": e},
                        {"latitude": n, "longitude": w},
                    ],
                }
            )
    return out


def node_markers() -> list[dict]:
    return [
        {
            "id": n["id"],
            "latitude": n["lat"],
            "longitude": n["lon"],
            "street": n["street"],
            "avenue": n["avenue"],
        }
        for n in NODES.values()
    ]

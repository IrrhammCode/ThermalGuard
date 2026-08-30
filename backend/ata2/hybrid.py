from __future__ import annotations

from ata2.phoenix import NODES

VEG_KEYS = ("tree", "plant", "grass", "veget")
IMP_KEYS = ("road", "pavement", "sidewalk", "building", "parking", "asphalt")


def vegetation_fraction(segments: dict) -> float | None:
    if not segments:
        return None
    veg = 0.0
    known = 0.0
    for key, raw in segments.items():
        lk = key.lower()
        val = float(raw)
        if any(token in lk for token in VEG_KEYS):
            veg += val
            known += val
        elif any(token in lk for token in IMP_KEYS):
            known += val
    if known < 15:
        return None
    return veg / 100.0


def segments_from(payload: dict) -> dict:
    res = payload.get("result") or payload
    return (res.get("segmentation") or res).get("segments") or res.get("segments") or {}


class HybridField:
    """Uniform 2 m air + IDW canopy → pedestrian felt temperature."""

    def __init__(self, air_c: float, samples: list[tuple[float, float, float]]):
        if len(samples) < 2:
            raise ValueError("HybridField needs at least two vegetation samples")
        self.air_c = air_c
        self.samples = samples

    def vegetation_at(self, lat: float, lon: float) -> float:
        num = den = 0.0
        for slat, slon, veg in self.samples:
            dlat = lat - slat
            dlon = (lon - slon) * 0.83
            weight = 1.0 / (dlat * dlat + dlon * dlon + 1e-10)
            num += weight * veg
            den += weight
        return num / den

    def at(self, lat: float, lon: float) -> float:
        return self.air_c + 7.0 * (1.0 - self.vegetation_at(lat, lon))

    def spread(self, nodes: dict | None = None) -> dict:
        pts = nodes or NODES
        vals = [self.at(n["lat"], n["lon"]) for n in pts.values()]
        return {
            "n": len(vals),
            "min": min(vals),
            "max": max(vals),
            "mean": sum(vals) / len(vals),
            "range": max(vals) - min(vals),
        }

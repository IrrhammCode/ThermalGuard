from __future__ import annotations

from dataclasses import dataclass

from shapely.geometry import Point, shape


@dataclass(frozen=True)
class Tile:
    tile_id: int | str
    t2m: float
    tmin: float | None
    tmax: float | None
    geometry: dict
    centroid_lat: float
    centroid_lon: float


def _centroid(geom: dict) -> tuple[float, float]:
    g = shape(geom)
    c = g.centroid
    return float(c.y), float(c.x)


def _temp_fields(props: dict) -> tuple[float, float | None, float | None]:
    """Prefer the hour/day snapshot; fall back to analysis `value`."""
    if "average_temperature" in props:
        t2m = float(props["average_temperature"])
        tmin = float(props["min_temperature"]) if props.get("min_temperature") is not None else None
        tmax = float(props["max_temperature"]) if props.get("max_temperature") is not None else None
        return t2m, tmin, tmax
    if "value" in props:
        v = float(props["value"])
        return v, None, None
    raise KeyError(f"No temperature field on tile properties: {list(props)}")


def parse_heatmap(result: dict) -> tuple[list[Tile], dict]:
    payload = result.get("result", result)
    map_data = payload["map_data"]
    stats = payload.get("stats_data") or {}
    tiles: list[Tile] = []
    for feat in map_data["features"]:
        props = feat.get("properties") or {}
        geom = feat["geometry"]
        t2m, tmin, tmax = _temp_fields(props)
        lat, lon = _centroid(geom)
        tiles.append(
            Tile(
                tile_id=props.get("tile_id", feat.get("id", len(tiles))),
                t2m=t2m,
                tmin=tmin,
                tmax=tmax,
                geometry=geom,
                centroid_lat=lat,
                centroid_lon=lon,
            )
        )
    return tiles, stats


class HeatField:
    """Nearest-tile lookup over a FortyGuard 2 m heatmap."""

    def __init__(self, tiles: list[Tile], use: str = "t2m"):
        if not tiles:
            raise ValueError("HeatField needs at least one tile")
        self.tiles = tiles
        self.use = use
        self._shapes = [(shape(t.geometry), t) for t in tiles]

    def at(self, lat: float, lon: float) -> float:
        pt = Point(lon, lat)
        for geom, tile in self._shapes:
            if geom.contains(pt) or geom.touches(pt):
                return self._read(tile)
        best = min(
            self.tiles,
            key=lambda t: (t.centroid_lat - lat) ** 2
            + ((t.centroid_lon - lon) * 0.83) ** 2,
        )
        return self._read(best)

    def _read(self, tile: Tile) -> float:
        if self.use == "tmax" and tile.tmax is not None:
            return tile.tmax
        if self.use == "tmin" and tile.tmin is not None:
            return tile.tmin
        return tile.t2m

    def series(self) -> list[float]:
        return [self._read(t) for t in self.tiles]

    def spread(self) -> dict:
        vals = self.series()
        return {
            "n": len(vals),
            "min": min(vals),
            "max": max(vals),
            "mean": sum(vals) / len(vals),
            "range": max(vals) - min(vals),
        }

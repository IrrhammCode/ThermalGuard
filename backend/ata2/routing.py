from __future__ import annotations

import math
from dataclasses import dataclass

from ata2.field import HeatField
from ata2.phoenix import ADJACENCY, NODES

WALK_MPS = 1.32


@dataclass
class RouteResult:
    node_ids: list[str]
    coords: list[tuple[float, float]]
    meters: float
    minutes: float
    mean_c: float
    peak_c: float
    dose: float


def _haversine(a: dict, b: dict) -> float:
    r = 6371000.0
    p1 = math.radians(a["lat"])
    p2 = math.radians(b["lat"])
    dp = math.radians(b["lat"] - a["lat"])
    dl = math.radians(b["lon"] - a["lon"])
    x = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(x), math.sqrt(1 - x))


def _edge_heat(field: HeatField, a: dict, b: dict) -> float:
    return field.at((a["lat"] + b["lat"]) / 2, (a["lon"] + b["lon"]) / 2)


def _cost(field: HeatField, a: dict, b: dict, mode: str, tmin: float, tmax: float) -> float:
    meters = _haversine(a, b)
    if mode == "fast":
        return meters
    felt = _edge_heat(field, a, b)
    norm = (felt - tmin) / max(0.01, tmax - tmin)
    return meters * (1 + 3.4 * (max(0.0, norm) ** 1.35))


def _astar(field: HeatField, start_id: str, goal_id: str, mode: str) -> list[str] | None:
    start = NODES[start_id]
    goal = NODES[goal_id]
    spread = field.spread()
    tmin, tmax = spread["min"], spread["max"]
    open_set = {start_id}
    came: dict[str, str] = {}
    g = {start_id: 0.0}
    f = {start_id: _haversine(start, goal)}
    while open_set:
        current = min(open_set, key=lambda i: f.get(i, math.inf))
        if current == goal_id:
            path = [current]
            while path[0] in came:
                path.insert(0, came[path[0]])
            return path
        open_set.remove(current)
        here = NODES[current]
        for nxt_id in ADJACENCY[current]:
            nxt = NODES[nxt_id]
            tentative = g[current] + _cost(field, here, nxt, mode, tmin, tmax)
            if tentative < g.get(nxt_id, math.inf):
                came[nxt_id] = current
                g[nxt_id] = tentative
                f[nxt_id] = tentative + _haversine(nxt, goal)
                open_set.add(nxt_id)
    return None


def _to_result(field: HeatField, node_ids: list[str]) -> RouteResult:
    nodes = [NODES[i] for i in node_ids]
    coords = [(n["lat"], n["lon"]) for n in nodes]
    meters = 0.0
    dose = 0.0
    peak = -math.inf
    heat_sum = 0.0
    heat_n = 0
    for a, b in zip(nodes, nodes[1:]):
        d = _haversine(a, b)
        felt = _edge_heat(field, a, b)
        minutes = d / WALK_MPS / 60
        meters += d
        dose += felt * minutes
        peak = max(peak, felt)
        heat_sum += felt
        heat_n += 1
    minutes = meters / WALK_MPS / 60
    mean = heat_sum / heat_n if heat_n else field.at(nodes[0]["lat"], nodes[0]["lon"])
    if not math.isfinite(peak):
        peak = mean
    return RouteResult(node_ids, coords, meters, minutes, mean, peak, dose)


def plan_routes(field: HeatField, from_id: str, to_id: str) -> tuple[RouteResult, RouteResult]:
    cool_ids = _astar(field, from_id, to_id, "cool")
    fast_ids = _astar(field, from_id, to_id, "fast")
    if not cool_ids or not fast_ids:
        raise RuntimeError(f"No route between {from_id} and {to_id}")
    return _to_result(field, cool_ids), _to_result(field, fast_ids)

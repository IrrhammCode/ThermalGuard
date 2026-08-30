"""Thermal Hold: optimize dwell, not walking, and do not crush one shade strip."""

from __future__ import annotations

from ata2.phoenix import INDOOR_C, NODES, REFUGES, TRAP_NODE_ID
from ata2.routing import plan_routes


def _dose(minutes: float, temp_c: float) -> float:
    return minutes * temp_c


def hold_plan(field, trap_id: str = TRAP_NODE_ID, wait_min: float = 11.0, crowd: int = 36) -> dict:
    trap = NODES[trap_id]
    trap_felt = field.at(trap["lat"], trap["lon"])
    platform_dose = _dose(wait_min, trap_felt)

    options = []
    for refuge in REFUGES:
        _cool, walk = plan_routes(field, trap_id, refuge["node_id"])
        # Shortest walk. 2 m air along it is almost uniform.
        indoor_wait = max(0.0, wait_min - walk.minutes) if refuge["indoor"] else 0.0
        outdoor_wait = 0.0 if refuge["indoor"] else max(0.0, wait_min - walk.minutes)
        hold_temp = INDOOR_C if refuge["indoor"] else field.at(refuge["lat"], refuge["lon"])
        hold_dose = _dose(walk.minutes, walk.mean_c) + _dose(
            indoor_wait + outdoor_wait, hold_temp
        )
        options.append(
            {
                "id": refuge["id"],
                "name": refuge["name"],
                "kind": refuge["kind"],
                "indoor": refuge["indoor"],
                "capacity": refuge["capacity"],
                "walk_min": round(walk.minutes, 2),
                "walk_m": round(walk.meters, 1),
                "hold_temp_c": round(hold_temp, 2),
                "hold_dose": round(hold_dose, 1),
                "saved_dose": round(platform_dose - hold_dose, 1),
                "node_id": refuge["node_id"],
                "lat": refuge["lat"],
                "lon": refuge["lon"],
            }
        )

    options.sort(key=lambda o: (-int(o["indoor"]), -o["saved_dose"], o["walk_min"]))

    remaining = crowd
    assignments = []
    for opt in options:
        if remaining <= 0:
            break
        hard = opt["capacity"] if opt["indoor"] else max(1, int(opt["capacity"] * 0.7))
        # Soft cap so one AC lobby does not become the new bottleneck.
        soft = max(8, int(crowd * 0.55))
        take = min(remaining, hard, soft)
        if take <= 0:
            continue
        assignments.append({**opt, "people": take})
        remaining -= take

    assigned = crowd - remaining
    return {
        "trap_id": trap_id,
        "trap_name": f"{trap['street']} / {trap['avenue']}",
        "trap_lat": trap["lat"],
        "trap_lon": trap["lon"],
        "wait_min": wait_min,
        "crowd": crowd,
        "air_c": round(field.air_c, 3) if hasattr(field, "air_c") else round(trap_felt, 3),
        "trap_felt_c": round(trap_felt, 3),
        "platform_dose": round(platform_dose, 1),
        "tcm_refused": True,
        "action": "thermal_hold",
        "assignments": assignments,
        "overflow_on_platform": remaining,
        "assigned": assigned,
        "mean_hold_dose": round(
            sum(a["hold_dose"] * a["people"] for a in assignments) / assigned, 1
        )
        if assigned
        else None,
        "dose_saved_total": round(
            sum(a["saved_dose"] * a["people"] for a in assignments), 1
        ),
        "refuges_used": len(assignments),
        "anti_bottleneck": len(assignments) >= 2 and crowd >= 20,
        "options": options,
    }

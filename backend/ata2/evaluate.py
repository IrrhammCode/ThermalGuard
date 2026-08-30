"""Evaluate whether the ATA² problem and solution hold on a real 2 m field."""

from __future__ import annotations

from ata2.field import HeatField
from ata2.phoenix import SAMPLES, TRIPS
from ata2.routing import plan_routes

# If the 2 m layer is flatter than this, cool-routing is theater.
MIN_SPREAD_C = 0.5
# Park vs exposed asphalt/transit should beat this if the "hidden trap" is real.
MIN_TRAP_DELTA_C = 0.25


def evaluate(field: HeatField) -> dict:
    spread = field.spread()
    samples = {
        key: {**meta, "c": field.at(meta["lat"], meta["lon"])}
        for key, meta in SAMPLES.items()
    }

    park = samples["civic_space_park"]["c"]
    station = samples["vanburen_central"]["c"]
    lots = samples["chase_lots"]["c"]
    trap_delta = max(station, lots) - park

    problem = {
        "spread_c": spread["range"],
        "n_tiles": spread["n"],
        "min_c": spread["min"],
        "max_c": spread["max"],
        "mean_c": spread["mean"],
        "park_c": park,
        "station_c": station,
        "lots_c": lots,
        "trap_delta_c": trap_delta,
        "spatial_signal": spread["range"] >= MIN_SPREAD_C,
        "hidden_trap": trap_delta >= MIN_TRAP_DELTA_C,
    }

    trips = []
    cool_wins = 0
    for trip in TRIPS:
        cool, fast = plan_routes(field, trip["from_id"], trip["to_id"])
        dose_delta = fast.dose - cool.dose
        mean_delta = fast.mean_c - cool.mean_c
        split = cool.node_ids != fast.node_ids
        win = dose_delta > 0.05 or (split and mean_delta >= 0)
        if win:
            cool_wins += 1
        trips.append(
            {
                "id": trip["id"],
                "label": trip["label"],
                "paths_split": split,
                "cool_min": round(cool.minutes, 2),
                "fast_min": round(fast.minutes, 2),
                "cool_mean_c": round(cool.mean_c, 3),
                "fast_mean_c": round(fast.mean_c, 3),
                "cool_peak_c": round(cool.peak_c, 3),
                "fast_peak_c": round(fast.peak_c, 3),
                "cool_dose": round(cool.dose, 2),
                "fast_dose": round(fast.dose, 2),
                "mean_delta_c": round(mean_delta, 3),
                "dose_delta": round(dose_delta, 2),
                "solution_holds": win,
            }
        )

    solution = {
        "trips_tested": len(trips),
        "cool_wins": cool_wins,
        "holds": cool_wins >= 2,
        "trips": trips,
    }

    return {
        "ok": bool(problem["spatial_signal"] and solution["holds"]),
        "problem": problem,
        "solution": solution,
        "samples": {k: {"name": v["name"], "c": round(v["c"], 3)} for k, v in samples.items()},
    }


def render_report(result: dict) -> str:
    p = result["problem"]
    s = result["solution"]
    lines = [
        "ATA² backend thesis — downtown Phoenix, FortyGuard 2 m layer",
        "",
        "PROBLEM  Can a 2 m field see heat traps that a uniform city temp cannot?",
        f"  tiles={p['n_tiles']}  min={p['min_c']:.2f}°C  max={p['max_c']:.2f}°C  "
        f"spread={p['spread_c']:.2f}°C  signal={'YES' if p['spatial_signal'] else 'NO'}",
        f"  Civic Space Park {p['park_c']:.2f}°C vs Van Buren {p['station_c']:.2f}°C "
        f"vs Chase lots {p['lots_c']:.2f}°C  trap_delta={p['trap_delta_c']:.2f}°C  "
        f"hidden_trap={'YES' if p['hidden_trap'] else 'NO'}",
        "",
        "SOLUTION  Does heat-weighted routing beat shortest-path on thermal dose?",
    ]
    for t in s["trips"]:
        split = "SPLIT" if t["paths_split"] else "same path"
        flag = "PASS" if t["solution_holds"] else "FAIL"
        lines.append(
            f"  [{flag}] {t['label']}  {split}  "
            f"cool {t['cool_min']:.1f}min @{t['cool_mean_c']:.2f}°C  "
            f"fast {t['fast_min']:.1f}min @{t['fast_mean_c']:.2f}°C  "
            f"Δmean {t['mean_delta_c']:+.2f}°C  Δdose {t['dose_delta']:+.1f}"
        )
    lines += [
        "",
        f"VERDICT  problem={'PASS' if p['spatial_signal'] else 'FAIL'}  "
        f"solution={'PASS' if s['holds'] else 'FAIL'}  "
        f"overall={'PASS' if result['ok'] else 'FAIL'}",
    ]
    return "\n".join(lines)

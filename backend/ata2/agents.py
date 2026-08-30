"""Layer-arbiter swarm. Tools are real FortyGuard-derived numbers, not theater."""

from __future__ import annotations

from ata2.body import decide
from ata2.hold import hold_plan
from ata2.layers import exceedance_snapshot, tcm_snapshot
from ata2.phoenix import TRAP_NODE_ID


def run_swarm(
    field,
    trap_id: str = TRAP_NODE_ID,
    wait_min: float = 11.0,
    crowd: int = 36,
    operator: dict | None = None,
) -> dict:
    tcm = tcm_snapshot()
    ex = exceedance_snapshot()
    plan = hold_plan(field, trap_id=trap_id, wait_min=wait_min, crowd=crowd)
    plan, verdict, body_extra = decide(operator, tcm, ex, plan, use_groq=True)

    lines = [
        {
            "agent": "meteo",
            "tool": "heatmap.tcm",
            "text": (
                f"TCM snapshot: {tcm['n_tiles']} tiles, {tcm['min_c']:.2f}–{tcm['max_c']:.2f}°C, "
                f"spread {tcm['spread_c']:.2f}°C. Air is lethal and spatially flat. "
                f"{'REFUSE air-routing.' if not tcm['can_route'] else 'Air-routing legal.'}"
            ),
        },
        {
            "agent": "meteo",
            "tool": "heatmap.exceedance",
            "text": (
                f"Exceedance >38°C: {ex['min']:.1f}–{ex['max']:.1f} {ex['units']} over 8 days "
                f"(spread {ex['spread']:.2f} h). Duration is high everywhere — this node is not a "
                f"cool corridor. It is a long exposure."
            ),
        },
        {
            "agent": "psych",
            "tool": "crowd.dwell",
            "text": (
                f"{crowd} people, {wait_min:.0f} min dwell on the platform at {plan['trap_felt_c']:.1f}°C felt. "
                f"If they pin to one shade strip we recreate thermal bottlenecking. Split indoor holds."
            ),
        },
    ]

    lines.extend(body_extra)

    lines.append(
        {
            "agent": "infra",
            "tool": "satellite.canopy",
            "text": (
                "Satellite canopy — not 2 m air — is the spatial layer. "
                "Actuation is Thermal Hold, not a cooler sidewalk."
            ),
        }
    )

    for a in plan["assignments"]:
        lines.append(
            {
                "agent": "infra",
                "tool": "hold.assign",
                "text": (
                    f"Send {a['people']} → {a['name']} ({'AC' if a['indoor'] else 'canopy'}). "
                    f"Walk {a['walk_min']:.1f} min. Dose {a['hold_dose']:.0f} vs platform "
                    f"{plan['platform_dose']:.0f} °C·min."
                ),
            }
        )

    lines.append(
        {
            "agent": "infra",
            "tool": "termination",
            "text": (
                f"APPROVED. action=thermal_hold; tcm_refused={not tcm['can_route']}; "
                f"refuges={plan['refuges_used']}; overflow={plan['overflow_on_platform']}; "
                f"dose_saved={plan['dose_saved_total']:.0f} °C·min."
                + (
                    f" body_verdict={verdict['verdict']}; skip_park={verdict['skip_park']}."
                    if verdict
                    else ""
                )
            ),
        }
    )

    payload = {
        "action": "thermal_hold",
        "tcm_refused": not tcm["can_route"],
        "city": "Phoenix, AZ",
        "trap": plan["trap_name"],
        "assignments": [
            {"refuge": a["name"], "people": a["people"], "indoor": a["indoor"]}
            for a in plan["assignments"]
        ],
        "wait_min": wait_min,
        "release_min_before_vehicle": 3,
        "body": verdict,
    }

    return {
        "tcm": tcm,
        "exceedance": ex,
        "plan": plan,
        "lines": lines,
        "payload": payload,
    }

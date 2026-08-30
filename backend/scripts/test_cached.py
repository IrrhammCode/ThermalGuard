#!/usr/bin/env python3
"""Re-run the thesis against cached FortyGuard layers (no API credits)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from ata2.evaluate import render_report
from ata2.layers import tcm_snapshot
from ata2.service import field, hold, now, route, swarm, thesis


def main() -> int:
    f = field()
    result = thesis()
    print(render_report(result))
    print()
    civic = now(33.454, -112.0742)
    lots = now(33.4466, -112.0688)
    print(f"now park  {civic}")
    print(f"now lots  {lots}")
    shade = route("washington-2ndst", "fillmore-1stave")
    hold_route = route("vanburen-central", "vanburen-3rdst")
    print(f"route shade split={shade['paths_split']} Δmean={shade['mean_delta_c']}")
    print(f"route hold  split={hold_route['paths_split']} hold={hold_route['hold']['place'] if hold_route['hold'] else None}")
    (ROOT / "data").mkdir(exist_ok=True)
    (ROOT / "data" / "thesis_hybrid.json").write_text(json.dumps(result, indent=2))
    if not result["ok"]:
        return 1
    if not shade["paths_split"]:
        print("expected shade-park paths to split")
        return 1
    if hold_route["hold"] is None:
        print("expected a hold-zone payload for Van Buren")
        return 1

    tcm = tcm_snapshot()
    plan = hold(crowd=36, wait_min=11)
    debate = swarm(crowd=36, wait_min=11)
    print()
    print(f"tcm spread={tcm['spread_c']} can_route={tcm['can_route']}")
    print(f"hold refuges={plan['refuges_used']} overflow={plan['overflow_on_platform']} "
          f"platform_dose={plan['platform_dose']} mean_hold={plan['mean_hold_dose']}")
    print(f"assignments={[ (a['name'], a['people']) for a in plan['assignments'] ]}")
    print(f"swarm tcm_refused={debate['payload']['tcm_refused']} lines={len(debate['lines'])}")

    if tcm["can_route"]:
        print("TCM should be refused at this scale")
        return 1
    if plan["platform_dose"] < (plan["mean_hold_dose"] or 0) * 1.15:
        print("hold dose should beat platform dwell")
        return 1
    if plan["refuges_used"] < 2:
        print("anti-bottleneck should split the crowd")
        return 1
    if not debate["payload"]["tcm_refused"]:
        print("swarm should refuse TCM routing")
        return 1

    cramps = {
        "ageBand": "18-39",
        "conditions": ["none"],
        "allergies": ["none"],
        "symptoms": ["cramps"],
        "fromId": "vanburen-central",
        "toId": "vanburen-3rdst",
    }
    body_hold = hold(crowd=36, wait_min=11, operator=cramps)
    if any(not a["indoor"] for a in body_hold["assignments"]):
        print("acute symptoms should skip park overflow")
        return 1
    if not body_hold.get("body"):
        print("hold with operator should attach a body verdict")
        return 1
    if body_hold["body"].get("max_platform_min") != 0:
        print("cramps should set max platform dwell to 0")
        return 1
    if not body_hold["body"].get("preferred_refuge"):
        print("body verdict should name a preferred refuge")
        return 1
    if not body_hold["body"].get("if_worse"):
        print("body verdict should say what to do if symptoms worsen")
        return 1

    from fastapi.testclient import TestClient
    from app import app

    client = TestClient(app)
    boot = client.get("/v1/bootstrap").json()
    if not boot["layers"]["verdict"]["refuse_air_routing"]:
        print("bootstrap should refuse TCM")
        return 1
    if len(boot["map_felt"]["tiles"]) < 20:
        print("felt map tiles missing")
        return 1
    if client.get("/v1/map", params={"mode": "tcm"}).json()["legend"]["kind"] != "t2m":
        print("tcm map legend wrong")
        return 1
    if client.get("/v1/refuges").json()["trap_id"] != "vanburen-central":
        print("refuges trap_id wrong")
        return 1

    posted = client.post(
        "/v1/swarm",
        json={"crowd": 36, "wait_min": 11, "operator": cramps},
    ).json()
    if not any(line["agent"] == "body" for line in posted["lines"]):
        print("swarm+operator should emit body lines")
        return 1
    if any(not a["indoor"] for a in posted["payload"]["assignments"]):
        print("swarm+cramps should not assign canopy")
        return 1
    if "REFUSE" not in posted["lines"][0]["text"]:
        print("meteo refuse must stay the first line")
        return 1
    tools = {line["tool"] for line in posted["lines"]}
    if "body.if_worse" not in tools:
        print("swarm should include if_worse for the operator")
        return 1
    if "compare.doses" not in tools:
        print("swarm should compare platform dose vs preferred refuge")
        return 1

    print("\ncached backend tests: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

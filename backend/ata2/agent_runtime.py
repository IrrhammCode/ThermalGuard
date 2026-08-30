"""Groq tool loop: the Body/swarm agent reads FortyGuard cache as tools, then verdicts.

Numbers never come from the model. Tools return the Mac-side cache.
"""

from __future__ import annotations

import json
import os
from typing import Any

import httpx

from ata2.layers import persistence_snapshot, satellite_samples

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "openai/gpt-oss-20b"
MAX_ROUNDS = 6

PLACE = {
    "vanburen-central": "Van Buren / Central",
    "vanburen-3rdst": "Arizona Center",
    "washington-1stave": "CityScape",
    "washington-2ndst": "Convention Center",
    "fillmore-1stave": "Civic Space Park",
    "roosevelt-central": "Roosevelt Row",
}

SAT_TAG = {
    "azcenter": "arizona_center",
    "cityscape": "cityscape",
    "pcc": "convention_center",
    "civic": "civic_space_park",
}

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "heatmap_tcm",
            "description": "FortyGuard 2 m TCM snapshot for downtown Phoenix. Spread decides if air-routing is legal.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "heatmap_exceedance",
            "description": "FortyGuard hours above 38°C over 8 days. Duration layer, not a cool corridor.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "heatmap_persistence",
            "description": "Longest continuous hours >38°C if a persistence cache exists. Returns available=false otherwise.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "satellite_canopy",
            "description": "Satellite land-cover at named downtown samples (park vs AC lobby). Vegetation is not cooler 2 m air.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tag": {
                        "type": "string",
                        "description": "Optional sample tag, e.g. civic_space_park or arizona_center. Empty = all samples.",
                    }
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "hold_options",
            "description": "Thermal Hold catalog: indoor AC vs park, walk minutes, hold temp, dose vs staying on the platform.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_doses",
            "description": "Compare platform °C·min vs one named refuge for this wait.",
            "parameters": {
                "type": "object",
                "properties": {"refuge": {"type": "string", "description": "Refuge name, e.g. Arizona Center"}},
                "required": ["refuge"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "operator_file",
            "description": "This operator's age, conditions, allergies, symptoms, from/to. Not a medical chart.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
]

SCHEMA = {
    "type": "object",
    "properties": {
        "verdict": {"type": "string", "enum": ["ok_with_hold", "indoor_only", "watch"]},
        "ok_on_platform": {"type": "boolean"},
        "ok_if_indoor_hold": {"type": "boolean"},
        "skip_park": {"type": "boolean"},
        "max_platform_min": {"type": "number"},
        "preferred_refuge": {"type": "string"},
        "backup_refuge": {"type": "string"},
        "avoid": {"type": "array", "items": {"type": "string"}},
        "cite_layers": {
            "type": "array",
            "items": {
                "type": "string",
                "enum": [
                    "heatmap.tcm",
                    "heatmap.exceedance",
                    "heatmap.persistence",
                    "satellite.canopy",
                ],
            },
        },
        "meteo_read": {"type": "string"},
        "psych_read": {"type": "string"},
        "body_read": {"type": "string"},
        "infra_read": {"type": "string"},
        "if_worse": {"type": "string"},
        "reason": {"type": "string"},
    },
    "required": [
        "verdict",
        "ok_on_platform",
        "ok_if_indoor_hold",
        "skip_park",
        "max_platform_min",
        "preferred_refuge",
        "backup_refuge",
        "avoid",
        "cite_layers",
        "meteo_read",
        "psych_read",
        "body_read",
        "infra_read",
        "if_worse",
        "reason",
    ],
    "additionalProperties": False,
}

SYSTEM = """You are the ATA² swarm orchestrator for Thermal Hold in downtown Phoenix.

Four hats, one dwell decision:
- meteo: FortyGuard 2 m TCM / exceedance / persistence. If TCM spread < 0.5°C, air-routing is illegal.
- psych: crowd dwell on one shade strip recreates the bottleneck. Split indoor holds.
- body: THIS operator's file. Not a doctor. Symptoms change where they may wait.
- infra: pick the lobby this person walks to. Crowd still splits across AC so one atrium is not the new trap.

You MUST call tools before the verdict. Never invent °C, hours, vegetation %, walk minutes, or dose. If a tool says available=false, do not cite that layer.

Call at least: operator_file, heatmap_tcm, satellite_canopy, hold_options.
Then compare_doses on the indoor refuge you prefer.
gpt-oss cannot call tools in parallel — one tool per turn.

Policy:
- Platform wait is the dose. The walk is a rounding error.
- Civic Space Park vegetation looks greener. That is land cover, not cool air.
- Cramps/kepicut, dizzy, nausea, confusion, stopped sweating → indoor_only, skip_park, max_platform_min=0, ok_on_platform=false.
- Pollen, mold, bees, smoke, u18, 65+, heart, pregnancy, asthma, COPD, diabetes, kidney, hypertension, mobility, heat-sensitive meds → skip_park, indoor preferred.
- Headache/fatigue only → watch, skip_park, max_platform_min=1.
- Healthy 18–64, no symptoms → ok_with_hold, still refuse finishing the wait on the platform; max_platform_min=2; park overflow allowed for the CROWD, not this operator's first choice.
- Dust allergy: indoor still; skip_park because outdoor dust/pollen is worse than vents for this product.

When tools are done, respond with JSON only matching the schema.
meteo_read / psych_read / body_read / infra_read: 1–2 sentences, English, numbers only from tools, no emoji.
if_worse: what to do if cramps/dizziness worsen — indoor door, not park, not platform. End with Not a diagnosis.
reason: the dwell call in one sentence. End with Not a diagnosis.
preferred_refuge / backup_refuge: names from hold_options, indoor if skip_park.
avoid: include the exposed platform; include Civic Space Park when skip_park.
"""


def place_label(node_id: str) -> str:
    return PLACE.get(node_id, node_id)


def indoor_names(plan: dict) -> list[str]:
    opts = plan.get("options") or plan.get("assignments") or []
    return [o["name"] for o in opts if o.get("indoor")]


def execute_tool(name: str, args: dict, facts: dict) -> tuple[str, str]:
    """Return (json_payload, one-line trace)."""
    plan = facts["plan"]
    if name == "heatmap_tcm":
        tcm = facts["tcm"]
        payload = {**tcm, "refuse_air_routing": not tcm.get("can_route")}
        trace = (
            f"heatmap.tcm → {tcm['n_tiles']} tiles, {tcm['min_c']:.2f}–{tcm['max_c']:.2f}°C, "
            f"spread {tcm['spread_c']:.2f}°C, refuse_air_routing={payload['refuse_air_routing']}"
        )
        return json.dumps(payload), trace
    if name == "heatmap_exceedance":
        ex = facts.get("exceedance") or {}
        trace = (
            f"heatmap.exceedance → {ex.get('min')}–{ex.get('max')} {ex.get('units')} >{ex.get('threshold_c')}°C"
        )
        return json.dumps(ex), trace
    if name == "heatmap_persistence":
        pe = persistence_snapshot()
        if not pe:
            return json.dumps({"available": False}), "heatmap.persistence → not in cache"
        trace = f"heatmap.persistence → {pe['min']:.1f}–{pe['max']:.1f} {pe['units']}"
        return json.dumps({**pe, "available": True}), trace
    if name == "satellite_canopy":
        rows = satellite_samples()
        tag = (args.get("tag") or "").strip()
        if tag:
            rows = [r for r in rows if r.get("tag") == tag] or rows
        trace = "satellite.canopy → " + ", ".join(
            f"{r.get('tag')} veg={r.get('veg')}" for r in rows[:4]
        )
        return json.dumps(rows), trace
    if name == "hold_options":
        opts = []
        sat = {s["tag"]: s for s in satellite_samples()}
        catalog = plan.get("options") or plan.get("assignments") or []
        for o in catalog:
            tag = SAT_TAG.get(o.get("id") or "", "")
            cover = sat.get(tag) or {}
            opts.append(
                {
                    "name": o["name"],
                    "indoor": o["indoor"],
                    "kind": o.get("kind"),
                    "walk_min": o.get("walk_min"),
                    "walk_m": o.get("walk_m"),
                    "hold_temp_c": o.get("hold_temp_c"),
                    "hold_dose": o.get("hold_dose"),
                    "saved_dose": o.get("saved_dose"),
                    "capacity": o.get("capacity"),
                    "vegetation": cover.get("veg"),
                    "building": cover.get("building"),
                }
            )
        trap = {
            "trap": plan.get("trap_name"),
            "air_c": plan.get("air_c"),
            "felt_c": plan.get("trap_felt_c"),
            "platform_dose": plan.get("platform_dose"),
            "wait_min": plan.get("wait_min"),
            "crowd": plan.get("crowd"),
            "indoor_c": 24.0,
            "options": opts,
        }
        trace = (
            f"hold.options → platform {plan.get('platform_dose')} °C·min, "
            f"{len(opts)} refuges, wait {plan.get('wait_min')} min"
        )
        return json.dumps(trap), trace
    if name == "compare_doses":
        refuge = args.get("refuge") or ""
        catalog = plan.get("options") or plan.get("assignments") or []
        hit = next((o for o in catalog if o["name"].lower() == str(refuge).lower()), None)
        if not hit:
            return json.dumps({"error": "unknown refuge", "refuge": refuge}), f"compare_doses → unknown {refuge}"
        payload = {
            "refuge": hit["name"],
            "indoor": hit["indoor"],
            "platform_dose": plan.get("platform_dose"),
            "hold_dose": hit.get("hold_dose"),
            "saved_dose": hit.get("saved_dose"),
            "walk_min": hit.get("walk_min"),
            "hold_temp_c": hit.get("hold_temp_c"),
        }
        trace = (
            f"compare_doses → {hit['name']} {hit.get('hold_dose')} vs platform "
            f"{plan.get('platform_dose')} °C·min"
        )
        return json.dumps(payload), trace
    if name == "operator_file":
        op = facts["operator"]
        payload = {
            **op,
            "from_name": place_label(op.get("fromId") or ""),
            "to_name": place_label(op.get("toId") or ""),
            "disclaimer": "Not a diagnosis. Used to refuse the wrong dwell.",
        }
        symptoms = [s for s in (op.get("symptoms") or []) if s != "none"]
        trace = (
            f"operator.file → age {op.get('ageBand')}, "
            f"{place_label(op.get('fromId') or '')} → {place_label(op.get('toId') or '')}"
            + (f", symptoms {', '.join(symptoms)}" if symptoms else ", no acute symptoms")
        )
        return json.dumps(payload), trace
    return json.dumps({"error": f"unknown tool {name}"}), f"{name} → unknown"


def _strip_json(raw: str) -> str:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    return text


def groq_agent(facts: dict) -> tuple[dict | None, list[dict]]:
    """Tool loop. Returns (raw_model_json_or_none, trace lines)."""
    key = (os.getenv("GROQ_API_KEY") or "").strip()
    if not key:
        return None, []
    model = (os.getenv("GROQ_MODEL") or DEFAULT_MODEL).strip()
    op = facts["operator"]
    user = (
        "Decide Thermal Hold for this operator. Call tools. Then JSON verdict.\n"
        + json.dumps(
            {
                "ageBand": op.get("ageBand"),
                "symptoms": op.get("symptoms"),
                "conditions": op.get("conditions"),
                "allergies": op.get("allergies"),
                "from": place_label(op.get("fromId") or ""),
                "to": place_label(op.get("toId") or ""),
            },
            ensure_ascii=True,
        )
    )
    messages: list[dict[str, Any]] = [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": user},
    ]
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    traces: list[dict] = []

    try:
        with httpx.Client(timeout=20.0) as client:
            for _ in range(MAX_ROUNDS):
                payload = {
                    "model": model,
                    "temperature": 0.1,
                    "messages": messages,
                    "tools": TOOLS,
                    "tool_choice": "auto",
                }
                resp = client.post(GROQ_URL, headers=headers, json=payload)
                resp.raise_for_status()
                msg = resp.json()["choices"][0]["message"]
                tool_calls = msg.get("tool_calls") or []
                if tool_calls:
                    messages.append(
                        {
                            "role": "assistant",
                            "content": msg.get("content") or "",
                            "tool_calls": tool_calls,
                        }
                    )
                    for call in tool_calls:
                        fn = call.get("function") or {}
                        name = fn.get("name") or ""
                        try:
                            args = json.loads(fn.get("arguments") or "{}")
                        except json.JSONDecodeError:
                            args = {}
                        result, trace = execute_tool(name, args if isinstance(args, dict) else {}, facts)
                        traces.append(
                            {
                                "agent": "body",
                                "tool": name.replace("_", ".", 1) if "_" in name else name,
                                "text": trace,
                            }
                        )
                        messages.append(
                            {
                                "role": "tool",
                                "tool_call_id": call.get("id"),
                                "name": name,
                                "content": result,
                            }
                        )
                    continue

                content = msg.get("content") or ""
                if content.strip():
                    return json.loads(_strip_json(content)), traces

            force = {
                "model": model,
                "temperature": 0.1,
                "messages": messages
                + [{"role": "user", "content": "Tools are done. Return the JSON verdict only."}],
                "response_format": {
                    "type": "json_schema",
                    "json_schema": {"name": "swarm_verdict", "strict": True, "schema": SCHEMA},
                },
            }
            resp = client.post(GROQ_URL, headers=headers, json=force)
            if resp.status_code >= 400:
                force["response_format"] = {"type": "json_object"}
                resp = client.post(GROQ_URL, headers=headers, json=force)
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            return json.loads(_strip_json(content)), traces
    except Exception:
        return None, traces

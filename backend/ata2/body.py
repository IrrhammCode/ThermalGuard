"""Body / swarm agent: Groq tool loop decides dwell. Numbers stay on FortyGuard cache."""

from __future__ import annotations

import os

from ata2.agent_runtime import groq_agent, indoor_names, place_label
from ata2.layers import persistence_snapshot, satellite_samples

VERDICTS = ("ok_with_hold", "indoor_only", "watch")


def _acute(operator: dict) -> bool:
    return any(s in operator.get("symptoms") or [] for s in ("cramps", "dizzy", "nausea", "confusion", "nosweat"))


def _vulnerable(operator: dict) -> bool:
    age = operator.get("ageBand")
    cond = [c for c in (operator.get("conditions") or []) if c != "none"]
    return age in ("u18", "65+") or any(
        c in cond
        for c in (
            "heart",
            "pregnancy",
            "asthma",
            "diabetes",
            "copd",
            "kidney",
            "hypertension",
            "mobility",
            "meds",
        )
    )


def _allergies(operator: dict) -> list[str]:
    return [a for a in (operator.get("allergies") or []) if a != "none"]


def _symptoms(operator: dict) -> list[str]:
    return [s for s in (operator.get("symptoms") or []) if s != "none"]


def facts_for_operator(operator: dict, tcm: dict, exceedance: dict | None, plan: dict) -> dict:
    return {
        "operator": operator,
        "tcm": tcm,
        "exceedance": exceedance,
        "persistence": persistence_snapshot(),
        "satellite": satellite_samples(),
        "plan": plan,
    }


def _pick_refuges(operator: dict, plan: dict, skip_park: bool) -> tuple[str, str]:
    names = indoor_names(plan) if skip_park else [
        o["name"] for o in (plan.get("options") or plan.get("assignments") or [])
    ]
    indoor = indoor_names(plan)
    to_name = place_label(operator.get("toId") or "")
    preferred = to_name if to_name in (indoor if skip_park else names) else (indoor[0] if indoor else "Arizona Center")
    backup = next((n for n in indoor if n != preferred), indoor[0] if indoor else "CityScape")
    return preferred, backup


def fallback_verdict(operator: dict, plan: dict | None = None, tcm: dict | None = None) -> dict:
    plan = plan or {}
    tcm = tcm or {}
    symptoms = _symptoms(operator)
    acute = _acute(operator)
    vul = _vulnerable(operator)
    al = _allergies(operator)
    skip_park = acute or vul or any(a in al for a in ("pollen", "dust", "mold", "bees", "smoke"))
    preferred, backup = _pick_refuges(operator, plan, skip_park)
    from_n = place_label(operator.get("fromId") or "")
    to_n = place_label(operator.get("toId") or "")
    trap = plan.get("trap_name") or "Van Buren / Central"
    felt = plan.get("trap_felt_c")
    dose = plan.get("platform_dose")
    spread = tcm.get("spread_c")
    crowd = plan.get("crowd")
    wait = plan.get("wait_min")

    if acute:
        verdict = "indoor_only"
        max_platform = 0
        reason = (
            f"Heat signs on file while waiting at {trap}. Refuse platform and park. "
            f"Walk this operator into {preferred}. Not a diagnosis."
        )
        if_worse = (
            "If cramps, dizziness, or nausea worsen: stop on the street, enter the nearest indoor AC, "
            "do not finish the wait under park canopy. Not a diagnosis."
        )
        body_read = (
            f"Operator {from_n} → {to_n}, age {operator.get('ageBand')}, symptoms {', '.join(symptoms)}. "
            "Acute heat signs mean this person is not park overflow. Not a diagnosis."
        )
    elif skip_park:
        verdict = "watch" if symptoms else "indoor_only"
        max_platform = 1
        reason = (
            f"Higher heat sensitivity on file. Prefer {preferred}; satellite green at the park is not cool air. "
            "Not a diagnosis."
        )
        if_worse = (
            "If they go lightheaded: indoor lobby, sit, do not pin to the last shade strip. Not a diagnosis."
        )
        body_read = (
            f"Age {operator.get('ageBand')}, conditions/allergies on file. "
            "Treat as indoor-first even if Felt looks greener at Civic Space Park. Not a diagnosis."
        )
    else:
        verdict = "ok_with_hold"
        max_platform = 2
        reason = (
            f"No acute signs. This operator can take the indoor split at {preferred}. "
            "Still refuse finishing the wait on the platform. Not a diagnosis."
        )
        if_worse = (
            "If they start to cramp or go dizzy: abort platform dwell, indoor AC only. Not a diagnosis."
        )
        body_read = (
            f"Operator file {from_n} → {to_n} has no acute heat signs. "
            "They are still in a ~40°C bath if they stay on the platform. Not a diagnosis."
        )

    avoid = [trap, "exposed platform"]
    if skip_park:
        avoid.append("Civic Space Park")

    meteo_read = (
        f"TCM spread {spread}°C on this snapshot. Air is lethal and spatially flat. REFUSE air-routing."
        if spread is not None
        else "2 m air is a thermal bath. REFUSE air-routing."
    )
    psych_read = (
        f"{crowd} people, {wait} min dwell at {trap}"
        + (f" felt {felt}°C." if felt is not None else ".")
        + " Do not pin this operator to one shade strip with the crowd."
    )
    infra_read = (
        f"Send this operator to {preferred} (backup {backup}). "
        "Split the rest of the crowd across indoor AC so one lobby is not the new trap."
        + (f" Platform dose {dose} °C·min if they stay put." if dose is not None else "")
    )

    return {
        "verdict": verdict,
        "ok_on_platform": False,
        "ok_if_indoor_hold": True,
        "skip_park": skip_park,
        "max_platform_min": max_platform,
        "preferred_refuge": preferred,
        "backup_refuge": backup,
        "avoid": avoid,
        "cite_layers": ["heatmap.tcm", "satellite.canopy"] if skip_park else ["heatmap.tcm", "heatmap.exceedance"],
        "meteo_read": meteo_read,
        "psych_read": psych_read,
        "body_read": body_read,
        "infra_read": infra_read,
        "if_worse": if_worse,
        "reason": reason,
        "source": "rules",
        "model": None,
        "trace": [],
    }


def _clamp_verdict(data: dict, operator: dict, plan: dict, source: str, model: str | None, trace: list) -> dict:
    fb = fallback_verdict(operator, plan, None)
    indoor = indoor_names(plan)
    verdict = data.get("verdict") if data.get("verdict") in VERDICTS else fb["verdict"]
    skip_park = bool(data.get("skip_park", fb["skip_park"]))
    preferred = str(data.get("preferred_refuge") or fb["preferred_refuge"])
    backup = str(data.get("backup_refuge") or fb["backup_refuge"])
    if skip_park and indoor:
        if preferred not in indoor:
            preferred = indoor[0]
        if backup not in indoor or backup == preferred:
            backup = next((n for n in indoor if n != preferred), indoor[0])
    try:
        max_platform = int(round(float(data.get("max_platform_min", fb["max_platform_min"]))))
    except (TypeError, ValueError):
        max_platform = fb["max_platform_min"]
    max_platform = max(0, min(3, max_platform))
    if _acute(operator):
        skip_park = True
        max_platform = 0
        verdict = "indoor_only"

    def _sent(key: str, limit: int = 420) -> str:
        text = str(data.get(key) or fb[key]).strip()
        if key in ("reason", "if_worse", "body_read") and "diagnosis" not in text.lower():
            text = text.rstrip(".") + ". Not a diagnosis."
        return text[:limit]

    layers = [x for x in (data.get("cite_layers") or fb["cite_layers"]) if isinstance(x, str)]
    avoid = [str(x) for x in (data.get("avoid") or fb["avoid"]) if str(x).strip()]
    return {
        "verdict": verdict,
        "ok_on_platform": bool(data.get("ok_on_platform", False)),
        "ok_if_indoor_hold": bool(data.get("ok_if_indoor_hold", True)),
        "skip_park": skip_park,
        "max_platform_min": max_platform,
        "preferred_refuge": preferred,
        "backup_refuge": backup,
        "avoid": avoid[:6] or fb["avoid"],
        "cite_layers": (layers or fb["cite_layers"])[:4],
        "meteo_read": _sent("meteo_read"),
        "psych_read": _sent("psych_read"),
        "body_read": _sent("body_read"),
        "infra_read": _sent("infra_read"),
        "if_worse": _sent("if_worse"),
        "reason": _sent("reason"),
        "source": source,
        "model": model,
        "trace": trace,
    }


def groq_verdict(operator: dict, facts: dict) -> dict:
    raw, trace = groq_agent(facts)
    if raw is None:
        fb = fallback_verdict(operator, facts.get("plan"), facts.get("tcm"))
        if trace:
            fb["trace"] = trace
        return fb
    model = (os.getenv("GROQ_MODEL") or "openai/gpt-oss-20b").strip()
    return _clamp_verdict(raw, operator, facts["plan"], "groq", model, trace)


def apply_skip_park(plan: dict) -> dict:
    indoor = [dict(a) for a in plan.get("assignments") or [] if a.get("indoor")]
    outdoor_people = sum(int(a["people"]) for a in plan.get("assignments") or [] if not a.get("indoor"))
    remaining = outdoor_people
    for a in indoor:
        room = max(0, int(a.get("capacity") or 0) - int(a["people"]))
        take = min(remaining, room)
        a["people"] = int(a["people"]) + take
        remaining -= take
    assigned = sum(int(a["people"]) for a in indoor)
    crowd = int(plan.get("crowd") or 0)
    overflow = crowd - assigned
    mean = None
    saved = 0.0
    if assigned:
        mean = round(sum(a["hold_dose"] * a["people"] for a in indoor) / assigned, 1)
        saved = round(sum(a["saved_dose"] * a["people"] for a in indoor), 1)
    return {
        **plan,
        "assignments": indoor,
        "assigned": assigned,
        "overflow_on_platform": overflow,
        "mean_hold_dose": mean,
        "dose_saved_total": saved,
        "refuges_used": len(indoor),
        "anti_bottleneck": len(indoor) >= 2 and crowd >= 20,
    }


def _refuge_by_name(plan: dict, name: str) -> dict | None:
    for key in ("options", "assignments"):
        for row in plan.get(key) or []:
            if row.get("name") == name:
                return row
    return None


def body_lines(operator: dict, verdict: dict, tcm: dict, exceedance: dict | None, plan: dict) -> list[dict]:
    from_n = place_label(operator.get("fromId") or "")
    to_n = place_label(operator.get("toId") or "")
    symptoms = _symptoms(operator)
    source = "Groq" if verdict.get("source") == "groq" else "Rules fallback"
    model = verdict.get("model") or "local"
    preferred = verdict.get("preferred_refuge") or "Arizona Center"
    hit = _refuge_by_name(plan, preferred)

    lines: list[dict] = []
    for tr in verdict.get("trace") or []:
        lines.append(
            {
                "agent": tr.get("agent") or "body",
                "tool": tr.get("tool") or "agent.tool",
                "text": tr.get("text") or "",
            }
        )

    lines.append(
        {
            "agent": "body",
            "tool": "body.profile",
            "text": (
                f"Operator file: age {operator.get('ageBand')}. {from_n} → {to_n}. "
                + (f"Symptoms: {', '.join(symptoms)}. " if symptoms else "No acute symptoms logged. ")
                + "Not a diagnosis."
            ),
        }
    )
    if verdict.get("meteo_read"):
        lines.append({"agent": "meteo", "tool": "groq.meteo", "text": verdict["meteo_read"]})
    if verdict.get("psych_read"):
        lines.append({"agent": "psych", "tool": "groq.psych", "text": verdict["psych_read"]})
    lines.append(
        {
            "agent": "body",
            "tool": "groq.verdict" if verdict.get("source") == "groq" else "body.decide",
            "text": (
                f"{source} ({model}): {verdict['verdict'].replace('_', ' ')}. "
                f"OK on platform={str(verdict['ok_on_platform']).lower()}. "
                f"OK if indoor hold={str(verdict['ok_if_indoor_hold']).lower()}. "
                f"Max platform dwell {verdict.get('max_platform_min', 0)} min. "
                f"{verdict['reason']}"
            ),
        }
    )
    if verdict.get("body_read"):
        lines.append({"agent": "body", "tool": "groq.body", "text": verdict["body_read"]})
    if hit:
        lines.append(
            {
                "agent": "body",
                "tool": "compare.doses",
                "text": (
                    f"This operator → {preferred}"
                    + (f" ({'AC' if hit.get('indoor') else 'canopy'}), walk {hit.get('walk_min')} min, "
                       f"hold {hit.get('hold_temp_c')}°C, dose {hit.get('hold_dose')} vs platform "
                       f"{plan.get('platform_dose')} °C·min."
                       if hit.get("hold_dose") is not None
                       else ".")
                ),
            }
        )
    if verdict.get("if_worse"):
        lines.append({"agent": "body", "tool": "body.if_worse", "text": verdict["if_worse"]})
    if "satellite.canopy" in set(verdict.get("cite_layers") or []):
        samples = {s["tag"]: s for s in satellite_samples()}
        park = samples.get("civic_space_park") or {}
        ac = samples.get("arizona_center") or {}
        bits = ["Satellite canopy is the place layer, not cooler 2 m air."]
        if park.get("veg") is not None:
            bits.append(f"Civic Space Park vegetation {float(park['veg']) * 100:.1f}%.")
        if ac.get("building") is not None:
            bits.append(f"Arizona Center building {float(ac['building']):.1f}%.")
        if verdict.get("skip_park"):
            bits.append("Refuse park overflow for this operator.")
        lines.append({"agent": "body", "tool": "satellite.canopy", "text": " ".join(bits)})
    if verdict.get("infra_read"):
        lines.append({"agent": "infra", "tool": "groq.infra", "text": verdict["infra_read"]})
    avoid = verdict.get("avoid") or []
    lines.append(
        {
            "agent": "infra",
            "tool": "body.assign",
            "text": (
                f"Body → infra: this person to {preferred}"
                + (f", backup {verdict.get('backup_refuge')}." if verdict.get("backup_refuge") else ".")
                + (" Refuse park overflow. " if verdict.get("skip_park") else " ")
                + (f"Avoid: {', '.join(avoid)}. " if avoid else "")
                + f"Crowd still splits so one lobby is not the new trap."
            ),
        }
    )
    return lines


def decide(
    operator: dict | None,
    tcm: dict,
    exceedance: dict | None,
    plan: dict,
    *,
    use_groq: bool = True,
) -> tuple[dict, dict | None, list[dict]]:
    if not operator:
        return plan, None, []
    facts = facts_for_operator(operator, tcm, exceedance, plan)
    verdict = groq_verdict(operator, facts) if use_groq else fallback_verdict(operator, plan, tcm)
    next_plan = apply_skip_park(plan) if verdict.get("skip_park") else plan
    next_plan = {**next_plan, "body": verdict}
    lines = body_lines(operator, verdict, tcm, exceedance, next_plan)
    return next_plan, verdict, lines

from __future__ import annotations

from pathlib import Path
from typing import Literal, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).resolve().parent / ".env")

from ata2.phoenix import NODES, TRAP_NODE_ID
from ata2.service import (
    bootstrap,
    config,
    hold,
    layers,
    map_overlay,
    now,
    refuges,
    route,
    swarm,
    thesis,
)

DEMO_LAT, DEMO_LON = 33.454, -112.0742

app = FastAPI(
    title="ThermalGuard Thermal Hold",
    version="0.3.0",
    description="FortyGuard 2 m severity + satellite canopy. Agents refuse flat TCM, then split dwell.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class RouteIn(BaseModel):
    from_id: str
    to_id: str


class OperatorIn(BaseModel):
    ageBand: str
    conditions: list[str] = []
    allergies: list[str] = []
    symptoms: list[str] = []
    fromId: str
    toId: str


class HoldIn(BaseModel):
    trap_id: str = TRAP_NODE_ID
    wait_min: float = Field(11, ge=1, le=60)
    crowd: int = Field(36, ge=1, le=400)
    operator: Optional[OperatorIn] = None


def _node(node_id: str) -> str:
    if node_id not in NODES:
        raise HTTPException(400, f"unknown node: {node_id}")
    return node_id


@app.get("/health")
def get_health():
    return config() | {"ok": True}


@app.get("/v1/config")
def get_config():
    return config()


@app.get("/v1/bootstrap")
def get_bootstrap(
    crowd: int = Query(36, ge=1, le=400),
    wait_min: float = Query(11, ge=1, le=60),
):
    return bootstrap(crowd=crowd, wait_min=wait_min)


@app.get("/v1/now")
def get_now(lat: float = DEMO_LAT, lon: float = DEMO_LON):
    return now(lat, lon)


@app.get("/v1/layers")
def get_layers():
    return layers()


@app.get("/v1/map")
def get_map(mode: Literal["felt", "tcm"] = "felt"):
    return map_overlay(mode)


@app.get("/v1/refuges")
def get_refuges():
    return refuges()


@app.get("/v1/trips")
def get_trips():
    from ata2.phoenix import SAMPLES, TRIPS

    return {
        "trips": [
            {
                "id": t["id"],
                "label": t["label"],
                "from_id": t["from_id"],
                "to_id": t["to_id"],
                "hold": bool(t.get("hold")),
            }
            for t in TRIPS
        ],
        "samples": SAMPLES,
    }


@app.get("/v1/route")
def get_route(from_id: str, to_id: str):
    try:
        return route(_node(from_id), _node(to_id))
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.post("/v1/route")
def post_route(body: RouteIn):
    try:
        return route(_node(body.from_id), _node(body.to_id))
    except RuntimeError as exc:
        raise HTTPException(400, str(exc)) from exc


@app.get("/v1/hold")
def get_hold(
    trap_id: str = TRAP_NODE_ID,
    wait_min: float = Query(11, ge=1, le=60),
    crowd: int = Query(36, ge=1, le=400),
):
    return hold(trap_id=_node(trap_id), wait_min=wait_min, crowd=crowd)


@app.post("/v1/hold")
def post_hold(body: HoldIn):
    op = body.operator.model_dump() if body.operator else None
    return hold(trap_id=_node(body.trap_id), wait_min=body.wait_min, crowd=body.crowd, operator=op)


@app.get("/v1/swarm")
def get_swarm(
    trap_id: str = TRAP_NODE_ID,
    wait_min: float = Query(11, ge=1, le=60),
    crowd: int = Query(36, ge=1, le=400),
):
    return swarm(trap_id=_node(trap_id), wait_min=wait_min, crowd=crowd)


@app.post("/v1/swarm")
def post_swarm(body: HoldIn):
    op = body.operator.model_dump() if body.operator else None
    return swarm(trap_id=_node(body.trap_id), wait_min=body.wait_min, crowd=body.crowd, operator=op)


@app.get("/v1/thesis")
def get_thesis():
    return thesis()

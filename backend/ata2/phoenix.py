"""Downtown Phoenix AOI, street grid, and named sample points."""

from __future__ import annotations

# ~1.6 km² — well under the Basic-tier 10 mi² heatmap cap.
BOUNDS = {
    "south": 33.4462,
    "north": 33.4599,
    "west": -112.0796,
    "east": -112.0684,
}

STUDY_DATE = "2024-07-15"
STUDY_HOUR = "14:00"
GRANULARITY_M = 60

AVENUES = [
    ("3rdave", "3rd Ave", -112.07835),
    ("2ndave", "2nd Ave", -112.07685),
    ("1stave", "1st Ave", -112.0754),
    ("central", "Central Ave", -112.074),
    ("1stst", "1st St", -112.07255),
    ("2ndst", "2nd St", -112.0711),
    ("3rdst", "3rd St", -112.06965),
]

STREETS = [
    ("jefferson", "Jefferson", 33.44705),
    ("washington", "Washington", 33.4484),
    ("adams", "Adams", 33.4497),
    ("monroe", "Monroe", 33.451),
    ("vanburen", "Van Buren", 33.45225),
    ("fillmore", "Fillmore", 33.45365),
    ("mckinley", "McKinley", 33.45505),
    ("portland", "Portland", 33.4565),
    ("roosevelt", "Roosevelt", 33.45875),
]


def nid(street_id: str, ave_id: str) -> str:
    return f"{street_id}-{ave_id}"


def build_nodes() -> dict[str, dict]:
    nodes: dict[str, dict] = {}
    for sid, sname, lat in STREETS:
        for aid, aname, lon in AVENUES:
            nodes[nid(sid, aid)] = {
                "id": nid(sid, aid),
                "lat": lat,
                "lon": lon,
                "street": sname,
                "avenue": aname,
            }
    return nodes


def build_adjacency(nodes: dict[str, dict]) -> dict[str, list[str]]:
    adj: dict[str, list[str]] = {k: [] for k in nodes}
    for s, (sid, _, _) in enumerate(STREETS):
        for a, (aid, _, _) in enumerate(AVENUES):
            here = nid(sid, aid)
            if s > 0:
                adj[here].append(nid(STREETS[s - 1][0], aid))
            if s < len(STREETS) - 1:
                adj[here].append(nid(STREETS[s + 1][0], aid))
            if a > 0:
                adj[here].append(nid(sid, AVENUES[a - 1][0]))
            if a < len(AVENUES) - 1:
                adj[here].append(nid(sid, AVENUES[a + 1][0]))
    return adj


NODES = build_nodes()
ADJACENCY = build_adjacency(NODES)

# Named points used to test the "hidden 2m heat trap" claim.
SAMPLES = {
    "civic_space_park": {
        "name": "Civic Space Park (canopy)",
        "lat": 33.454,
        "lon": -112.0742,
        "expect": "cool",
    },
    "vanburen_central": {
        "name": "Van Buren / Central Station (exposed platform)",
        "lat": 33.45225,
        "lon": -112.074,
        "expect": "hot",
    },
    "chase_lots": {
        "name": "Chase Field parking (asphalt)",
        "lat": 33.4466,
        "lon": -112.0688,
        "expect": "hot",
    },
    "arizona_center": {
        "name": "Arizona Center (plaza / AC edge)",
        "lat": 33.4528,
        "lon": -112.0696,
        "expect": "cool",
    },
    "convention_center": {
        "name": "Phoenix Convention Center",
        "lat": 33.4485,
        "lon": -112.0711,
        "expect": "mixed",
    },
}

TRIPS = [
    {
        "id": "shade-park",
        "label": "Convention Center → Civic Space Park",
        "from_id": "washington-2ndst",
        "to_id": "fillmore-1stave",
    },
    {
        "id": "hold-zone",
        "label": "Van Buren Station → Arizona Center",
        "from_id": "vanburen-central",
        "to_id": "vanburen-3rdst",
        "hold": True,
    },
    {
        "id": "roosevelt",
        "label": "CityScape → Roosevelt Row",
        "from_id": "washington-1stave",
        "to_id": "roosevelt-central",
    },
]

REFUGES_HOLD = {
    "vanburen-central": {
        "place": "Arizona Center",
        "node_id": "vanburen-3rdst",
        "reason": "2 m air is ~40°C with ~108 hours/week above 38°C. Hold indoors; do not dwell on the exposed platform.",
    }
}

# Indoor / canopy refuges used for Thermal Hold + anti-bottleneck split.
REFUGES = [
    {
        "id": "azcenter",
        "name": "Arizona Center",
        "kind": "ac",
        "indoor": True,
        "lat": 33.4528,
        "lon": -112.0696,
        "node_id": "vanburen-3rdst",
        "capacity": 64,
    },
    {
        "id": "cityscape",
        "name": "CityScape",
        "kind": "ac",
        "indoor": True,
        "lat": 33.4476,
        "lon": -112.0739,
        "node_id": "washington-1stave",
        "capacity": 48,
    },
    {
        "id": "pcc",
        "name": "Phoenix Convention Center",
        "kind": "ac",
        "indoor": True,
        "lat": 33.4485,
        "lon": -112.0711,
        "node_id": "washington-2ndst",
        "capacity": 90,
    },
    {
        "id": "civic",
        "name": "Civic Space Park",
        "kind": "park",
        "indoor": False,
        "lat": 33.454,
        "lon": -112.0742,
        "node_id": "fillmore-1stave",
        "capacity": 18,
    },
]

TRAP_NODE_ID = "vanburen-central"
INDOOR_C = 24.0
TCM_ROUTE_MIN_SPREAD_C = 0.5


def phoenix_aoi() -> dict:
    w, e, s, n = BOUNDS["west"], BOUNDS["east"], BOUNDS["south"], BOUNDS["north"]
    ring = [[w, s], [e, s], [e, n], [w, n], [w, s]]
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"name": "Downtown Phoenix ThermalGuard demo"},
                "geometry": {"type": "Polygon", "coordinates": [ring]},
            }
        ],
    }

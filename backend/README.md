# ATA² backend

Python service for ATA² Thermal Hold — FortyGuard 2 m severity plus satellite canopy, with a layer-arbiter swarm.

## What live data showed (Phoenix, 15 Jul 2024 14:00)

| Layer | Result |
|---|---|
| 2 m TCM snapshot, downtown, 60 m, 350 tiles | **39.62–39.76°C**. Extreme heat, but spatially flat (0.14°C). Cool-routing on air alone **fails**. |
| 2 m TCM, ~8 mi² downtown–Encanto | Still flat (0.26°C). |
| Exceedance hours >38°C, 8 days | **107.9–109.1 h**. Weak duration gradient (north cooler). Not enough to divert a 12-minute walk. |
| Satellite land cover | Civic Space Park **25.7% veg**; Convention Center **0%**; Chase lots **0.8% tree**. This is the spatial signal. |

**Working product:** Thermal Hold. 2 m air is the severity layer (uniform ~40°C). Satellite canopy is the place layer. Agents refuse TCM routing, then split dwell across indoor holds so one shade strip does not become the new bottleneck.

## API

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

- `GET /health` · `GET /v1/config`
- `GET /v1/bootstrap?crowd=36&wait_min=11`
- `GET /v1/now?lat=33.454&lon=-112.0742`
- `GET /v1/layers`
- `GET /v1/map?mode=felt|tcm`
- `GET /v1/refuges`
- `GET /v1/trips`
- `GET /v1/route?from_id=washington-2ndst&to_id=fillmore-1stave`
- `GET /v1/hold?crowd=36&wait_min=11`
- `POST /v1/hold` · `{ crowd, wait_min, operator? }` — operator file applies indoor-only rules (no Groq; fast)
- `GET /v1/swarm?crowd=36&wait_min=11`
- `POST /v1/swarm` · `{ crowd, wait_min, operator? }` — Groq Body agent (or rules fallback) + FortyGuard cache

**Groq:** set `GROQ_API_KEY` in `backend/.env` (free key at https://console.groq.com/keys). Model default `openai/gpt-oss-20b`. Empty key → deterministic body rules so the demo still runs. Groq decides dwell policy (`ok_with_hold` / `indoor_only` / `watch`) from the operator file + cached TCM / exceedance / satellite. It does **not** invent FortyGuard numbers. Live heatmap/env_params/street_view stay off the request path (credits + minutes).
- `GET /v1/thesis`
- OpenAPI: `/docs`

Frontend spec for another agent: [`../FRONTEND_PROMPT.md`](../FRONTEND_PROMPT.md)

## Run tests (no API credits)

```bash
cd backend
source .venv/bin/activate
python scripts/test_cached.py
```

## Live FortyGuard fetch (uses credits)

```bash
python scripts/run_eval.py          # TCM hour + daily max
python scripts/run_eval_layers.py   # exceedance + metro AOI + satellite
python scripts/run_eval_hybrid.py   # hybrid field
```


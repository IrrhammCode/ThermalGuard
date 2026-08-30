# FRONTEND PROMPT — ATA² Thermal Hold

You are a coding agent. Your job is to **rebuild the Expo iPhone UI** in this repo so a FortyGuard Hackathon judge can demo the product in 90 seconds. Backend is already proven. Do **not** invent a new product. Do **not** change Python under `backend/` unless the API is down and you must restart it.

Copy this entire file into a new chat. Treat it as the spec of record.

---

## 0. How to use this file

1. Read **§1 Concept** before writing UI. If you skip this, you will ship a generic cool-route app and lose.
2. Talk to the live API. Open `http://192.168.100.13:8000/docs` (or `EXPO_PUBLIC_API_URL` + `/docs`). Field names below match the server. If a field is missing, the API is the source of truth — do not invent a replacement number.
3. Replace the current sketch UI (`app/`, `lib/`, `components/` that screens import). Keep Expo Router + dark theme scaffolding.
4. UI copy for judges is **English**. Comments in code may be English. Do not put Indonesian in the chrome.

Human note (Bahasa): backend sudah membuktikan 2 m air di downtown Phoenix hampir rata. Produknya **bukan** “jalur lebih sejuk 4°C”. Produknya **Thermal Hold** — jangan nunggu di matahari, pecah kerumunan ke beberapa AC.

---

## 1. Concept — why this app exists

### 1.1 The hackathon trap

FortyGuard’s own example product is a **cool route planner** on a 2 m air-temperature heatmap (TCM). Almost every team will build that.

On **live** Phoenix data (15 Jul 2024, 14:00, downtown ~1.6 km², 60 m tiles, 350 cells) that product **fails**:

| Layer | What we measured | What it means |
|---|---|---|
| TCM 2 m air | **39.62–39.76°C**, spread **0.14°C** | Extreme heat, spatially **flat**. A “cooler sidewalk” does not exist on this layer. |
| Same TCM on a larger AOI (~8 mi²) | spread still ~0.26°C | Not a downtown-only artifact. |
| Exceedance hours >38°C (8 days) | **107.9–109.1 h**, spread ~1.2 h | Duration is high **everywhere**. Weak N–S gradient. Not enough to divert a 12-minute walk. |
| Satellite land cover | Civic Space Park **25.7% veg**; Convention Center **0%**; Chase lots **0.8% tree** | **This** is the spatial signal. Shade/canopy, not 2 m air. |

**Wrong analysis layer → confident wrong answer.** If you route pedestrians on TCM, the map looks scientific and the path is theater. Walk Δmean on the hybrid field is only **0.03–0.17°C**. Do not celebrate that as a win.

### 1.2 The product (1st-place story)

ATA² does three things, in this order:

1. **Refuse the wrong layer.** TCM 2 m is the **severity** layer (it is ~40°C and lethal). It is **not** the place layer. Badge: `TCM REFUSED`. Threshold in backend: spread must be ≥ **0.5°C** to allow air-routing (`TCM_ROUTE_MIN_SPREAD_C`). Phoenix snapshot is 0.14°C → refuse.
2. **Show the right layer.** Felt temperature = uniform 2 m air + satellite canopy. Parks and plazas appear as cooler pockets (~1.7°C spatial span). This is a **map for understanding**, not a claim that walking 12 minutes through the park saves you.
3. **Actuate Thermal Hold.** People are not dying from the 12-minute walk. They are dying from **dwell** on an exposed transit platform. Move the wait indoors, and **split** the crowd across more than one AC so one shade strip does not become the new bottleneck.

One-liner (put this in the app chrome, e.g. header or Hold empty-state):

> ATA² does not cool the street. It refuses the wrong map, then moves dwell off the sun.

### 1.3 Demo scenario (canonical numbers)

These numbers come from the API. **Do not hardcode them as source of truth.** They are what a correct UI should display after `GET /v1/bootstrap` / `/v1/hold` / `/v1/swarm` with defaults `crowd=36`, `wait_min=11`.

- City: **Phoenix, AZ**. Study snapshot: **2024-07-15 14:00**. FortyGuard heatmap API is **US-only** — never mention Singapore.
- Trap: Valley Metro platform **Van Buren / Central** (`trap_id = vanburen-central`). Exposed. Felt ~45.6°C.
- Crowd: **36** people. Vehicle in **11** minutes.
- If they wait on the platform: dose ≈ **502 °C·min** per person (`platform_dose = wait_min × trap_felt_c`).
- Thermal Hold splits them: **19 → Arizona Center** (indoor 24°C), **17 → CityScape** (indoor 24°C). Mean hold dose ≈ **397 °C·min**. Crowd saved ≈ **3782 °C·min**.
- Release ping: **3 minutes** before the vehicle (`payload.release_min_before_vehicle`).
- Civic Space Park is a **park**, not the hero destination. Dumping 36 people onto one canopy recreates thermal bottlenecking. Indoor first; park is overflow/last.

### 1.4 What “dose” means

Dose is **°C·min** = minutes × temperature. It is a simple exposure integral, not a medical UTCI. Use it as the unit of the Hold tab.

```
platform_dose     = wait_min × trap_felt_c
hold_dose         = (walk_min × walk_mean_felt) + (remaining_min × hold_temp)
saved_dose        = platform_dose − hold_dose          # per person
dose_saved_total  = Σ (saved_dose × people)            # crowd
mean_hold_dose    = Σ (hold_dose × people) / assigned
```

Indoor `hold_temp` is **24°C** (`INDOOR_C`). Outdoor park hold uses felt at the park. Walk uses the shortest path (2 m air along it is almost uniform, so “cool walk” vs “fast walk” to a refuge is not the story).

Anti-bottleneck: backend will not dump the whole crowd on the first AC. Soft cap ≈ **55% of crowd** (min 8). That is why 36 people become 19 + 17, not 36 + 0.

### 1.5 Felt temperature (do not reimplement)

Backend already computes this. UI only **displays** `felt` / `air_c` / `vegetation` from the API.

```
felt_c = air_c + 7 × (1 − vegetation_fraction)
```

- `air_c` ≈ 39.69°C, nearly constant across downtown.
- `vegetation_fraction` is IDW from satellite land-cover samples (tree/plant/grass vs road/building/parking).
- Civic Space Park veg 0.257 → felt ≈ 39.69 + 7×0.743 ≈ **44.9°C**.
- Chase lots veg 0.008 → felt ≈ **46.6°C**.
- The ~1.7°C gap is the map contrast. It is **not** “the park is comfortable.” Both are brutal. Indoor 24°C is the intervention.

### 1.6 Swarm is a layer arbiter, not a chatbot

`GET /v1/swarm` returns `lines[]` already written from **real tools** (`heatmap.tcm`, `heatmap.exceedance`, `crowd.dwell`, `satellite.canopy`, `hold.assign`, `termination`). The meteorological agent **must** say `REFUSE air-routing` when TCM spread < 0.5°C.

Do **not**:

- Script a fake multi-agent debate in the client.
- Call an LLM.
- Rewrite line text.
- Replay a local transcript. Replay = refetch `/v1/swarm`.

Animate reveal (~800 ms per line) so the judge can read. Show `agent` + `tool` + `text`.

---

## 2. What NOT to build

| Do not | Why |
|---|---|
| Hero “cool sidewalk is 4°C nicer” | Walk Δmean is 0.03–0.17°C. Hold is the win. |
| Singapore, traffic lights, IoT signs, moth-effect lighting, n8n, Semantic Kernel as substance | Out of scope / not demoable / API is US-only. |
| Google Maps / Google API keys | Apple Maps on iOS. |
| Invented live GPS heat if the phone is not in downtown Phoenix | Pin to `config.demo_point` (Civic Space Park) and say so. |
| Web as a target | Native iOS / Expo Go only. |
| Recompute felt, routing, or hold in TypeScript | That is the backend. Old `lib/phoenix.ts` gauss field is a lie — stop importing it from screens. |
| Mock / cached fake FortyGuard numbers when the API is down | Show an error with the URL. Never fake data. |
| Auth, onboarding, settings graveyard, extra tabs | Three tabs. No login. |
| Emoji in chrome, rainbow gradients, Inter | Dark native iOS. SF Pro via system font. |

---

## 3. Repo, runtime, constraints

```
Repo:     /Users/irham/Documents/code/ata2
Expo:     SDK 57, already scaffolded, Expo Router
Device:   iPhone 16 + Expo Go (same Wi-Fi as the Mac)
Backend:  http://192.168.100.13:8000
OpenAPI:  http://192.168.100.13:8000/docs
Override: EXPO_PUBLIC_API_URL
```

LAN IP **changes**. If fetch fails, the error UI must show the URL you tried. User can set `EXPO_PUBLIC_API_URL`. Do not switch to mocks.

Start backend if needed:

```bash
cd /Users/irham/Documents/code/ata2/backend
source .venv/bin/activate
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Confirm `GET /health` and `GET /v1/bootstrap` before polishing UI.

**Cleartext HTTP** to LAN is required for Expo Go. iPhone and Mac must share Wi-Fi. Do not “fix” this by embedding data.

**Maps isolation:** `react-native-maps` **crashes web/SSR** (`codegenNativeComponent`). Keep it in `components/PhoenixMap.native.tsx` only. `components/PhoenixMap.tsx` is a non-maps fallback (“Open on iPhone”). Never import `react-native-maps` from a file Metro will load on web.

**Secrets:** `FORTYGUARD_API_KEY` lives in `backend/.env` (gitignored). Frontend never needs it. Do not print, log, or commit it. `EXPO_PUBLIC_API_URL` is not a secret.

**TypeScript:** strict. `lib/api.ts` = single `apiGet<T>(path)` with ~8s timeout, throw on `!ok` (include status + body message if present).

---

## 4. Existing sketch (replace, don’t decorate)

Current tabs are labeled Route / Hold / Swarm. The Route tab still thinks it is a cool-corridor app. `lib/phoenix.ts` still has a **synthetic gaussian heat field**. `README.md` still describes cool-routing. Ignore those as product truth.

You may replace screens wholesale. You **may** keep:

- `app/_layout.tsx` dark root
- `app/(tabs)/_layout.tsx` tab shell (rename first tab **Map**, keep Hold + Swarm)
- `constants/theme.ts` tokens if they match §7
- `components/PhoenixMap.native.tsx` pattern (rewrite props to API tiles)
- `lib/api.ts` helper (upgrade types + timeout + error text)

Delete or stop importing: synthetic `feltAt` / gauss in `lib/phoenix.ts`, client-side A* in `lib/routing.ts` if screens still use it, scripted swarm copy in `lib/agents.ts`.

Update `app.json` location permission string to match the product (hold / demo pin), not “steer you through cooler Phoenix streets.”

---

## 5. Information architecture — exactly 3 tabs

Expo Router tabs. No extra auth. Hero tab is **Hold**, but **Map** is tab 1 because the 90s pitch starts with TCM vs Felt.

### Tab 1 — Map · `app/(tabs)/index.tsx`

**Job:** let the judge *see* that TCM is a uniform orange bath and Felt has canopy pockets. Routing is supporting evidence that the walk is a rounding error.

Layout:

- Full-screen Apple `MapView`.
- `initialRegion` from `/v1/bootstrap.config.region` (already RN-maps shape: `latitude`, `longitude`, `latitudeDelta`, `longitudeDelta`).
- Polygon overlay from `map_felt` in bootstrap, or `GET /v1/map?mode=felt|tcm`.
- Toggle **Felt** vs **2 m air**. Default **Felt**.
- When TCM is on: persistent chip `TCM REFUSED · spread {layers.tcm.spread_c}°C` (use API spread, typically 0.14). Do not hide this chip.
- Polylines from bootstrap `default_route` or `GET /v1/route?from_id=&to_id=`:
  - cyan solid = `cool`
  - gray dashed = `fast`
- Horizontal chips from `bootstrap.trips` / `GET /v1/trips`. Selecting a trip refetches `/v1/route`.
  - If `hold: true` (Van Buren → Arizona Center): do **not** celebrate a split path. Caption: **Hold, don’t detour.**
- Markers:
  - trip origin / dest
  - refuges from `/v1/refuges` (icon/label AC vs park)
  - trap from hold `trap_lat` / `trap_lon` (Van Buren / Central)
- Bottom sheet **above the tab bar**:
  - minutes (`cool.minutes` / `fast.minutes`)
  - mean felt (`cool.mean_c`)
  - `mean_delta_c`
  - if TCM refused (always, on this snapshot): one line  
    *Walking cooler air is a rounding error. Hold is the dose.*
- `fitToCoordinates` on the active path, padding so geometry is not under the sheet.

Heat color: cyan → yellow → orange → red mapped to **that overlay’s** `legend.min`–`legend.max`. TCM range is tiny (~0.14°C) so the map is almost one color — **that is the point**. Felt legend spans ~1.7°C so parks read cooler. Do not force a shared 30–50°C scale; that would hide the TCM lesson.

Tile coordinate format (already `{latitude, longitude}` rings):

```json
{
  "id": "0-0",
  "t2m": 39.686,
  "felt": 45.12,
  "vegetation": 0.12,
  "coordinates": [
    { "latitude": 33.4462, "longitude": -112.0796 },
    { "latitude": 33.4462, "longitude": -112.0784 },
    { "latitude": 33.4479, "longitude": -112.0784 },
    { "latitude": 33.4479, "longitude": -112.0796 }
  ]
}
```

TCM tiles from live cache may omit `felt` / `vegetation` — color by `t2m`. Felt tiles always have `felt`.

### Tab 2 — Hold · `app/(tabs)/now.tsx`  (**hero**)

**Job:** this is the product. Not a weather widget.

- Title: **Don't wait in the sun**
- Big number: `air_c` from `/v1/now` or `bootstrap.now` (~39.7°C) with subtitle **uniform thermal bath** (2 m air). Secondary line: felt at trap / demo point from the same payload.
- Card: platform dose vs mean hold dose from `/v1/hold?crowd=&wait_min=`
  - Platform **{platform_dose}** °C·min vs hold **{mean_hold_dose}**
  - Crowd saved **{dose_saved_total}** °C·min
  - Trap name, wait minutes, crowd size
- List `assignments`: name, people, AC vs SHADE, `walk_min`, `hold_dose`, `hold_temp_c`. Indoor first (API already sorts indoor first).
- Copy: **Release 3 min before boarding** — use `swarm.payload.release_min_before_vehicle` if you have swarm, else the constant 3 from the product (this one constant is allowed because it is policy, not a measured temperature).
- Tactile steppers: `crowd` 12–80, `wait_min` 5–20. Refetch hold (and optionally swarm) on change. Not a settings screen.
- Location: request when-in-use. If outside `config.bounds`, stay on `demo_point` and a muted line: *Not in downtown Phoenix — pinned to Civic Space Park.*
- If `anti_bottleneck` is true, a short note: *Split so one lobby is not the new trap.*

### Tab 3 — Swarm · `app/(tabs)/swarm.tsx`

**Job:** show the layer-arbiter using **backend text**, then the approved payload.

- `GET /v1/swarm?crowd=&wait_min=` (same crowd/wait as Hold if you lift state; otherwise defaults 36 / 11).
- Reveal `lines[]` one by one (~800 ms). Each row: agent color + `tool` chip + `text`.
- Agent colors:
  - `meteo` cyan — Layer arbiter
  - `psych` amber — Dwell / bottleneck
  - `infra` teal — Thermal Hold
- End card from `payload`: headline **TCM REFUSED · HOLD APPROVED** when `payload.tcm_refused`. Show assignments compactly (refuge + people). Pretty-print JSON is OK in a collapsed block; the headline must be readable without opening JSON.
- Replay button refetches the backend.

---

## 6. API contract (do not reshape)

Base: `process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.100.13:8000"`

Unknown `from_id` / `to_id` / `trap_id` → HTTP 400. Show `detail` / message.

### 6.1 Endpoints

| Method | Path | Use |
|---|---|---|
| GET | `/health` or `/v1/config` | City, region, `tcm_refused`, `demo_point`, `bounds` |
| GET | `/v1/bootstrap?crowd=36&wait_min=11` | **Cold start.** Prefer this once, then refetch hold/swarm/route/map on interaction. |
| GET | `/v1/now?lat&lon` | `air_c`, `felt_c`, `vegetation`, `risk` |
| GET | `/v1/layers` | `tcm`, `exceedance`, `hybrid`, `verdict` |
| GET | `/v1/map?mode=felt\|tcm` | `region`, `legend`, `tiles[]`, `tcm_refused` |
| GET | `/v1/refuges` | `refuges[]`, `trap_id` |
| GET | `/v1/trips` | `trips[]` (`hold?: boolean`) |
| GET | `/v1/route?from_id&to_id` | `cool`, `fast`, `paths_split`, `mean_delta_c`, `hold` |
| GET | `/v1/hold?trap_id&crowd&wait_min` | assignments + doses |
| GET | `/v1/swarm?...` | `lines`, `payload`, `plan` |
| GET | `/v1/thesis` | optional debug / pitch appendix — not a tab |

POST variants exist for route/hold/swarm; GET is enough for the phone.

### 6.2 Bootstrap shape (cold start)

`GET /v1/bootstrap` returns:

```ts
{
  config: Config;       // city, region, bounds, demo_point, tcm_refused, study_date, study_hour
  layers: Layers;       // tcm / exceedance / hybrid / verdict
  now: NowPoint;        // demo_point sample
  hold: HoldPlan;
  trips: Trip[];
  refuges: Refuge[];
  map_felt: MapOverlay; // mode felt — enough to paint tab 1 without a second map fetch
  default_route: RoutePair; // washington-2ndst → fillmore-1stave
}
```

`verdict` includes:

- `refuse_air_routing: true`
- `spatial_layer: "satellite_canopy"`
- `actuation: "thermal_hold"`
- `reason`: one sentence — you may show it on Map or Swarm, do not paraphrase into a cool-route slogan.

### 6.3 Route object

```json
{
  "node_ids": ["washington-2ndst", "fillmore-1stave"],
  "coords": [{ "latitude": 33.4484, "longitude": -112.0711 }],
  "meters": 982.1,
  "minutes": 12.41,
  "mean_c": 45.866,
  "peak_c": 46.5,
  "dose": 569.2
}
```

Parent:

```json
{
  "from_id": "washington-2ndst",
  "to_id": "fillmore-1stave",
  "cool": { },
  "fast": { },
  "paths_split": true,
  "mean_delta_c": 0.04,
  "hold": null
}
```

`hold` is non-null when origin or dest is the Van Buren trap — then the UI says Hold, don’t detour.

### 6.4 Hold assignment

```json
{
  "id": "azcenter",
  "name": "Arizona Center",
  "kind": "ac",
  "indoor": true,
  "people": 19,
  "walk_min": 5.1,
  "walk_m": 404.2,
  "hold_temp_c": 24.0,
  "hold_dose": 376.0,
  "saved_dose": 125.7,
  "lat": 33.4528,
  "lon": -112.0696,
  "node_id": "vanburen-3rdst"
}
```

Parent hold also has: `trap_id`, `trap_name`, `trap_lat`, `trap_lon`, `wait_min`, `crowd`, `air_c`, `trap_felt_c`, `platform_dose`, `tcm_refused`, `action: "thermal_hold"`, `assignments`, `overflow_on_platform`, `assigned`, `mean_hold_dose`, `dose_saved_total`, `refuges_used`, `anti_bottleneck`.

### 6.5 Swarm line

```json
{
  "agent": "meteo",
  "tool": "heatmap.tcm",
  "text": "TCM snapshot: 350 tiles, 39.62–39.76°C, spread 0.14°C. Air is lethal and spatially flat. REFUSE air-routing."
}
```

First meteo line **must** include `REFUSE air-routing` on this snapshot. If it does not, the backend is wrong — do not paper over it in the client.

### 6.6 Named IDs you will see (do not invent new ones)

Street-grid node ids are `{street}-{avenue}`, e.g. `vanburen-central`, `washington-2ndst`, `fillmore-1stave`.

Trips:

| id | label | hold? |
|---|---|---|
| `shade-park` | Convention Center → Civic Space Park | no |
| `hold-zone` | Van Buren Station → Arizona Center | **yes** |
| `roosevelt` | CityScape → Roosevelt Row | no |

Refuges: `azcenter`, `cityscape`, `pcc`, `civic`. Trap node: `vanburen-central`.

`config.bounds`: south 33.4462, north 33.4599, west -112.0796, east -112.0684.  
`demo_point`: 33.454, -112.0742 (Civic Space Park).

---

## 7. Visual design

Tokens (use these exact hexes unless `constants/theme.ts` already matches):

| Token | Hex | Use |
|---|---|---|
| background | `#07090C` | screens |
| surface | `#12171E` | cards, tab bar, sheet |
| border | `#2A3340` | hairlines |
| text | `#F4F1EA` | primary |
| muted | `#9AA3B2` | captions |
| cool | `#4CC9F0` | felt cool / meteo / active tab / cool polyline |
| hold / AC | `#2EC4B6` | indoor, infra agent |
| heat | `#FF6B35` | trap, TCM, heat end of ramp |
| warn | `#FFB703` | psych agent, bottleneck note |

- SF Pro via system font. No Inter. No emoji in chrome.
- Tab bar dark, active tint cool cyan.
- iPhone 16 safe areas. Bottom sheets sit **above** the tab bar.
- Haptics (`expo-haptics`) on chip / toggle / stepper.
- `userInterfaceStyle: dark` already in `app.json`.
- Typography: one huge number on Hold (`air_c` or dose), everything else dense and quiet. This should feel like a native ops tool, not a startup landing page.

---

## 8. Pitch choreography (build UI so this 90s path is obvious)

Judge flow. Do not add screens that break this order.

1. **Map + TCM overlay.** “Looks like one temperature.” Chip `TCM REFUSED`.
2. **Toggle Felt.** Canopy pockets appear. Optional trip chip to Civic Space Park — if paths split, `mean_delta_c` is tiny. Do not oversell.
3. **Hold tab.** Platform vs hold °C·min, 19 / 17 split, release 3 min before boarding.
4. **Swarm tab.** Live refuse line, then `TCM REFUSED · HOLD APPROVED`.

If the judge only has 30 seconds, Hold alone should still make the thesis.

---

## 9. Implementation notes

- Cold start: one `GET /v1/bootstrap`. Show a blocking error if it fails (URL + retry). Then paint all three tabs from that payload; refetch hold/swarm/route/map on interaction.
- Lift `crowd` / `wait_min` so Hold steppers and Swarm stay in sync.
- Do not leave the old synthetic field as source of truth.
- Prefer small typed modules: `lib/api.ts`, `lib/types.ts` (interfaces matching JSON), no god-file of Phoenix geometry.
- `npx tsc --noEmit` should be clean aside from pre-existing Expo template noise.
- Do not commit `.env` with secrets. Do not add Google packages.

---

## 10. Done when

- iPhone 16 + Expo Go shows **Map / Hold / Swarm** using **live** backend numbers that match `/docs`.
- TCM overlay looks almost flat; Felt overlay does not.
- Hold tab shows the indoor split (19 / 17 at defaults) and dose math from the API.
- Swarm first meteo line includes `REFUSE air-routing`. Replay hits the network.
- No hardcoded 39.7 / 502 / 19 / 17 as the data source. After a failed fetch: empty + error + URL, not a fake happy path.
- Map toggle + trip chips work; `hold: true` trip does not look like a cool-route victory.
- `npx tsc --noEmit` clean aside from template noise.

When in doubt: **the street is not the product. Dwell is.**

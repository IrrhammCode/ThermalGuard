# MAP PROMPT — ATA² (Tab 1 · Map)

Copy this **entire file** into a new Cursor chat. Build **the Map tab only**. Auth is a prior pass (`AUTH_PROMPT.md`). Hold and Swarm are later passes — do not rebuild them here. Do not change Python under `backend/`. Do not invent a second visual theme.

Human note (Bahasa): setelah login, juri **pertama kali** melihat Map. Halaman ini yang membuktikan TCM hampir rata. Jangan tulis “Cool Corridor”. Toggle **2 m air vs Felt** adalah interaksi #1. Rute cyan/gray hanya bukti bahwa jalan kaki Δmean-nya rounding error.

**Prerequisite:** `AUTH_PROMPT.md` already shipped (or tabs are reachable). Same tokens as auth. Same product: Thermal Hold, Phoenix, FortyGuard US-only.

---

## 0. Scope of this pass

You are a coding agent. Replace the current sketch in `app/(tabs)/index.tsx` with a production-feeling **iPhone 16 + Expo Go (SDK 57)** Map that talks **only** to the ATA² backend.

**In scope**

- Tab label **Map** (today it still says `Route` — rename in `app/(tabs)/_layout.tsx`)
- Full-screen Apple Maps + API polygons + trip chips + layer toggle + bottom sheet
- `GET /v1/bootstrap` once (or a shared bootstrap context if auth already fetches nothing — Map **owns** the first thermal fetch)
- Refetch `/v1/map?mode=` and `/v1/route?from_id=&to_id=` on interaction
- Isolate `react-native-maps` in `*.native.tsx`

**Out of scope**

- Hold dose math UI, Swarm line reveal
- Auth screens (do not restyle Welcome)
- Google Maps, new color palette, Indonesian chrome
- Recomputing felt / A* in TypeScript (`lib/phoenix.ts` gauss, `lib/routing.ts` client A*)
- Hardcoding 39.7 / 0.14 / 502 as source of truth

**Done when**

- Logged-in iPhone shows Map with **live** tiles from `/v1/map` or `bootstrap.map_felt`
- Default overlay is **Felt** (canopy pockets visible)
- Toggle to **2 m air** → map looks almost one color + persistent `TCM REFUSED · spread {n}°C`
- Trip chips refetch routes; `hold: true` trip shows **Hold, don’t detour** — not a cool-route victory
- Bottom sheet sits **above the tab bar**; `fitToCoordinates` padding accounts for sheet + top chips
- API down: error with the URL, **never** fake FortyGuard numbers
- `npx tsc --noEmit` clean aside from template noise

---

## 1. Why this page exists (read before pixels)

FortyGuard’s example product is a cool-route heatmap. On **live** downtown Phoenix (15 Jul 2024 14:00, 60 m, 350 tiles) **2 m TCM spread is ~0.14°C**. Cool-walk on air is theater.

This page’s job is **visual proof**:

1. TCM overlay = uniform orange bath → chip `TCM REFUSED`
2. Felt overlay = same air + satellite canopy → ~1.7°C pockets (park vs asphalt)
3. Two polylines may split; `mean_delta_c` is **tiny** (0.03–0.17°C). Do not celebrate it.

One-liner (sheet, when TCM refused — always on this snapshot):

> Walking cooler air is a rounding error. Hold is the dose.

City: **Phoenix, AZ**. Never Singapore. Never “Cool Corridor” as the screen title (that is the **old sketch** in `index.tsx` — delete that title).

---

## 2. One theme (same as auth — do not drift)

Tokens from `constants/theme.ts`:

| Token | Hex | Map use |
|---|---|---|
| `bg` | `#07090C` | under map / error screen |
| `surface` | `#12171E` | sheet, chips rest, tab bar (already) |
| `surface2` | `#1A212B` | stat cells inside sheet |
| `border` | `#2A3340` | sheet, chips |
| `text` | `#F4F1EA` | titles, numbers |
| `muted` | `#9AA3B2` | labels, legend ends |
| `cool` | `#4CC9F0` | Felt cool end, cool polyline, active chip, focused toggle |
| `hold` / `cool2` | `#2EC4B6` | indoor refuge markers, Hold caption accent |
| `heat` | `#FF6B35` | TCM refused chip, heat end of ramp, dest pin |
| `warn` | `#FFB703` | hold-trip caution strip only |
| `fast` | `#8B93A1` | shortest-path dashed polyline |

Type: SF Pro. Eyebrow 11/600/`muted` tracking +0.8. Title 22/600/`text` (this page is not Welcome — title is smaller because the map is the hero). Sheet numbers 20/600. Labels 11/600/`muted`. No Inter, no emoji in chrome.

Haptics: `selection` on chip / layer toggle. `ImpactLight` on sheet path-mode (cool vs fast highlight). No success haptic for a tiny Δmean.

Maps: Apple Maps. `userInterfaceStyle="dark"` on `MapView`. `showsCompass={false}` `rotateEnabled={false}` `pitchEnabled={false}`. `mapPadding` or `fitToCoordinates` edgePadding — not both fighting. Compass/legal Apple footer will show; do not cover it with the sheet (sheet is inset 12pt from sides, bottom = tabBar height + 8).

---

## 3. PAGE — Map · `app/(tabs)/index.tsx`

### 3.1 Job

Full-screen map + two overlays the judge can toggle + one trip at a time + a sheet that refuses to oversell walking.

### 3.2 Chrome hierarchy (z-order, back → front)

1. `PhoenixMap` (`absoluteFill`)
2. Top scrim (gradient `#07090C` 92% → transparent, height ~ safeTop + 132)
3. Top column: eyebrow, title, **layer toggle**, **TCM chip** (if air mode), **trip chips**
4. Bottom sheet (above tab bar)
5. Error/loading overlays (full screen, only when bootstrap failed / first load)

Do not put the layer toggle in the sheet. The 90s pitch is: **look at the map, then toggle**. Toggle must sit on the map.

### 3.3 Top block (paddingHorizontal 16, paddingTop = insets.top + 8)

1. **Eyebrow** 11/600/`cool` tracking +1.2:  
   `ATA² · PHOENIX`
2. **Title** 22/600/`text`:  
   `Layers`  
   Not “Cool Corridor”. Not “Route”. The product of this screen is **layer arbitration**.
3. **Layer segmented control** (marginTop 12), two equal segments, height 36, radius 10, fill `surface` 88% opacity, border `border`:
   - Left: `Felt` — default **on**
   - Right: `2 m air`
   - Selected: fill `cool`, label `#07090C` 13/600 when Felt selected
   - When **2 m air** selected: selected fill `heat`, label `#07090C` 13/600 (heat = the refused layer). Unselected label `text`
   - Width: full, minus 0. Haptic `selection` on change
   - Changing layer **must** swap polygons to that mode’s tiles and remap color to **that** `legend.min`–`legend.max`
4. **TCM REFUSED chip** — **only visible when `2 m air` is selected** (and `layers.tcm.can_route === false` / `config.tcm_refused`).  
   marginTop 8, align self start, height 28, paddingHorizontal 10, radius 8, border 1 `heat`, text `heat` 11/600:  
   `TCM REFUSED · spread {spread_c}°C`  
   `{spread_c}` from `layers.tcm.spread_c` formatted to **2 decimal places** (typical `0.14`).  
   If `tcm_refused` is false (should not happen on this snapshot): hide chip, do not fake it.
5. **Trip chips** — horizontal `ScrollView`, marginTop 10, gap 8, paddingRight 16, no scrollbar:
   - Data: `bootstrap.trips` (id, label, from_id, to_id, hold?)
   - Rest: bg `surface` 88%, border `border`, radius 999, paddingHorizontal 12, paddingVertical 8, maxWidth 280
   - Selected: bg `cool`, border `cool`, text `#07090C` 12/600
   - Unselected text `text` 12/600, `numberOfLines={1}`
   - Default selected: trip id `shade-park` if present, else first trip (matches bootstrap `default_route` Convention Center → Civic Space Park)
   - On select: haptic, set trip, `GET /v1/route?from_id=&to_id=`, then `fitToCoordinates`
   - If `hold === true`: selected chip may use border `warn` and selected fill `warn` with text `#07090C` — so the judge sees this trip is **not** a cool-walk demo. Label still API `label` (e.g. `Van Buren Station → Arizona Center`).

### 3.4 Map canvas

**Region:** `bootstrap.config.region` or `/v1/map.region` (already `{ latitude, longitude, latitudeDelta, longitudeDelta }`). Fallback only if missing: `phoenixRegion` in `constants/theme.ts` — not a second city.

**Polygons**

- Felt mode: tiles from `bootstrap.map_felt` on first paint; refresh via `GET /v1/map?mode=felt` if you need a clean fetch. Color by `tile.felt`. Legend from payload `legend`.
- Air mode: `GET /v1/map?mode=tcm`. Color by `tile.t2m`. TCM tiles may omit `felt`. If `tiles` is `[]` (cache missing): show sheet message `2 m tiles not cached on this Mac.` + keep Felt available. **Do not** invent a flat orange rectangle.

**Color ramp** (keep `lib/heat.ts` `heatColor`, alpha **0.46**):

Stops already in code: cyan `#4CC9F0` → yellow `#FFD60A` → orange `#FF6B35` → red `#C1121F`.

Map `legend.min` → `legend.max` **of the active overlay**.  

- TCM range ~0.14°C → almost one color. **That is the point. Do not expand the domain to 30–50°C.**
- Felt range ~1.7°C → parks read cooler.

Stroke: none (`transparent`, width 0).

**Polylines** (from `route.cool` / `route.fast` `.coords` — already `{latitude, longitude}`)

- Cool: solid `cool`, width 8 if “show cool emphasized”, else 5
- Fast: `fast` `#8B93A1`, dashed `[8, 6]`, width 4 (7 if fast emphasized)
- Default emphasize **cool** (cyan on top). Sheet can switch emphasis (see §3.5) without hiding the other line
- Empty coords: skip polyline, do not crash

**Markers**

| What | Color | Title | Notes |
|---|---|---|---|
| Origin | `cool` | `Start` | description = from street/ave if you have node names; else trip label left part |
| Dest | `heat` | `End` | |
| Trap | `heat` | hold `trap_name` e.g. `Van Buren / Central` | from `bootstrap.hold.trap_lat/lon` — always show, even if trip is not hold-zone |
| Refuge indoor (`kind === "ac"` or `indoor`) | `hold` | name | Arizona Center, CityScape, PCC |
| Refuge park | `cool` | name | Civic Space Park — **not** the hero; do not use a giant pin |

Do not drop 63 street-grid dots. Only origin, dest, trap, refuges.

`PhoenixMap.native.tsx` props should be rewritten to API types (do not require `GraphNode` from `lib/phoenix.ts`). Default `PhoenixMap.tsx` stays a non-maps fallback (“Open on iPhone”).

**fitToCoordinates**

When route coords exist, fit **cool.coords** (or union of cool+fast if `paths_split`) with:

```
edgePadding: { top: 168, right: 40, bottom: SHEET_H + TAB + 24, left: 40 }
animated: true
```

`SHEET_H` ≈ 220 when the hold caption is hidden, ≈ 268 when `hold: true` or TCM line is showing. Measure with `onLayout` on the sheet rather than magic 340 forever. Delay 250ms after trip change so the sheet has laid out.

### 3.5 Bottom sheet

Position: `left: 12` `right: 12` `bottom: (tabBarHeight or 49) + insets.bottom + 4` — **above the tab bar**, not under it.  
Fill `rgba(18,23,30,0.94)`, radius 20, border 1 `border`, padding 14, gap 10.

**Row A — legend**

- Left text 11/`muted`: active legend `label` from API (`Felt °C (2 m air + canopy)` or `FortyGuard 2 m air °C`). If too long, shorten to `Felt °C` / `2 m air °C`
- Middle: 6pt tall bar, 4 equal segments, colors of the ramp, radius 99
- Right text 11/`muted`: `{min.toFixed(2)} → {max.toFixed(2)}` using **active** legend (TCM will look absurdly tight — good)

**Row B — path emphasis** (not “Cool route wins”)

Two pills + optional third:

| Pill | Label | Action |
|---|---|---|
| 1 | `Canopy path` | emphasize cool polyline |
| 2 | `Shortest` | emphasize fast polyline |
| 3 | `Overlay` | toggle polygons on/off (default **on**). Off = basemap only, lines remain |

Selected pill: Canopy → fill `cool` text `#07090C`; Shortest → fill `fast` text `#07090C`; Overlay on → border `cool`.  
Do **not** label pill 1 `Cool route`. That phrase is the losing product.

**Row C — three stats** (`surface2`, radius 14, padding 10, flex 1)

| Cell | Label | Value | Sub |
|---|---|---|---|
| 1 | `Walk` | `{cool.minutes.toFixed(0)} min` | `{Math.round(cool.meters)} m` |
| 2 | `Mean felt` | `{cool.mean_c.toFixed(1)}°C` | `Δ {mean_delta_c ≥ 0 ? "−" : "+"}{abs(mean_delta_c).toFixed(2)}°C` vs shortest — **two decimals** because the win is tiny |
| 3 | `Peak` | `{cool.peak_c.toFixed(1)}°C` | `dose {cool.dose.toFixed(0)}` |

If emphasizing Shortest, cells 1–3 read **fast** fields instead, sub on cell 2 becomes `shortest`.

**Row D — thesis line** (always on this Phoenix snapshot when `tcm_refused`)

13/`muted`, lineHeight 18:

`Walking cooler air is a rounding error. Hold is the dose.`

**Row E — hold trip only** (`route.hold` non-null **or** selected trip `hold === true`)

Strip: fill `rgba(255,183,3,0.12)`, border `rgba(255,183,3,0.35)`, radius 12, padding 10.

- Kicker 10/700/`warn` tracking +1.2: `HOLD, DON’T DETOUR`
- Body 13/`text` lineHeight 18:  
  `2 m air is ~40°C. Do not dwell on the platform — open the Hold tab.`

Do **not** print `mean_delta_c` as a victory on this trip.

### 3.6 Tab bar (this pass only)

In `app/(tabs)/_layout.tsx`:

- `index` title: **Map** (not Route)
- Icon stays `map.fill`
- Active tint `cool`, inactive `muted`, bar `surface` — already correct
- `headerShown: false`

Do not restyle Hold/Swarm icons except if they break the bar.

### 3.7 Loading state (first bootstrap)

Full screen `bg`, centered:

- `ActivityIndicator` color `cool`
- Caption 13/`muted`: `Loading Phoenix layers…`
- Keep native splash from auth already hidden

Do not show the old gauss map while loading.

### 3.8 Error state (bootstrap or map fetch failed)

Full screen `bg`, padding 24, no fake tiles.

- Eyebrow: `BACKEND UNREACHABLE`
- Title: `No live heat`
- Deck: `ATA² will not invent FortyGuard numbers.`
- Mono 12/`cool` the URL: `{API_URL}` (from `lib/api.ts`)
- Body 13/`muted`: error message (`/v1/bootstrap -> 500` or network)
- Primary button (same `AuthButton` hold teal if it exists, else 52pt `#2EC4B6`): `Retry`
- Hint 11/`muted`: `iPhone and Mac must share Wi-Fi. Set EXPO_PUBLIC_API_URL if the LAN IP changed.`

### 3.9 Empty TCM tiles

If Felt works but TCM `tiles.length === 0`: stay on Felt, show a 13/`warn` line in the sheet: `2 m cache missing — Felt only.` Toggle `2 m air` still selectable; air mode then shows the same warning and **no** invented polygons.

---

## 4. Data & API (do not reshape)

Base: `process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.100.13:8000"`

Upgrade `lib/api.ts`: 8s timeout (`AbortController`), throw `Error` with `path`, status, and body `detail` if any.

**Cold start**

```
GET /v1/bootstrap?crowd=36&wait_min=11
```

Use:

- `config.region`, `config.tcm_refused`, `config.bounds`, `config.demo_point`
- `layers.tcm.spread_c`, `layers.tcm.can_route`, `layers.verdict.refuse_air_routing`
- `map_felt` (default overlay)
- `trips[]`
- `refuges[]`
- `default_route` (initial polylines until a chip is tapped — already `washington-2ndst` → `fillmore-1stave`)
- `hold.trap_lat`, `hold.trap_lon`, `hold.trap_name`

**On Felt ↔ air**

```
GET /v1/map?mode=felt
GET /v1/map?mode=tcm
```

Cache both in memory after first fetch so toggling is instant on the second flip.

**On trip chip**

```
GET /v1/route?from_id={from_id}&to_id={to_id}
```

400 → sheet error line with server message, keep previous path.

**Types** (put in `lib/types.ts`, not in `lib/phoenix.ts`):

```ts
type Coord = { latitude: number; longitude: number };

type MapTile = {
  id: string;
  t2m: number;
  felt?: number;
  vegetation?: number | null;
  coordinates: Coord[];
};

type MapOverlay = {
  mode: "felt" | "tcm";
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  legend: { kind: string; label: string; min: number; max: number };
  tiles: MapTile[];
  tcm_refused: boolean;
};

type RouteLeg = {
  node_ids: string[];
  coords: Coord[];
  meters: number;
  minutes: number;
  mean_c: number;
  peak_c: number;
  dose: number;
};

type RoutePair = {
  from_id: string;
  to_id: string;
  cool: RouteLeg;
  fast: RouteLeg;
  paths_split: boolean;
  mean_delta_c: number;
  hold: null | { place: string; node_id: string; reason: string };
};
```

Tile ring example (already RN-maps order):

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

Shared bootstrap: if you introduce `context/Bootstrap.tsx`, Map may create it. Hold/Swarm can consume it **later**; do not implement those screens now. Keep `crowd=36` `wait_min=11` as query defaults.

---

## 5. Delete / stop importing (this screen)

`index.tsx` today titles **Cool Corridor** and reads `TILES` / `TRIPS` / `planRoutes` from the **synthetic gauss field**. After this pass:

- Map screen must not import `feltAt`, `TILES`, `HEAT_RANGE`, or client `planRoutes`
- You may leave `lib/phoenix.ts` on disk if Hold still uses it; Map must not
- Rewrite `components/phoenix-map-types.ts` to API types
- `context/Session.tsx` trip/A* must not drive Map. Local `useState` on the Map screen is enough. If Session still wraps tabs and crashes because gauss A* runs, **stop using Session from index.tsx**

---

## 6. Copy deck (verbatim)

| Location | Copy |
|---|---|
| Eyebrow | ATA² · PHOENIX |
| Title | Layers |
| Segment | Felt |
| Segment | 2 m air |
| Refused chip | TCM REFUSED · spread {spread_c}°C |
| Pill | Canopy path |
| Pill | Shortest |
| Pill | Overlay |
| Thesis | Walking cooler air is a rounding error. Hold is the dose. |
| Hold kicker | HOLD, DON’T DETOUR |
| Hold body | 2 m air is ~40°C. Do not dwell on the platform — open the Hold tab. |
| Loading | Loading Phoenix layers… |
| Error title | No live heat |
| Error deck | ATA² will not invent FortyGuard numbers. |
| Tab | Map |

Do not restore “Cyan follows canopy and shade canyons…” — that oversells the walk.

---

## 7. Pitch choreography on **this** page (30s)

1. Land on **Felt** — pockets visible.
2. Tap **2 m air** — bath + `TCM REFUSED · spread 0.14°C`.
3. Tap **Felt** again.
4. Optional: trip chip to park; point at Δmean **0.0x°C** in the sheet. Say the Hold tab is the actuation.

If the map looks like a rainbow 15-degree legend on TCM, you failed.

---

## 8. Implementation notes

- Expo SDK **57**: https://docs.expo.dev/versions/v57.0.0/
- Backend: `cd backend && .venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000 --reload`
- OpenAPI: `{API_URL}/docs`
- Cleartext HTTP to LAN is required. Error UI if the phone cannot reach the Mac.
- 350 TCM polygons is OK on iPhone 16; do not downsample in a way that fakes spread
- Felt grid is 8×9 from the API — use it as-is
- No `FORTYGUARD_API_KEY` in the app

---

## 9. Visual QA (iPhone 16)

- [ ] Tab says **Map**, not Route
- [ ] Default overlay Felt, not air
- [ ] Air mode almost flat; Felt not flat
- [ ] Legend numbers change with the toggle (tight vs ~1.7°C)
- [ ] Title is **Layers**, not Cool Corridor
- [ ] Hold trip does not look like a win
- [ ] Sheet above tab bar; path not hidden under it
- [ ] Kill backend → error + URL, no gauss map
- [ ] Same dark ops theme as Welcome (no new fonts/colors)

When in doubt: **the street is not the product. Dwell is.** This page only proves the map was wrong.

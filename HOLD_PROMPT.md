# HOLD PROMPT — ATA² (Tab 2 · Hold)

Copy this **entire file** into a new Cursor chat. Build **the Hold tab only**. Auth = `AUTH_PROMPT.md`. Map = `MAP_PROMPT.md`. Swarm is the next pass — do not rebuild it here. Do not change Python under `backend/`. Do not invent a second visual theme.

Human note (Bahasa): ini **halaman produk**. Bukan widget cuaca. Juri yang cuma 30 detik harus mengerti: jangan nunggu di matahari, pecah kerumunan ke beberapa AC. Jangan jual “jalur lebih sejuk 4°C”.

**Prerequisite:** tabs reachable, same tokens (`constants/theme.ts`). If Map already created `context/Bootstrap.tsx`, **reuse** `crowd` / `wait_min` from it. If not, Hold owns those two numbers and writes them somewhere Swarm can read later (`context/HoldParams.tsx` is enough).

---

## 0. Scope of this pass

You are a coding agent. Replace the sketch in `app/(tabs)/now.tsx` with a production **iPhone 16 + Expo Go (SDK 57)** Hold screen. Live API only.

**In scope**

- Full Hold tab: hero air temp, platform vs hold dose, assignment list, steppers, location pin note, Sign out
- `GET /v1/now` + `GET /v1/hold` (or `bootstrap.now` + `bootstrap.hold` then refetch hold on stepper change)
- Tab already titled **Hold** — keep it. Icon may stay `clock.badge.checkmark.fill`
- Sign out (from `AUTH_PROMPT`): top-right, calls `useAuth().signOut()` if Auth context exists; if Auth was not built, omit Sign out rather than a fake button

**Out of scope**

- Map polygons, Swarm line reveal
- Restyling Welcome / Sign in
- Client-side dose math (do not reimplement `hold.py`)
- Hardcoding 39.7 / 502 / 19 / 17 as the data source
- Google Maps, new palette, Indonesian chrome

**Done when**

- Defaults `crowd=36` `wait_min=11` show **API** platform dose vs mean hold dose vs crowd saved, and a **split** across ≥2 indoor refuges (typically 19 Arizona Center / 17 CityScape)
- Steppers refetch `/v1/hold` and the list updates (people counts change)
- Big number is **2 m `air_c`**, subtitle **uniform thermal bath** — not felt as the hero
- Outside downtown Phoenix (or permission denied): pinned to `demo_point`, muted explanation
- API down: error + `{API_URL}`, no invented doses
- `npx tsc --noEmit` clean aside from template noise

---

## 1. Why this page exists (read before pixels)

People are not dying from the 12-minute walk (Δmean 0.03–0.17°C). They are dying from **dwell** on an exposed Valley Metro platform.

**Thermal Hold:** move the wait indoors, **split** the crowd so one shade strip / one lobby is not the new trap. Soft cap in backend ≈ 55% of crowd (min 8). That is why 36 → 19 + 17, not 36 + 0.

Dose (display only; API computes it):

```
platform_dose    = wait_min × trap_felt_c
hold_dose        = walk_min × walk_mean_felt + remaining_min × hold_temp
saved_dose       = platform_dose − hold_dose          # per person
dose_saved_total = Σ (saved_dose × people)
mean_hold_dose   = Σ (hold_dose × people) / assigned
```

Indoor `hold_temp` = **24°C**. Civic Space Park is **not** the hero destination.

Canonical demo (verify against API, do not hardcode as source of truth): Van Buren / Central, 36 people, 11 min, platform ~**502** °C·min, mean hold ~**397**, crowd saved ~**3782**, release **3 min** before vehicle.

One-liner (footer, not a toast):

> ATA² does not cool the street. It refuses the wrong map, then moves dwell off the sun.

---

## 2. One theme (do not drift)

Same tokens as auth/map.

| Token | Hex | Hold use |
|---|---|---|
| `bg` | `#07090C` | screen |
| `surface` | `#12171E` | hero card, assignment rows |
| `surface2` | `#1A212B` | stepper wells, stat tiles |
| `border` | `#2A3340` | cards |
| `text` | `#F4F1EA` | titles, doses |
| `muted` | `#9AA3B2` | captions |
| `cool` | `#4CC9F0` | eyebrow, Sign out hover/press |
| `hold` | `#2EC4B6` | AC badges, primary dose (hold), stepper + |
| `heat` | `#FF6B35` | platform dose, trap, errors |
| `warn` | `#FFB703` | anti-bottleneck note |

Type: SF Pro. Hero temperature **64/800/`text` tracking −2**. Screen title 28/600 (Welcome used 28; Hold title can be 28 or 32 — **not** 34/800 cartoon-bold like the sketch). Eyebrow 11/600 tracking +0.8. No Inter, no emoji.

Haptics: `selection` on stepper. `ImpactLight` on Sign out. No celebration haptic when dose_saved is large (ops tool).

---

## 3. PAGE — Hold · `app/(tabs)/now.tsx`

### 3.1 Job

This is the actuation screen. Scroll is OK. Map-style sheet is **not** OK. Think dispatch ticket, not weather app.

### 3.2 Layout (ScrollView, paddingHorizontal 20, paddingTop = insets.top + 12, paddingBottom 40)

**Header row** (height 44, space-between, align center)

1. Left: eyebrow 11/600/`cool` tracking +1.2:  
   `ATA² · THERMAL HOLD`
2. Right: text button 13/400/`muted`: `Sign out`  
   - `hitSlop` 12  
   - `useAuth().signOut()` — Protected routes return to Welcome  
   - If `useAuth` does not exist, **skip this control** (do not leave a dead button)

**Title block** (marginTop 8)

3. Title 28/600/`text` lineHeight 34:  
   `Don’t wait in the sun`
4. Deck 15/400/`muted` lineHeight 22, marginTop 8, max 4 lines:  
   `The walk is a rounding error. The platform wait is the dose. Split indoor holds so one lobby is not the new trap.`

**Location line** (marginTop 12, 13/`muted`)

5. If permission denied **or** GPS outside `config.bounds`:  
   `Not in downtown Phoenix — pinned to Civic Space Park.`
6. If GPS inside bounds:  
   `You are in the downtown grid. Numbers still use the 15 Jul 2024 14:00 snapshot.`  
   (Product is a study snapshot, not live GPS heat. Never paint “live °C at your phone” from the GPS point as if FortyGuard were streaming.)

Request `when-in-use` once. `inDemoBounds` from API `config.bounds` (south 33.4462, north 33.4599, west -112.0796, east -112.0684) — copy the helper off `lib/phoenix.ts` into `lib/geo.ts` if needed; do not import gauss `feltAt`.

`GET /v1/now?lat&lon`:
- Demo pin: `config.demo_point` (33.454, -112.0742)
- In-bounds GPS: still **allowed** for `now` felt/veg at that point, but the **hold plan** always uses trap `vanburen-central` unless the API says otherwise. Do not change `trap_id` from the phone GPS.

**Hero card** (marginTop 20, `surface`, radius 20, padding 20, border `border`)

7. Label 11/600/`muted` tracking +0.6: `2 M AIR`
8. Big number: `{air_c.toFixed(1)}°C` from `/v1/now` (or `hold.air_c` if now failed but hold has it — prefer now)
9. Subtitle 15/400/`muted`: `uniform thermal bath`
10. Secondary 13/`muted` marginTop 8:  
    `Felt at pin {felt_c.toFixed(1)}°C · canopy {(vegetation*100).toFixed(0)}%`
11. Chip (marginTop 14, align start, height 28, paddingHorizontal 10, radius 8, fill `rgba(255,107,53,0.18)`, text `heat` 11/600):  
    `{risk} · TCM too flat to route`  
    `risk` from API (`Very Strong` / `Extreme`, etc.)

Do **not** make felt the 64pt number. Air is the severity layer; felt is the place footnote.

**Dose card** (marginTop 12, radius 20, padding 16, fill `rgba(255,107,53,0.10)`, border `rgba(255,107,53,0.35)`)

12. Kicker 10/700/`heat` tracking +1.2: `PLATFORM vs HOLD`
13. Trap name 18/600/`text` marginTop 4: `{trap_name}` e.g. `Van Buren / Central`
14. Meta 13/`muted` marginTop 4: `{crowd} people · {wait_min} min wait · felt {trap_felt_c.toFixed(1)}°C`
15. **Two big columns** (marginTop 16, row):

| | Left (platform) | Right (hold) |
|---|---|---|
| Label 11/`muted` | `Platform` | `Mean hold` |
| Value 28/600 | `{platform_dose.toFixed(0)}` color `heat` | `{mean_hold_dose.toFixed(0)}` color `hold` |
| Unit 11/`muted` | `°C·min` | `°C·min` |

If `mean_hold_dose` is null: right value `—`

16. Full-width bar under columns (marginTop 16):  
    `Crowd saved {dose_saved_total.toFixed(0)} °C·min`  
    15/600/`text`. This is the headline number for the judge after the 64pt air.

**Steppers** (marginTop 16, row, gap 10)

Two wells, `surface2`, radius 16, padding 12, flex 1.

**Crowd**

- Label 11/`muted`: `Crowd`
- Value 22/600/`text`: `{crowd}`
- Row of − / + : 44×44, radius 10, border `border`, label 20/600. Minus `text`, plus `hold`
- Range **12–80**, step **1**. Clamp. Haptic `selection`
- Disable − at 12, + at 80 (opacity 0.35)

**Wait**

- Label: `Wait`
- Value: `{wait_min}` + tiny `min` 13/`muted`
- Range **5–20**, step **1**

On change: debounce **280ms**, then `GET /v1/hold?crowd=&wait_min=` (keep default `trap_id`). Show a 2pt `cool` activity on the dose card (not a full-screen spinner) while refetching. Keep previous assignments visible until the new payload arrives. On error: toast-line under steppers in `heat`, keep last good plan.

Persist `crowd`/`wait_min` in context so Swarm can use them.

**Release strip** (marginTop 12, `surface`, radius 14, padding 12, row)

- Left SF Symbol `bell` tint `hold` size 18
- Text 15/400/`text`: `Release {n} min before boarding`  
  `n` = `3` from product policy, or `swarm.payload.release_min_before_vehicle` if already in memory. Do not fetch Swarm just for this.

**Anti-bottleneck** (only if `anti_bottleneck === true`)

- marginTop 12, 13/`warn` lineHeight 18:  
  `Split so one lobby is not the new trap.`

**Section title** (marginTop 28, 18/600/`text`): `Assignments`

**Assignment rows** (gap 8)

For each `assignments[]` (API already sorts indoor first):

- Card `surface`, radius 16, padding 14, border `border`, row
- Left flex 1:
  - Name 16/600/`text`
  - Note 12/`muted` marginTop 4:  
    indoor: `Air-conditioned hold · {hold_temp_c.toFixed(0)}°C`  
    else: `Outdoor canopy — last resort`
  - Walk 12/`muted`: `Walk {walk_min.toFixed(1)} min · {walk_m.toFixed(0)} m` (`walk_m` if present)
- Right, align end:
  - `{people} ppl` 15/700 color `cool`
  - Badge 10/700 tracking +0.8: indoor `AC` color `hold`, else `SHADE` color `warn`
  - `{hold_dose.toFixed(0)} °C·min` 13/`text`

Do not dump everyone onto Civic Space Park visually as first row — indoor first matches API. If a park row appears, it should look secondary (SHADE / warn), not hero.

**Overflow** (only if `overflow_on_platform > 0`)

- 13/`heat`: `{n} remain on the platform — raise indoor capacity in a real city, not here.`

**Footer** (marginTop 20, 12/`muted` lineHeight 18)

`ATA² does not cool the street. It refuses the wrong map, then moves dwell off the sun.`

### 3.3 Loading

First paint with no cache: screen `bg`, header+title visible, hero and dose are **skeleton** `surface2` bars (radius 20, height 160 / 180) — not a blank page. No gauss numbers.

### 3.4 Error (hold+now both failed)

Same grammar as Map error:

- Eyebrow `BACKEND UNREACHABLE`
- Title `No live hold`
- Deck `ATA² will not invent FortyGuard numbers.`
- URL `{API_URL}`
- `Retry`

If **now** fails but **hold** works: show dose + assignments, omit hero °C, 13/`heat` `Couldn’t read /v1/now.`

### 3.5 What this page must not have

- A map
- “Cooler sidewalk −4°C”
- Steppers that feel like a Settings app (no gear icon, no nav to a form sheet)
- Fahrenheit as the hero (optional tiny `{formatF(air_c)}` under subtitle is OK; 64pt stays °C)
- Fake live streaming thermometer animation

---

## 4. API

```
GET /v1/now?lat={lat}&lon={lon}
GET /v1/hold?crowd={n}&wait_min={m}
GET /v1/bootstrap?crowd=&wait_min=   # optional cold start if Map did not
```

Hold assignment fields you must display when present: `id`, `name`, `indoor`, `kind`, `people`, `walk_min`, `walk_m`, `hold_temp_c`, `hold_dose`, `saved_dose`, `lat`, `lon`.

Parent: `trap_name`, `trap_felt_c`, `air_c`, `platform_dose`, `mean_hold_dose`, `dose_saved_total`, `crowd`, `wait_min`, `assignments`, `overflow_on_platform`, `anti_bottleneck`, `tcm_refused`.

400 on bad `trap_id`: show `detail`. Do not send a custom trap from the UI in this pass.

Types in `lib/types.ts` (extend Map types; do not duplicate conflicting names).

Upgrade `apiGet` if Map did not: 8s timeout, status + body in `Error`.

---

## 5. Copy deck (verbatim)

| Location | Copy |
|---|---|
| Eyebrow | ATA² · THERMAL HOLD |
| Title | Don’t wait in the sun |
| Deck | The walk is a rounding error. The platform wait is the dose. Split indoor holds so one lobby is not the new trap. |
| Demo pin | Not in downtown Phoenix — pinned to Civic Space Park. |
| In grid | You are in the downtown grid. Numbers still use the 15 Jul 2024 14:00 snapshot. |
| Air label | 2 M AIR |
| Air sub | uniform thermal bath |
| Chip | {risk} · TCM too flat to route |
| Dose kicker | PLATFORM vs HOLD |
| Col left | Platform |
| Col right | Mean hold |
| Saved | Crowd saved {n} °C·min |
| Release | Release {n} min before boarding |
| Bottleneck | Split so one lobby is not the new trap. |
| Section | Assignments |
| Footer | ATA² does not cool the street. It refuses the wrong map, then moves dwell off the sun. |
| Sign out | Sign out |
| Tab | Hold |

---

## 6. Pitch on this page (30s)

1. 64pt air ~39.7°C + “uniform thermal bath”
2. Platform ~502 vs hold ~397 °C·min
3. Crowd saved ~3782
4. 19 / 17 split, AC badges, release 3 min

If this looks like a weather widget, you failed.

---

## 7. Implementation notes

- Expo SDK 57: https://docs.expo.dev/versions/v57.0.0/
- Do not import `lib/phoenix.ts` gauss / `TILES` / client A*
- Location permission string in `app.json` should match Hold (demo pin), not “cooler Phoenix streets”
- Debounce steppers; do not fire 20 hold requests while spinning
- `npx tsc --noEmit`

When in doubt: **the street is not the product. Dwell is.**

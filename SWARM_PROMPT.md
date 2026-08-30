# SWARM PROMPT — ATA² (Tab 3 · Swarm)

Copy this **entire file** into a new Cursor chat. Build **the Swarm tab only**. Prior passes: `AUTH_PROMPT.md`, `MAP_PROMPT.md`, `HOLD_PROMPT.md`. Do not restyle those screens. Do not change Python under `backend/`. Do not invent a second visual theme.

Human note (Bahasa): Swarm **bukan chatbot**. Bukan debat palsu. Agent memanggil **tool name nyata** dari `/v1/swarm` (`heatmap.tcm`, dll). Teks baris **dari backend** — jangan ditulis ulang. Baris pertama meteo harus berisi `REFUSE air-routing`. Replay = **refetch**, bukan putar array lokal.

**Prerequisite:** same tokens. Read `crowd` / `wait_min` from Hold’s context if it exists; else default 36 / 11.

---

## 0. Scope of this pass

You are a coding agent. Replace `app/(tabs)/swarm.tsx` with a production **iPhone 16 + Expo Go (SDK 57)** layer-arbiter log.

**In scope**

- `GET /v1/swarm?crowd=&wait_min=`
- Reveal `lines[]` one by one (~800 ms)
- Agent legend, tool chips, end card `TCM REFUSED · HOLD APPROVED`
- Replay refetches the network
- Tab title already **Swarm** — keep it

**Out of scope**

- LLM calls, scripted debate in the client, n8n, Semantic Kernel logos
- Rewriting `line.text`
- Map / Hold layout work
- Indonesian chrome, new colors, emoji in chrome
- Pretty-printing JSON as the **only** success UI (JSON may be collapsed; headline must stand alone)

**Done when**

- First visible meteo line includes `REFUSE air-routing` (from API text)
- Tools shown: at least `heatmap.tcm`, `heatmap.exceedance`, `crowd.dwell`, `satellite.canopy`, `hold.assign`, `termination`
- End card readable without opening JSON; assignments as refuge × people
- Replay hits `/v1/swarm` again (watch backend logs or a request counter)
- API down: error + URL, empty log, no fake transcript
- `npx tsc --noEmit` clean aside from template noise

---

## 1. Why this page exists (read before pixels)

Fawad’s hackathon point: **wrong analysis layer = confident wrong answer.** Expose endpoints as **agent tools**.

Swarm is a **layer arbiter**:

1. `meteo` reads TCM → refuse air-routing (spread < 0.5°C)
2. `meteo` reads exceedance hours → not a cool corridor, a long exposure
3. `psych` refuses dumping the crowd on one shade strip
4. `infra` assigns Thermal Hold splits from **the same hold plan** as the Hold tab

It is **deterministic tools + cache**, not a model arguing. Do not show “● debating”.

---

## 2. One theme (do not drift)

| Token | Hex | Swarm use |
|---|---|---|
| `bg` | `#07090C` | screen |
| `surface` | `#12171E` | log card, agent cards, replay |
| `surface2` | `#1A212B` | replay press |
| `border` | `#2A3340` | hairlines |
| `text` | `#F4F1EA` | line body |
| `muted` | `#9AA3B2` | roles, timestamps |
| `cool` | `#4CC9F0` | **meteo** |
| `warn` | `#FFB703` | **psych** |
| `hold` | `#2EC4B6` | **infra**, approved card |
| `heat` | `#FF6B35` | errors, TCM refused half of headline if you split colors |

Type: SF Pro. Title 28/600. Line body 15/400 lineHeight 22. Tool chip 10/600. Agent name 11/700. Log may use `Menlo`/`ui-monospace` **only** inside the collapsed JSON. No Inter.

Haptics: `selection` on Replay. `NotificationSuccess` **once** when the termination line appears (approved). None per intermediate line (too noisy).

---

## 3. PAGE — Swarm · `app/(tabs)/swarm.tsx`

### 3.1 Job

Show the arbiter **reading tools**, then an approved payload. The judge should see `heatmap.tcm` and `REFUSE` without scrolling past a novel.

### 3.2 Layout (ScrollView, paddingHorizontal 20, paddingTop = insets.top + 12, paddingBottom 40)

**Header**

1. Eyebrow 11/600/`cool` tracking +1.2:  
   `LAYER ARBITER · LIVE TOOLS`
2. Title 28/600/`text` marginTop 4: `Swarm`
3. Deck 15/400/`muted` lineHeight 22 marginTop 8:  
   `Agents call FortyGuard layers, refuse a flat TCM, then split dwell. The lines are the API. This is not a debate.`

**Agent legend** (marginTop 18, row, gap 8)

Three equal cards, `surface`, radius 14, padding 10, border `border`:

| agent | Dot | Name (12/700/`text`) | Role (10/`muted`) |
|---|---|---|---|
| `meteo` | 8pt `cool` | `Meteo` | `Layer arbiter` |
| `psych` | 8pt `warn` | `Psych` | `Dwell / bottleneck` |
| `infra` | 8pt `hold` | `Infra` | `Thermal Hold` |

Do **not** use the long sketch names (“Meteorological Agent”) in the cards — too wide on iPhone 16. Full names are OK on each log line (see below).

**Params echo** (marginTop 12, 12/`muted`)

`Crowd {n} · wait {m} min` — from Hold context or defaults. Read-only on this tab (change them on Hold). If Hold context missing, still pass 36/11 to the API.

**Log card** (marginTop 16, `surface`, radius 18, padding 14, border `border`, minHeight 220)

Each **visible** line is a block, gap 14:

1. Row: 6×6 rounded square in agent color +  
   `{Full agent name}` in agent color 11/700 +  
   `  ·  ` + **tool chip**
2. Tool chip: height 20, paddingHorizontal 8, radius 6, border 1 agent color at 40% opacity, text 10/600 agent color, `Menlo` 10 allowed for tool id  
   Example: `heatmap.tcm`
3. Body: `line.text` **verbatim** 15/400/`text` lineHeight 22, marginTop 6

**Full agent names on lines** (not cards):

- `meteo` → `Meteorological agent`
- `psych` → `Spatial psychology agent`
- `infra` → `Infrastructure actuator`

**Reveal**

- On payload: `shown = 0`, then every **800ms** increment until `lines.length`
- Start the timer only after a successful fetch
- Auto-scroll the ScrollView to end on each increment (`scrollToEnd({ animated: true })`)
- Cursor while `shown < length`: 12/600/`cool`  
  `● reading tools`  
  **Not** `● debating`
- When done, hide cursor

Do not fade-in with a 2s opacity animation per line — 800ms tick is enough.

**Unknown `agent` string:** treat as `infra`, do not crash.

**Approved card** (only when `shown >= lines.length` and data present; marginTop 16)

Fill `rgba(46,196,182,0.10)`, border `rgba(46,196,182,0.35)`, radius 16, padding 16.

4. Kicker 10/700 tracking +1.0, color `hold`:  
   - If `payload.tcm_refused`: `TCM REFUSED · HOLD APPROVED`  
   - Else: `HOLD APPROVED` (should not happen on Phoenix snapshot)
5. Title 22/600/`text` marginTop 6: `Thermal Hold`
6. Sub 13/`muted` marginTop 4: `{payload.city} · {payload.trap}`  
   e.g. `Phoenix, AZ · Van Buren / Central`
7. Assignment chips (marginTop 12, wrap row, gap 8):  
   each `{people} → {refuge}` 13/600, indoor border `hold`, outdoor border `warn`, paddingHorizontal 10, height 32, radius 8, `surface2` fill
8. Meta 13/`muted` marginTop 12:  
   `Release {payload.release_min_before_vehicle} min before vehicle · wait {payload.wait_min} min`
9. **Collapsed JSON** (marginTop 12):  
   - Header pressable 13/600/`cool`: `Payload JSON` / `Hide JSON`  
   - Default **collapsed**  
   - Expanded: `Menlo` 11/`cool` `JSON.stringify(payload, null, 2)`  
   - Headline (item 4) must remain visible when collapsed

**Replay** (marginTop 16)

- Height 52, radius 14, fill `surface2`, border `border`, label 17/600/`text`: `Replay from backend`
- On press: haptic `selection`, `shown=0`, clear `data` **or** keep old until new returns (prefer clear to prove it is not a local loop), `GET /v1/swarm?...` again
- Loading: label `Fetching…` + small `ActivityIndicator` `cool`, disable double-tap
- Must not replay `lines` from React state without a new HTTP response

### 3.3 Loading (first fetch)

Legend visible. Log card skeleton (three gray bars). No fake meteo sentences.

### 3.4 Error

Inside the log card (or below legend):

- 13/`heat` lineHeight 18: `Backend unreachable. ATA² will not invent a swarm.`
- 12/`cool`: `{API_URL}`
- 12/`muted`: `{error.message}`
- Replay still present (acts as Retry)

Empty `lines[]` after 200: `No swarm lines. Check /v1/swarm.` — do not invent four sentences.

### 3.5 Integrity check (client)

After fetch, if `tcm.can_route === false` (or `payload.tcm_refused`) **and** no `lines[].text` includes `REFUSE`:

- Show a 13/`heat` banner **above** the log:  
  `Layer arbiter missing REFUSE — backend mismatch.`  
- Still render API lines. **Do not** inject a fake refuse sentence.

### 3.6 What this page must not have

- Chat composer / “Ask the swarm”
- Avatars / robot illustrations
- Typing “…” bubbles that invent words
- Local hardcoded array of debate lines as fallback
- Semantic Kernel / n8n badges
- Auto-play music

---

## 4. API

```
GET /v1/swarm?crowd={n}&wait_min={m}
```

Optional POST exists; GET is enough.

Response (use these names):

```ts
type SwarmLine = {
  agent: "meteo" | "psych" | "infra" | string;
  tool: string;
  text: string;
};

type SwarmResponse = {
  tcm: { n_tiles: number; min_c: number; max_c: number; spread_c: number; can_route: boolean };
  exceedance: { min: number; max: number; spread: number; units: string };
  plan: HoldPlan; // same shape as /v1/hold
  lines: SwarmLine[];
  payload: {
    action: "thermal_hold";
    tcm_refused: boolean;
    city: string;
    trap: string;
    assignments: { refuge: string; people: number; indoor: boolean }[];
    wait_min: number;
    release_min_before_vehicle: number;
  };
};
```

Example first line (illustrative — **render whatever the server sends**):

```json
{
  "agent": "meteo",
  "tool": "heatmap.tcm",
  "text": "TCM snapshot: 350 tiles, 39.62–39.76°C, spread 0.14°C. Air is lethal and spatially flat. REFUSE air-routing."
}
```

Same `crowd`/`wait_min` as Hold so `hold.assign` people counts match the Hold tab. If they drift, Swarm is wrong — do not silently default.

---

## 5. Copy deck (verbatim)

| Location | Copy |
|---|---|
| Eyebrow | LAYER ARBITER · LIVE TOOLS |
| Title | Swarm |
| Deck | Agents call FortyGuard layers, refuse a flat TCM, then split dwell. The lines are the API. This is not a debate. |
| Roles | Layer arbiter / Dwell / bottleneck / Thermal Hold |
| Cursor | ● reading tools |
| Approved | TCM REFUSED · HOLD APPROVED |
| Approved title | Thermal Hold |
| JSON toggle | Payload JSON |
| Replay | Replay from backend |
| Mismatch | Layer arbiter missing REFUSE — backend mismatch. |
| Error | Backend unreachable. ATA² will not invent a swarm. |
| Tab | Swarm |

Do **not** restore sketch subtitle “so one shade strip does not become the new trap” as the only deck — Hold already owns that sentence. Swarm’s deck must say the lines **are the API**.

---

## 6. Pitch on this page (20s)

1. Open Swarm — first line `heatmap.tcm` + `REFUSE air-routing`
2. Let assign lines land (19 → Arizona Center, 17 → CityScape)
3. End card `TCM REFUSED · HOLD APPROVED`
4. Tap Replay — judge sees fetch, not a GIF

---

## 7. Implementation notes

- Expo SDK 57: https://docs.expo.dev/versions/v57.0.0/
- Clear the 800ms timer on unmount and on Replay
- Do not import `lib/agents.ts` scripted copy if it still exists — delete the import from this screen
- Backend: `uvicorn app:app --host 0.0.0.0 --port 8000 --reload`
- `npx tsc --noEmit`

When in doubt: **wrong layer → confident wrong answer.** This tab shows the refuse.

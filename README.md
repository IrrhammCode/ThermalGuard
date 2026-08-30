<p align="center">
  <img src="./assets/logo.jpg" alt="ThermalGuard Logo" width="150" />
</p>

# 🛡️ ThermalGuard — AI-Powered Heat-Safe Walking Agent for Phoenix

> **Three autonomous AI agents read live 2 m air data, your body file, and satellite canopy — then route you through the safest path in 40 °C+ heat.**

[![FortyGuard Hackathon](https://img.shields.io/badge/Hackathon-FortyGuard_'26-FF6B35?style=for-the-badge)](https://www.fortyguard.com/hackathon26)
[![Track: AI Agent](https://img.shields.io/badge/Track-AI_Agent-10B981?style=for-the-badge&logo=openai&logoColor=white)](https://www.fortyguard.com/hackathon26)
[![React Native](https://img.shields.io/badge/Mobile-Expo_React_Native-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://expo.dev)
[![Python Backend](https://img.shields.io/badge/Backend-Python_FastAPI-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 🔗 Live Demo

| Platform | URL |
|----------|-----|
| 🌐 **Web App** | [thermal-guard-one.vercel.app](https://thermal-guard-one.vercel.app/) |
| ⚙️ **API Backend** | [thermalguard-api-6b9168012334.herokuapp.com](https://thermalguard-api-6b9168012334.herokuapp.com/) |
| 📱 **Mobile (Expo Go)** | Scan QR via `npx expo start --tunnel` or [EAS Dashboard](https://expo.dev/accounts/irrhammhmz/projects/ata2) |
| 📦 **Source Code** | [github.com/IrrhammCode/ThermalGuard](https://github.com/IrrhammCode/ThermalGuard) |

> **Try it now →** Open the web app link on any browser. For the full native experience (Apple Maps thermal overlay), use Expo Go on iOS.

---

## ⏱️ How ThermalGuard Works in 10 Seconds

ThermalGuard orchestrates **3 specialized AI agents** into a real-time decision loop:

1. **You fill your health profile** — age, pre-existing conditions, allergies.
2. ↓ **Pick FROM → TO** and report current symptoms (dizziness, cramps, etc.)
3. ↓ **🌡️ Meteo Agent** reads live FortyGuard 2 m air temperature + satellite canopy data.
4. ↓ **❤️ Body Agent** cross-references your health file against the heat exposure.
5. ↓ **🏗️ Infra Agent** finds indoor AC shelters, evaluates platform dwell dose.
6. ↓ **AI picks the coolest route**, explains *why*, and guides you safely to arrival.

> Walk is saved to history with full route data, heat dose, and agent verdict.

---

## ⚡ Quick Start

Get the backend and mobile app running locally:

```bash
# 1. Clone the repository
git clone https://github.com/IrrhammCode/ThermalGuard.git
cd ThermalGuard

# 2. Setup the Python backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Add your GROQ_API_KEY
uvicorn app:app --reload --host 0.0.0.0

# 3. (New terminal) Start the Expo mobile app
cd ..
npm install
npx expo start
```

> Scan the QR code with Expo Go on your iPhone to run the app.

---

## 🌍 Project Overview

**What is ThermalGuard?**
ThermalGuard is an AI-agent mobile application that protects pedestrians from extreme urban heat in Phoenix, Arizona. It uses live temperature data from FortyGuard's grid, satellite vegetation analysis, and personal health profiling to find the safest walking route.

**Why does it exist?**
Phoenix regularly exceeds 40 °C (115 °F). Pedestrians—especially the elderly, those with cardiovascular conditions, or anyone with heat sensitivity—face real danger walking between transit stops. ThermalGuard turns raw climate intelligence into actionable, personalized routing.

**Who is it for?**
- Pedestrians navigating Phoenix's light rail and bus stops in extreme heat.
- People with pre-existing conditions (cardiovascular, respiratory, diabetes).
- Anyone who wants AI-driven heat protection that adapts to their body.

**How is it different?**
Unlike generic weather apps, ThermalGuard doesn't just show temperature — it runs **3 AI agents** that consider your personal health, current symptoms, and real-time infrastructure to make a concrete routing decision.

---

## 📂 Repository Structure

| Component | Directory | Description |
|-----------|-----------|-------------|
| **Mobile App** | [`/app`](./app/) | Expo Router-based React Native app with dark tactical UI, real-time map, and walk flow. |
| **AI Backend** | [`/backend`](./backend/) | FastAPI + Groq LLM swarm orchestrator. 3-agent system (Meteo, Body, Infra) producing `BodyVerdict`. |
| **Components** | [`/components`](./components/) | Reusable UI: Glass cards, ChipSelect, PlaceField, DoseBar, PhoenixMap overlay. |
| **Libraries** | [`/lib`](./lib/) | Core logic: health profiling (`profile.ts`), heat math (`heat.ts`), route grid (`phoenix.ts`). |
| **Context** | [`/context`](./context/) | React context providers: Auth, Profile (health), AppData (API), History. |

---

## 🚨 Problem Statement

Extreme urban heat is the **deadliest weather phenomenon** in the United States. Phoenix faces unique challenges:

- **Surface temperatures exceeding 70 °C** on exposed platforms and asphalt.
- **Light rail platforms with zero shade** where passengers dwell 10–20 minutes.
- **No personalized heat guidance** — weather apps show city-wide temperature, not what YOU feel at street level.
- **Vulnerable populations** (elderly, medicated, chronically ill) have no tool that considers their body's heat tolerance.
- **No AI agent** currently reads live grid-level thermal data AND personal health profiles to make routing decisions.

---

## 💡 Solution

ThermalGuard deploys a **multi-agent AI swarm** that reads real data and makes concrete decisions:

- **🌡️ Meteo Agent:** Ingests FortyGuard's 63-node thermal grid — live 2 m air, felt temperature, wind, humidity, and vegetation index per block.
- **❤️ Body Agent:** Reads the user's health profile (age band, cardiovascular/respiratory conditions, allergies, current symptoms) and produces a `BodyVerdict`: `ok`, `watch`, or `indoor_only`.
- **🏗️ Infra Agent:** Maps indoor AC refuges, calculates platform dwell dose (°C·min), and assigns shelter splits for hold trips.
- **Cooler Route Algorithm:** 63-node Phoenix grid with Dijkstra pathfinding weighted by felt temperature — routes are genuinely cooler, not just shorter.

---

## 💎 Key Features

- **🤖 3-Agent AI Swarm** — Meteo, Body, and Infra agents running on Groq LLM with tool-calling.
- **📊 Live FortyGuard Data** — Real 2 m air temperature, felt temp, vegetation, and wind per grid node.
- **🗺️ Thermal Map Overlay** — Color-coded heat map of downtown Phoenix on the walk screen.
- **❤️ Personal Health Profile** — Age, chronic conditions, allergies stored securely on-device.
- **🩺 Per-Trip Symptom Check** — Current symptoms asked before each walk, feeding directly into AI analysis.
- **📈 "Why This Route?" Briefing** — AI explains temperature delta, heat dose, and shelter recommendations.
- **📍 Cool vs Fast Route** — Side-by-side comparison: coolest path vs shortest path with real temperature data.
- **🏥 Auto-Save Walk History** — Every walk is recorded with route, dose, verdict, and symptoms.
- **🔐 Secure Auth** — Google OAuth via Supabase with on-device health data encryption (SecureStore).
- **🌑 Dark Tactical UI** — Premium glassmorphism design built for readability in direct sunlight.

---

## 🏆 Hackathon Track: AI Agent

ThermalGuard is built for the **AI Agent** track of FortyGuard Hackathon '26. Here's exactly how we answer the challenge:

- **What:** A mobile AI agent that reads live FortyGuard thermal data and personal health profiles to route pedestrians safely through extreme Phoenix heat.
- **Why:** Because no existing tool combines grid-level thermal intelligence with individual body vulnerability to make real-time walking decisions.
- **Who:** Pedestrians in Phoenix — especially vulnerable populations (elderly, chronically ill, heat-sensitive).
- **Where:** Downtown Phoenix light rail corridor — the hottest, most exposed pedestrian infrastructure in the US.
- **When:** Real-time. The agents read current FortyGuard data on every analysis, not cached forecasts.
- **How:** 3 specialized AI agents (Groq LLM with tool-calling) orchestrated via a Python swarm, delivering personalized `BodyVerdict` decisions through a React Native mobile app.

<details>
<summary><b>🔎 Proof of Implementation (AI Agent Code Evidence)</b></summary>

* **Multi-Agent Swarm Orchestration:** [`backend/ata2/agents.py`](./backend/ata2/agents.py) — 3-agent Groq tool-calling system with structured JSON output.
* **Body Verdict Decision Engine:** [`backend/ata2/body.py`](./backend/ata2/body.py) — `groq_verdict()` produces `ok | watch | indoor_only` based on health + weather fusion.
* **63-Node Phoenix Thermal Grid:** [`lib/phoenix.ts`](./lib/phoenix.ts) — Dijkstra-weighted pathfinding using real FortyGuard felt temperatures.
* **Health Profile System:** [`lib/profile.ts`](./lib/profile.ts) — `HealthProfile` type with triage logic for acute/vulnerable classification.
* **Client-Side Body Agent:** [`lib/bodyAgent.ts`](./lib/bodyAgent.ts) — Generates swarm lines from operator file for platform dwell decisions.
* **Per-Trip Symptom Integration:** [`app/(tabs)/index.tsx`](./app/(tabs)/index.tsx) — Symptoms collected before each walk, fed to AI agents.

</details>

---

## 🏗️ Architecture

```text
    [USER / iPhone]
        │
        │ (Fill health profile + pick route + report symptoms)
        ▼
  ┌───────────────────────┐
  │   Expo React Native   │
  │   (Walk Flow UI)      │◄──── SecureStore (HealthProfile)
  └───────────────────────┘
        │
        │ POST /v1/swarm  { operator: { health + trip } }
        ▼
  ┌───────────────────────┐      ┌──────────────────┐
  │   FastAPI Backend     │─────▶│  FortyGuard API  │
  │   (Swarm Orchestrator)│      │  (Live 2m Air)   │
  └───────────────────────┘      └──────────────────┘
        │
        │ Groq LLM Tool-Calling
        ▼
  ┌─────────┐  ┌─────────┐  ┌─────────┐
  │  Meteo  │  │  Body   │  │  Infra  │
  │  Agent  │  │  Agent  │  │  Agent  │
  └─────────┘  └─────────┘  └─────────┘
        │           │             │
        └───────────┴─────────────┘
                    │
                    ▼
          ┌──────────────────┐
          │   BodyVerdict    │
          │ ok|watch|indoor  │
          └──────────────────┘
                    │
                    ▼
          [Coolest Route + Briefing + Walk Guidance]
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo SDK 57, expo-router, react-native-maps |
| Web | Expo Web (React Native Web) — deployed on **Vercel** |
| Auth | Supabase (Google OAuth) + expo-secure-store |
| Backend | Python FastAPI + Uvicorn — deployed on **Heroku** |
| AI | Groq LLM (Llama) with structured tool-calling |
| Data Source | FortyGuard API — live 2 m air temperature grid |
| Map Tiles | Google Maps + custom thermal overlay |

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

<p align="center">
  <b>Built with 🔥 for FortyGuard Hackathon '26</b><br>
  <i>ThermalGuard — because the walk is a rounding error, dwell is the dose.</i>
</p>

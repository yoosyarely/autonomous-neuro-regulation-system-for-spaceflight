# Autonomous Neuro-Regulation System for Spaceflight

**Mental stability light-minutes from home.**

Built for **NASA Space Apps Challenge 2026 (Hermosillo)** — Challenge: *"Create Health Monitoring Software for Astronauts on Space Missions."*

## Overview

On a deep-space mission to Mars, one-way light-time communication delays reach 4–22 minutes (and solar conjunction can interrupt reliable links for days). Mission Control in Houston cannot intervene in real time during early signs of astronaut anxiety or acute stress.

This 100% static web prototype demonstrates an **onboard autonomous neuro-regulation console** that detects early multi-signal stress deviations, activates private onboard countermeasures (paced breathing, tactile/pressure regulation, and cognitive grounding), and escalates to crew/Houston **only** when critical red-level criteria are met—without ever transmitting private voice logs or journal text.

> Prototype. Crew data is simulated. Not a medical device.

## NASA Data vs. Simulated Data

### Real NASA Data
- **Earth–Mars Light Delay & Solar Conjunction Geometry (`JPL Horizons`):**
  Daily ephemeris for Mars (`499`) as observed from Earth (`500@399`) from `2026-11-15` to `2029-01-15` (`delta`, `1-way_down_LT` in minutes, and `S-O-T` Sun–Earth–Mars elongation angle in degrees). Because `ssd.jpl.nasa.gov` does not send `Access-Control-Allow-Origin` headers for browser requests, `scripts/fetch-nasa.mjs` fetches the verified JPL Horizons series into `public/nasa-snapshot.json`.
- **Recent Solar Activity Context (`NASA DONKI`):**
  30-day space-weather event counts (`SEP` and `GST` feeds). The browser attempts a live DONKI check with a 5-second timeout (cached in `sessionStorage`) and falls back to `public/nasa-snapshot.json` if offline or rate-limited. *(Note: during integration testing on 2026-11-15, `DONKI/FLR` returned HTTP 404 and is handled gracefully as unavailable).*
- **Link Status Thresholds:**
  - `≤ 2°` Sun–Earth–Mars angle: *No reliable link (solar conjunction)*
  - `> 2° and ≤ 4°`: *Degraded link*
  - `> 4°`: *Nominal link*

### Simulated Data
- **Crew Telemetry & Neuro-Regulation Engine:**
  All 7 crew signals (HRV RMSSD, resting heart rate, respiration rate, skin conductance / GSR, sweat cortisol, sleep hours, and cognitive score), self-report moods, voice log timestamps, and countermeasure physiological responses are simulated locally in `src/engine.ts`.

## Running Locally

**Prerequisites:** Node.js 20+

```bash
npm install
npm run dev
```

### Other Commands

- `npm test` — Run Vitest unit tests for all traffic-light and link-status rules
- `npm run lint` — Run TypeScript type-checking (`tsc --noEmit`)
- `npm run build` — Build static production bundle into `dist/`
- `npm run fetch-nasa` — Refresh `public/nasa-snapshot.json` from JPL Horizons & NASA DONKI

## Deployment

### Cloudflare Pages (Primary)
- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Build output directory:** `dist`

### GitHub Pages (Backup)
A ready-to-use workflow is included at `.github/workflows/deploy.yml` (with `base: './'` in `vite.config.ts`). Enable **Settings → Pages → Source: GitHub Actions** and push to `main`.

## Sources & References

1. **NASA/JPL Horizons System** — Ephemeris API (`COMMAND='499'`, `CENTER='500@399'`, `QUANTITIES='20,21,23'`): https://ssd-api.jpl.nasa.gov/doc/horizons.html
2. **NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information)** — `https://api.nasa.gov`
3. McBrayer, Chai & Judd, NASA Langley (2022), *NTRS 20220013418*, and NASA *"Mars Communications Disruption and Delay"* (2° solar conjunction threshold; S-band < 4°, X-band < 2.3°, Ka-band < 1°).

## Author

- **Yoselin Yarely Alcala Martinez** — *Universidad Tecnológica de Hermosillo (UTH)*, *Escuelita de Ingenieros*

## AI Use Disclosure

- Application code and verification tests were generated with **Google AI Studio** and **Antigravity**.
- Research and planning support was provided with **Claude**.
- Concept, problem framing, clinical/operational rules, and design decisions were created by the author.

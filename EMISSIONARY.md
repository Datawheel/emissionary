# EMISSIONARY — Build Specification

**A carbon-intuition guessing game for the OEC (Observatory of Economic Complexity)**

This document is a complete build specification intended as a prompt for Claude Code. Read it fully before writing code. Where a decision is not specified, prefer the simplest implementation that preserves the data model and scoring semantics defined here.

---

## 1. Concept

Emissionary tests and trains people's intuition about everyday CO₂ emissions through pairwise comparisons. Each round shows a **clue** (e.g., "10 minutes of a hairdryer") and asks the player to guess the **equivalent** amount of a second activity (e.g., "how many hours of a refrigerator emit the same CO₂?"). After guessing, the player sees the true answer, how it was computed, how their guess scored, and — the signature reveal — how the same comparison changes across countries, because electricity emissions depend on each country's energy mix (France ≈ 45 gCO₂/kWh vs. Poland ≈ 640 gCO₂/kWh).

The game is:
- **Individual play, shared scoreboard** — players compete asynchronously on daily and all-time leaderboards.
- **Mobile-first** — one screen per round, thumb-friendly slider input, no typing required to play.
- **Zero-friction entry** — players play anonymously first; a scoreboard name is requested only after they are invested (see §10).
- **Pedagogically honest** — every answer ships with its full computation and cited assumptions ("show your work" panel), in the same spirit as the OEC World Trade Cup's methodological transparency.

**Tagline direction:** "Spread the word about emissions." (Emissionary = emission + missionary.)

**Scope statement (display this in the About page and answer reveals):** All figures are *use-phase (operational) emissions only* — the energy consumed while using a product, multiplied by the emission factor of the energy source. Manufacturing, embodied carbon, and end-of-life are explicitly out of scope. Figures are transparent approximations based on typical products and cited emission factors; the game teaches orders of magnitude, not lab-grade precision.

---

## 2. Glossary (use these terms consistently in code, UI, and analytics)

| Term | Meaning |
|---|---|
| **Item** | A product/activity with a defined energy model (e.g., hairdryer, gas hob boiling 1 L, petrol car per km). |
| **Round** | One comparison: a fixed clue quantity of Item A vs. an unknown quantity of Item B. |
| **Guess** | The player's submitted value for the unknown quantity. |
| **Game** | A set of rounds played in sequence. The **Daily Game** is a fixed 5-round set shared by all players for a given UTC date. **Free Play** is an endless stream of procedurally selected rounds. |
| **Country setting** | The player's selected country, which determines the electricity grid intensity and local defaults (car fleet average) used to compute truths. |
| **Truth** | The server-computed correct answer for a round in a given country. |

---

## 3. Emissions model (the physics core)

Everything reduces to: **emissions = energy consumed × emission factor of the energy carrier.**

### 3.1 Electric items

```
CO2_grams = P_watts × t_hours / 1000 × grid_gCO2_per_kWh(country, year)
```

For items defined by energy-per-event rather than power (washing machine cycle, EV per km), use the per-event kWh directly.

### 3.2 Fuel-burning items

```
CO2_grams = fuel_energy_kWh_thermal × fuel_gCO2_per_kWh_thermal
```

Fuel combustion factors are country-invariant (chemistry, not geography). Use IPCC default combustion factors:

| Fuel | Factor | Notes |
|---|---|---|
| Natural gas | ~202 gCO₂/kWh thermal (56.1 kgCO₂/GJ) | direct combustion only |
| LPG/propane | ~227 gCO₂/kWh thermal | |
| Petrol | 2.31 kgCO₂/L | tailpipe only |
| Diesel | 2.68 kgCO₂/L | tailpipe only |

State in the methodology page that upstream (well-to-tank) emissions are excluded for both fuels and electricity generation fuel supply — we use combustion factors for fuels and generation-based grid intensity for electricity, and we say so.

### 3.3 Tasks with a thermodynamic anchor

Some rounds are defined by a *task* (e.g., "boil 1 L of water from 20 °C") rather than a duration. Compute the useful energy from first principles, then divide by device efficiency:

```
E_useful = m × c × ΔT        (1 L water, 20→100 °C: 4.186 kJ/kg·K × 80 K ≈ 335 kJ ≈ 0.093 kWh)
E_consumed = E_useful / efficiency
```

Reference efficiencies (store per item, cite sources in the data file):

| Device | Efficiency |
|---|---|
| Electric kettle | ~85% |
| Induction hob | ~85–90% |
| Electric resistive hob | ~74% |
| Gas hob | ~40% |
| Microwave (heating water) | ~50% |

This makes the flagship round possible: *boiling 1 L on a gas hob vs. an electric kettle* flips winner by country — in France the kettle wins by ~8×, in Poland gas wins. Feature this comparison in onboarding and marketing.

### 3.4 Transport

- **Petrol/diesel car:** default per-country fleet-average tailpipe gCO₂/km (see §5). Fallback: 160 gCO₂/km.
- **EV:** kWh/km × grid intensity (default 0.17 kWh/km).
- Round phrasing uses distances people know: "10 km round trip to the supermarket."

### 3.5 Rounding and display

- Compute truths in full precision server-side; display rounded to 2 significant figures.
- Display CO₂ in grams below 1,000 g, kilograms above.
- Include one relatable equivalence per reveal (e.g., "≈ 40 smartphone charges") drawn from a small lookup table.

---

## 4. Data layer

### 4.1 Items database (curated JSON, version-controlled)

Do **not** integrate an external appliance API. Build a curated, hand-checked file `data/items.json` of **60–100 items**. Every item carries its assumptions and a citation. Schema:

```json
{
  "id": "hairdryer",
  "name": { "en": "Hairdryer", "es": "Secador de pelo" },
  "emoji": "💨",
  "category": "personal_care",
  "energy_model": "power",            // power | per_event | task | per_km
  "power_watts": 1800,                 // if power
  "kwh_per_event": null,               // if per_event (e.g., dishwasher cycle)
  "event_noun": null,                  // e.g., "cycle", "load"
  "task_kwh_useful": null,             // if task (thermodynamic anchor)
  "efficiency": null,                  // if task
  "carrier": "electricity",            // electricity | natural_gas | lpg | petrol | diesel
  "kwh_per_km": null,                  // if per_km electric
  "uses_country_car_default": false,   // if per_km fuel car
  "typical_unit": "minutes",           // natural unit for guesses: minutes | hours | events | km | liters_boiled
  "assumption_note": { "en": "Typical 1800 W consumer hairdryer on high setting." },
  "source": "…citation URL or reference…",
  "difficulty": 2                      // 1–3, used by round selection
}
```

Seed the database with at least these items (verify each value and cite a source when building the file; the numbers below are good working defaults):

- **Kitchen:** electric kettle (task, 85%), induction hob (task, 88%), resistive hob (task, 74%), gas hob (task, 40%), microwave 1200 W, oven (electric) 2.0 kWh/hour of use at 200 °C, gas oven, dishwasher 1.0 kWh/cycle, refrigerator (modern, 250 kWh/yr → ~28.5 W average), chest freezer, coffee machine (espresso ~ per event), toaster 1000 W.
- **Climate & home:** split AC 1.2 kW electrical input, electric space heater 2000 W, gas boiler heating (per kWh thermal), heat pump (COP 3.5 → 0.29 kWh electric per kWh heat), ceiling fan 60 W, dehumidifier 300 W.
- **Personal:** hairdryer 1800 W, electric shower 9.5 kW, hair straightener 100 W, electric toothbrush (negligible — fun for order-of-magnitude rounds), washing machine 0.8 kWh/cycle, tumble dryer 2.5 kWh/cycle, iron 1400 W.
- **Electronics:** 55" LED TV 90 W, laptop 50 W, gaming PC 350 W, game console 150 W, smartphone charge 0.012 kWh/event, Wi-Fi router 8 W, LED bulb 8 W, incandescent bulb 60 W.
- **Transport:** petrol car per km (country default), diesel car per km, EV 0.17 kWh/km, e-bike 0.01 kWh/km, motor scooter (petrol), city bus per passenger-km (optional, flag assumption).

### 4.2 Country factors (`data/country_factors.json` + DB table)

- **Grid intensity:** yearly gCO₂/kWh per country from **Ember** (open data, CC-BY, ~200 countries; latest yearly values). Write an ingestion script `scripts/update_country_factors.py` that pulls Ember's latest yearly electricity data and regenerates the file; commit the generated data so the app never depends on Ember at runtime. Working reference values (verify against latest Ember release at build time): Norway ~30, Sweden ~40, France ~45, Brazil ~100, Spain ~150, UK ~210, Germany ~340, US ~380, Japan ~480, Australia ~550, China ~560, Poland ~640, India ~700, South Africa ~700.
- **Car fleet average tailpipe gCO₂/km:** per-country where available (EEA for EU member states, ICCT/IEA elsewhere); fallback 160 g/km. Store alongside grid intensity with per-field source and year.
- **Pinned comparison countries** for the conversion table (§9): France, Germany, Poland, Norway, USA, China, India, Brazil — plus the player's own country, always listed first.

Every factor row: `{ iso3, name, grid_gco2_kwh, grid_year, car_gco2_km, car_year, sources }`.

### 4.3 Data provenance — the source registry (defensibility layer)

Every number in the game must trace to a named, citable source. Implement this as a first-class structure, not as comments:

1. **`data/sources.json`** — a registry of allowed sources. Each entry: `{ source_id, publisher, title, year, url, license, retrieved_at }`. No item or factor may cite a source that is not in this registry.
2. Every field in `items.json` that carries a physical value (`power_watts`, `kwh_per_event`, `efficiency`, `kwh_per_km`) must reference a `source_id`. The build must **fail CI** if any value lacks a source reference.
3. **`data/SOURCES.md`** — a human-readable methodology appendix, auto-generated from the registry, linked from the game's About/Methodology page. This is what you point critics and journalists to.

Approved source stack (seed the registry with these):

| Domain | Primary source | Why it's defensible |
|---|---|---|
| Grid intensity | **Ember Yearly Electricity Data** — ~215 countries, gCO₂/kWh, CC-BY 4.0, updated twice monthly | Open license, global coverage, standard reference; also republished by Our World in Data |
| Fuel combustion & activity factors | **UK Government (DESNZ/DEFRA) GHG Conversion Factors for Company Reporting** — updated annually with a published methodology paper; **IPCC 2006 Guidelines (2019 refinement)** default combustion factors | The DESNZ factors are the de facto standard in corporate carbon accounting worldwide, Open Government Licence, and give per-fuel factors in kWh/liters/kg with full derivation |
| EU appliance consumption | **EPREL** (European Product Registry for Energy Labelling) — public EU database of >1M registered models with regulated, supplier-declared consumption values; public API available (aggregation permitted with added value, raw resale prohibited) | Values are measured under harmonized EN test standards and legally binding; ideal for fridges (kWh/yr), washers/dishwashers (kWh/cycle), TVs, ovens |
| US appliance consumption | **ENERGY STAR certified product datasets** and **US DOE Energy Saver / Appliance Standards** technical documents | Public, test-procedure-based |
| Cooking efficiencies | **US DOE / LBNL Technical Support Document for Residential Cooking Products** (gas ~40%, electric coil ~74%) and **DOE Appliance Standards Program** induction measurements (~84%); FSTC/EPRI lab tests as corroboration | These are the canonical measured values, repeatedly cited in the efficiency literature |
| Car fleet averages | **EEA** (CO₂ from new passenger cars, EU), **ICCT / IEA** elsewhere; document clearly whether a value is new-car or fleet average | Official monitoring data under EU regulation |
| EV consumption | **EPA fuel economy ratings** (US) / **WLTP figures**; ev-database.org as a secondary cross-check only | Regulated test values |
| France cross-check | **ADEME Base Empreinte (Base Carbone)** | Useful independent validation of factors, and strategically wise given the OEC/CCL's French institutional context |
| Physics constants | Specific heat of water etc. — any standard reference (CODATA / engineering handbook) | Uncontested |

**Rules of engagement:**
- Prefer *regulated or test-procedure-based* values (EPREL, ENERGY STAR, DESNZ, EEA) over manufacturer marketing claims or blog aggregations. Never cite a blog, a retailer page, or an LLM's memory as a source.
- Where a product category spans a range (hairdryers 1200–2200 W), pick the **median of a named dataset** (e.g., median of EPREL category, or the DOE representative unit), state the range in `assumption_note`, and cite the dataset.
- Each source value stores its **reference year**; the reveal panel shows it ("grid intensity: France, 2025, Ember").
- Where fuels are compared with electricity, apply a consistent boundary on both sides — combustion-only for fuels, generation-based grid intensity for electricity — and say so in the methodology page. (DESNZ publishes separate well-to-tank factors; excluding them on both sides keeps the comparison symmetric and simple. Adding WTT on both sides is a possible v2 toggle, not a v1 feature.)

### 4.4 Validation suite (`scripts/validate_data.py`, run in CI)

- Every physical value has a `source_id` present in the registry.
- Every item's implied emissions fall within a sanity band (e.g., no household item outside 1 g–100 kg CO₂/hour in any country) — catches unit errors (W vs kW, Wh vs kWh) which are the most likely failure mode.
- Cross-checks: kettle vs. induction vs. gas boiling 1 L must reproduce the known ordering and approximate ratios; EV vs. petrol car must flip or narrow across the grid-intensity range as expected.
- Every country in the pinned list has current-year factors; every factor year is within 3 years of today.

---

## 5. Country setting

- On first load, suggest a country via IP geolocation (or the OEC's existing locale detection), but require one tap to confirm — never silently assume. Selection is a searchable list with flags, stored per player and changeable anytime from the header.
- The country setting determines: grid intensity used for electric items, car fleet default, and which country appears first in conversion tables.
- Changing country mid-Daily-Game is disallowed (locks when round 1 is submitted); it is always allowed in Free Play.
- Knowing your country's grid intensity **is part of the skill**. Scoring is accuracy-relative (log-ratio), so leaderboard scores remain comparable across countries; show the player's country flag next to their name on leaderboards.

---

## 6. Round types and core loop

### 6.1 Round type A — Binary warm-up ("Which emits more?")

Two cards, one tap. E.g., "30 min of gaming PC" vs. "5 min of electric shower." Used as round 1 of every Daily Game and interleaved in Free Play (~1 in 4). Purpose: zero-friction first interaction on mobile.

### 6.2 Round type B — Quantitative equivalence (the core mechanic)

- **Clue card:** fixed quantity of Item A ("10 minutes of hairdryer 💨 in France 🇫🇷").
- **Question:** "How many *hours of refrigerator* emit the same CO₂?"
- **Input:** a **logarithmic slider** spanning the plausible range for that round (server provides `min`, `max`, both at least 10× away from truth where possible). Large live readout of the current value in the item's natural unit. Optional numeric entry via a small "type instead" affordance for precision players; slider is the default and must be fully usable one-thumbed.
- The player never sees any CO₂ number before submitting — only the two activities.

### 6.3 Round selection rules

- Never pair two items whose carrier and model make the answer trivial (e.g., two pure-power electric items differing only in wattage is fine at difficulty 1, but avoid identical items).
- At least 2 of the 5 daily rounds must be **cross-carrier** (electricity vs. fuel), because these are the rounds where country matters and the conversion table shines.
- Clue quantities should keep truths within human-scale answers (roughly 30 seconds to 1 month in the target item's natural unit). Precompute and validate this when generating sets.
- Difficulty ramps within a Daily Game: rounds 1→5 easy→hard.

---

## 7. Scoring

Let `g` = guess, `t` = truth (both > 0), and `e = |log10(g / t)|`.

```
if e <= log10(1.1):            # within ±10%
    score = 100
else:
    score = max(0, round(100 * (1 - e) / (1 - log10(1.1))))
```

Properties: 100 points within ±10% of truth; continuous decay; 0 points at 10× off in either direction; symmetric in log space (guessing 3× too high costs the same as 3× too low). Binary rounds: 50 points correct, 0 incorrect.

- **Daily Game total:** sum of round scores (max 450 for 1 binary + 4 quantitative). Tiebreak: total time elapsed across rounds (store per-round `ms_elapsed`, but do **not** use speed in scoring itself — this is a thinking game).
- **Free Play:** rolling accuracy metrics — average score per round, current streak (consecutive rounds ≥ 80), best streak, lifetime rounds played.
- Show score change with a satisfying but restrained animation; display the log-error visually as a distance on the same slider the player used.

---

## 8. Daily Game and Free Play

### 8.1 Daily Game

- One 5-round set per UTC date, identical for all players worldwide, generated deterministically from a seeded PRNG (`seed = hash(secret_salt + date)`) over the item database with the §6.3 constraints, then persisted to `daily_sets` — generate at first request and cache; never regenerate.
- One attempt per player per day. After completion: results screen with total score, percentile among today's players, share card (§11), and the day's leaderboard.
- Countdown to next Daily Game on the completion screen.
- Truths are computed in the player's country; the results screen shows how the same set would score-out in other countries via the conversion table.

### 8.2 Free Play

- Endless rounds, drawn to avoid repeats within the last 30 rounds per player, difficulty adapting mildly to recent accuracy.
- Feeds a separate **weekly Free Play leaderboard** ranked by average score over best N=20 rounds that week (prevents grinding volume from dominating).

---

## 9. The reveal screen (after every guess)

Order, top to bottom:

1. **Result:** truth vs. guess shown on the log slider scale; points earned; running total.
2. **"How we computed this"** (collapsed accordion, one tap): the full arithmetic for both items — power/energy, efficiency, carrier factor, grid intensity with country and year, and the assumption note + source link for each item. This is the game's credibility armor; never ship a truth the panel cannot fully derive.
3. **Country conversion table:** the same comparison recomputed for the player's country + the pinned eight (§4.2), sorted by answer value, player's country highlighted, each row: flag, country, equivalence (e.g., "🇫🇷 France — 14 h of fridge", "🇵🇱 Poland — 2 h of fridge"), with a compact bar visualization. One-line takeaway generated from the data (e.g., "In Norway this hairdryer session is 20× cleaner than in India."). "See all countries" expands the full list.
4. **Relatable equivalence** one-liner (§3.5).
5. **Next round** button, fixed to the bottom, thumb-reachable.

---

## 10. Identity, anonymity, and the shared scoreboard

- On first visit, mint a UUIDv4 player id, store in `localStorage` (plus cookie fallback), and register it server-side. No account or email is ever *required*; an optional "Sign in with OEC" (§15.4) exists for players who want a persistent cross-device identity.
- The player can complete **one full Daily Game or 3 Free Play rounds** before any identity prompt. Then show a single, dismissible prompt: "Claim your place on the leaderboard" with a name field pre-filled by a generator (Adjective+Animal, e.g., "CuriousOtter", regenerate button). Dismissing keeps them anonymous ("Anonymous 🦊" on their own screens, excluded from public boards) and re-offers only via a subtle leaderboard CTA — never a modal again.
- Names: 3–20 chars, unicode-friendly, uniqueness enforced by appending #NNNN discriminator when taken, server-side profanity/impersonation filter, one rename allowed per 30 days.
- **Leaderboards:** Today (Daily Game scores), This Week (Free Play, best-20 average), All Time (cumulative Daily points). Each filterable by country. Show the player's own row pinned even when off-screen. Paginate; never load thousands of rows on mobile.

---

## 11. Share mechanic

Wordle-style copy-to-clipboard text (and native share sheet on mobile):

```
Emissionary #142 🇫🇷 412/450
🟩🟩🟨🟩🟧
emissionary.oec.world
```

Square per round by score: 🟩 ≥ 90, 🟨 ≥ 70, 🟧 ≥ 40, 🟥 < 40. No spoilers (never include the items or answers). Number is days since launch date constant.

---

## 12. Anti-cheat and integrity

- Truths are computed **exclusively server-side**. The client receives only item descriptions, units, and slider bounds before a guess. The reveal payload (truth, breakdown, conversion table) is returned only in the response to the guess submission.
- One guess per (player, round); enforce idempotency server-side.
- Rate-limit guess submissions and player creation per IP. Reject guesses outside slider bounds ×10.
- Daily leaderboard entries require all 5 rounds completed in one session window (≤ 2 h).
- Accept that determined cheaters exist; the goal is that casual cheating is inconvenient, not that the system is bulletproof.

---

## 13. Research telemetry (important)

Log every guess with: item pair and quantities, country, truth, guess, log-error (signed), round type, ms_elapsed, player id, timestamp. This corpus is a research asset on **collective miscalibration of emission perceptions** — which activities people systematically over/underestimate, by how much, and whether it varies by country. Build a public `/stats` page in the spirit of the World Trade Cup stats page: aggregate calibration curves per item and per pair (median signed log-error), participation counts, and the "most misjudged comparisons" ranking. Design the schema so this analysis is a SQL query, not an ETL project.

---

## 14. Mobile-first UX requirements

- **One round per screen.** No scrolling required to play a round on a 375×667 viewport; the reveal screen may scroll.
- All primary actions reachable by right thumb: slider in the lower half, submit/next as a full-width bottom bar.
- Big type for the live guess readout (it is the emotional center of the round). Item cards use emoji + name, not photos — fast, consistent, no licensing issues.
- First contentful paint < 1.5 s on mid-range mobile; the app must be playable as a PWA (manifest + offline shell; guesses still require network).
- Respect `prefers-reduced-motion`; visible keyboard focus states; slider operable via keyboard and screen reader (`role="slider"` with proper aria values announcing the readout).
- Visually align with the **OEC design language** (typography, color feel, header/footer conventions) so Emissionary reads as part of the OEC family — but implement everything **within Emissionary's own package**; do not import components from the WTC or other OEC games. One signature visual element is allowed and encouraged: the log-scale slider/reveal, where guess and truth appear as markers on the same axis — make that moment distinctive and reuse its visual grammar in the conversion table bars and the /stats calibration charts.
- Language: EN and ES at launch (all strings through the OEC's existing i18n mechanism; item names/notes are localized in `items.json`).

---

## 15. Architecture

**Emissionary is a fully independent application: its own repository/folder, its own package, its own database schema, its own deployment.** It shares **no code, tables, or runtime dependencies** with the World Trade Cup or any other OEC game. The **only** integration point with the OEC platform is authentication: players may optionally sign in with their existing OEC account (see §15.4). Do not import WTC components, reuse WTC tables, or couple deployments; when in doubt, duplicate rather than share. Target URL: `emissionary.oec.world` or an equivalent path (confirm with the OEC team). The specifics below are stack-agnostic contracts; choose a boring, well-supported stack and keep the whole app self-contained so it can be developed, tested, and deployed without touching any other OEC codebase.

### 15.1 API (server-authoritative)

```
POST /api/player                  → create anonymous player {uuid} → returns player token
POST /api/player/name             → claim/change name
GET  /api/auth/oec/login          → begin optional OEC sign-in (redirect flow)
GET  /api/auth/oec/callback       → complete sign-in; merge anonymous player into OEC-linked player
GET  /api/config                  → countries list, pinned countries, item metadata (no factors)
GET  /api/daily                   → today's round descriptions + slider bounds + player's progress
POST /api/guess                   → {round_id, value, ms_elapsed} → {truth, score, breakdown, conversion_table, totals}
GET  /api/freeplay/next           → next Free Play round for this player
GET  /api/leaderboard             → params: scope=daily|weekly|alltime, country?, cursor
GET  /api/stats/...               → aggregates for the public stats page
```

### 15.2 Database schema (minimum)

```
players(id uuid PK, name text NULL, name_discriminator int NULL, country iso3,
        oec_user_id text NULL UNIQUE,       -- set only when linked via OEC login
        created_at, last_seen_at, renamed_at NULL)
items(id text PK, payload jsonb, version int)
country_factors(iso3 PK, grid_gco2_kwh numeric, grid_year int,
                car_gco2_km numeric, car_year int, sources jsonb)
daily_sets(date date PK, rounds jsonb, seed text)
rounds(id PK, set_date date NULL,           -- NULL for free play
       item_a text, qty_a numeric, item_b text, round_type text, difficulty int)
guesses(id PK, player_id FK, round_id FK, country iso3,
        guess numeric NULL, choice text NULL,     -- choice for binary rounds
        truth numeric, signed_log_error numeric, score int,
        ms_elapsed int, created_at,
        UNIQUE(player_id, round_id))
```

Leaderboards are indexed queries or materialized views over `guesses`; do not maintain separate mutable score tables.

### 15.3 Emissions engine

A single pure module (`lib/emissions.ts` or equivalent): `computeCO2(item, quantity, countryFactors) → { grams, breakdown }` and `solveEquivalent(itemA, qtyA, itemB, countryFactors) → { qtyB, breakdownA, breakdownB }`. **All truths, breakdowns, and conversion tables come from this one module.** Unit-test it against hand-computed fixtures, including the boiling-water flagship in France, Poland, and Norway.

### 15.4 OEC login (the only OEC integration)

- Signing in is always **optional** — the anonymous flow in §10 is the primary path and must never be blocked behind login.
- Integrate the OEC's existing auth as an OAuth/OIDC-style flow (confirm the exact mechanism — endpoint, token format, user-id claim — with the OEC team; treat it as an external identity provider). Emissionary stores only the stable OEC user id and, with consent, the OEC display name as the default leaderboard name.
- On sign-in, **merge** the current anonymous player into the OEC-linked player (carry over scores, streaks, and history; the UNIQUE(player_id, round_id) constraint governs conflicts — keep the earlier guess).
- Benefits of signing in (communicate these, don't nag): leaderboard identity that survives clearing the browser, and play history across devices. Nothing else is gated.
- If the OEC auth service is unavailable, the game degrades gracefully to anonymous-only.

---

## 16. Build milestones (implement in this order)

1. **M1 — Core loop, local:** items database (first 40 items, cited), emissions engine + tests, quantitative round UI with log slider, scoring, reveal with breakdown and conversion table, hardcoded country. Playable locally end to end.
2. **M2 — Server & identity:** API, DB, anonymous players, server-side truths, Free Play stream, binary rounds, country selector.
3. **M3 — Daily Game & social:** deterministic daily sets, one-attempt enforcement, leaderboards (all three scopes + country filter), name claiming flow, share card, countdown.
4. **M4 — Polish & launch:** remaining items to 60–100, ES localization, /stats page, PWA, methodology/About page, OEC login + anonymous-account merge (§15.4), accessibility pass, rate limiting, Ember ingestion script, deploy as its own standalone service.

### Acceptance criteria (spot-check before calling any milestone done)

- Boiling 1 L: kettle beats gas hob by ~8× in France; gas hob wins in Poland. The reveal panel derives both numbers fully.
- A guess exactly equal to truth scores 100; a guess 10× off scores 0; 2× off scores ~66.
- With devtools open, no truth value is observable before a guess is submitted.
- A brand-new player on a phone reaches their first reveal in ≤ 3 taps + 1 slider drag from the landing page, without entering any text.
- Daily set for a given date is byte-identical across requests and servers.
- The same Daily Game played with country = France vs. Germany produces different truths but the identical item pairs.

---

## 17. Out of scope (v1)

Lifecycle/embodied emissions; user-submitted items; multiplayer or head-to-head modes; accounts, email, or push notifications; native apps; monetization; per-region electricity (subnational grids); real-time grid intensity (yearly averages only).

---

## 18. Open questions to resolve with the OEC team during M1

- Final URL and how Emissionary is linked from OEC navigation.
- OEC auth mechanism details: protocol, endpoints, token format, stable user-id claim, and whether display name can be shared with consent.
- Launch-day constant for the share-card day counter.

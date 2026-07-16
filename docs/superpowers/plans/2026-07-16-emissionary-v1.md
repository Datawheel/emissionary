# Emissionary v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Emissionary — a mobile-first carbon-intuition guessing game with a research-verified data layer, server-authoritative truths, Daily Game + Free Play, and shared leaderboards — through milestone M3 plus the included M4 items, per `docs/superpowers/specs/2026-07-16-emissionary-design.md`.

**Architecture:** Single self-contained Next.js (App Router, TypeScript) app in `/var/www/emissionary`; PostgreSQL 16 via plain `pg` with hand-written SQL migrations; one pure emissions engine module that produces every truth, breakdown, and conversion table; curated version-controlled JSON data with a source registry enforced by a validation script.

**Tech Stack:** Next.js 15, React, TypeScript, PostgreSQL 16, `pg`, `zod` (data validation), `tsx` (script runner), Vitest (unit/API tests), Playwright (mobile smoke).

## Global Constraints

- All figures are use-phase emissions only; combustion-only for fuels, generation-based grid intensity for electricity (spec §1, §3.2).
- Every physical value in `data/` carries a `source_ids` reference resolvable in `data/sources.json`; validation fails otherwise (spec §4.3). No blogs/retailers as sources.
- Truths computed exclusively server-side; client never receives factors or truths before a guess is submitted (spec §12).
- Scoring: `e = |log10(g/t)|`; 100 if `e ≤ log10(1.1)`, else `max(0, round(100·(1−e)/(1−log10(1.1))))`; binary rounds 50/0 (spec §7). 2× off ≈ 73.
- Mobile: one round per screen at 375×667, thumb-reachable actions, `prefers-reduced-motion` respected, slider keyboard/screen-reader operable (spec §14).
- Display: truths rounded to 2 significant figures; grams < 1,000 g, kilograms above (spec §3.5).
- Languages EN + ES; item names/notes localized in `items.json` (spec §14).
- OEC sign-in deferred: `AuthProvider` interface only, OEC implementation stubbed (design §1.3).
- Commit after every task; run `npm test` before every commit.

## File Structure (target)

```
package.json / tsconfig.json / next.config.mjs / .gitignore / .env.example
data/            sources.json, items.json, country_factors.json, equivalences.json, SOURCES.md (generated)
db/migrations/   0001_init.sql ...
db/              migrate.ts
scripts/         update-country-factors.ts, validate-data.ts, generate-sources-md.ts
src/lib/         types.ts, constants.ts, data.ts, emissions.ts, scoring.ts, rounds.ts, format.ts, i18n.ts, db.ts, auth/provider.ts
src/app/         layout.tsx, page.tsx (landing→play), daily/, play/ (free play), leaderboard/, stats/, about/, api/...
src/components/  LogSlider.tsx, ItemCard.tsx, RevealPanel.tsx, ConversionTable.tsx, ShareCard.tsx, CountryPicker.tsx, NamePrompt.tsx
tests/           engine/, api/, e2e/
public/          manifest.webmanifest, sw.js, icons
```

---

# Phase 0 — Research-verified data layer

Everything in Phase 0 must complete before M1's engine tests can use real fixtures. Research tasks (0.4–0.8) use web search/fetch against the approved source stack ONLY (spec §4.3 table). Every researched value is recorded with `source_ids`, the reference year, and an `assumption_note` stating the range and why the chosen value is representative.

### Task 0.1: Toolchain scaffold

**Files:** Create `package.json`, `tsconfig.json`, `.gitignore`, `vitest.config.ts`

**Interfaces — Produces:** `npm test` (vitest run), `npm run validate` (data validation, added in 0.9), `npx tsx scripts/<x>.ts` execution.

- [ ] Step 1: `npm init -y`; install `typescript tsx vitest zod @types/node` as devDependencies (zod as dependency). Set `"type": "module"`, scripts: `"test": "vitest run"`, `"validate": "tsx scripts/validate-data.ts"`.
- [ ] Step 2: `tsconfig.json` — `strict: true`, `module: "ESNext"`, `moduleResolution: "bundler"`, `target: "ES2022"`, `jsx: "preserve"`, paths alias `@/*` → `src/*`.
- [ ] Step 3: `.gitignore` — `node_modules/`, `.next/`, `.env`, `coverage/`.
- [ ] Step 4: Smoke test `tests/engine/smoke.test.ts` (`expect(1+1).toBe(2)`); run `npm test` → PASS. Commit.

### Task 0.2: Data schemas and typed loader

**Files:** Create `src/lib/types.ts`, `src/lib/data.ts`; Test `tests/engine/data.test.ts`

**Interfaces — Produces (consumed by every later task):**

```ts
export type Carrier = 'electricity' | 'natural_gas' | 'lpg' | 'petrol' | 'diesel';
export type EnergyModel = 'power' | 'per_event' | 'task' | 'per_km';
export type Unit = 'minutes' | 'hours' | 'events' | 'km' | 'liters_boiled';

export interface Item {
  id: string;
  name: { en: string; es: string };
  emoji: string;
  category: string;
  energy_model: EnergyModel;
  power_watts?: number;        // model=power
  kwh_per_event?: number;      // model=per_event
  event_noun?: { en: string; es: string };
  task_kwh_useful?: number;    // model=task: useful kWh per unit of task (per liter boiled)
  efficiency?: number;         // model=task: 0–1
  carrier: Carrier;
  kwh_per_km?: number;         // model=per_km, carrier=electricity
  uses_country_car_default?: boolean; // model=per_km fuel car
  typical_unit: Unit;
  assumption_note: { en: string; es: string };
  source_ids: string[];        // every physical value's provenance
  value_year: number;          // reference year of the physical value
  difficulty: 1 | 2 | 3;
}

export interface CountryFactors {
  iso3: string; name: string; flag: string;
  grid_gco2_kwh: number; grid_year: number; grid_source_id: string;
  car_gco2_km: number; car_year: number; car_source_id: string; car_is_fallback: boolean;
}

export interface Source {
  source_id: string; publisher: string; title: string; year: number;
  url: string; license: string; retrieved_at: string; // ISO date
}
```

Zod schemas mirror these types exactly. `data.ts` exports `loadItems(): Item[]`, `loadCountryFactors(): CountryFactors[]`, `loadSources(): Source[]`, each parsing its JSON file through zod (throws on violation), with results memoized.

- [ ] Step 1: Failing test — loader throws on an item whose `source_ids` is empty, accepts a minimal valid fixture.
- [ ] Step 2: Implement types + zod schemas + loaders. Cross-field rules in zod `superRefine`: `power` requires `power_watts`; `task` requires `task_kwh_useful` and `efficiency`; `per_event` requires `kwh_per_event` and `event_noun`; `per_km` requires `kwh_per_km` xor `uses_country_car_default`.
- [ ] Step 3: `npm test` → PASS. Commit.

### Task 0.3: Source registry seed

**Files:** Create `data/sources.json`

- [ ] Step 1: Seed the registry with the approved stack (spec §4.3): `ember_yearly`, `desnz_2025` (GHG conversion factors), `ipcc_2006_v2` (stationary combustion defaults), `eprel`, `energystar`, `doe_energysaver`, `doe_tsd_cooking` (LBNL residential cooking TSD), `doe_induction` (appliance standards induction test data), `eea_new_cars`, `icct` , `iea_ev` / `epa_fueleconomy`, `ademe_base_carbone`, `codata_physics`. Each entry gets the real URL, license, publication year, and `retrieved_at` = date fetched during research. URLs are verified live (fetched) during execution — no dead links.
- [ ] Step 2: Loader test from 0.2 passes over the real file. Commit.

### Task 0.4: Grid intensities — Ember ingestion script

**Files:** Create `scripts/update-country-factors.ts`, `data/country_factors.json`; Test `tests/engine/factors.test.ts`

**Interfaces — Produces:** `data/country_factors.json` — full country list (~200) each `CountryFactors` row; car fields filled with fallback (160 g/km, `car_is_fallback: true`) until Task 0.5.

- [ ] Step 1: Research at execution: locate Ember's yearly CO₂-intensity dataset (Ember data catalogue CSV or API; Our World in Data's `carbon-intensity-electricity` grapher CSV is an acceptable mirror — it republishes Ember and is CC-BY; record whichever endpoint actually used in `sources.json`). Verify reference values within tolerance: France ≈ 21–60, Poland ≈ 550–700, Norway < 50, India > 600 gCO₂/kWh for the latest year.
- [ ] Step 2: Write the script: fetch → parse latest year per country → map to ISO3 + name + flag emoji → merge with any existing car fields → write `data/country_factors.json` sorted by iso3, 2-space indent (byte-stable for diffs).
- [ ] Step 3: Run it; commit generated data. Test asserts: ≥ 150 countries; every pinned country (FRA, DEU, POL, NOR, USA, CHN, IND, BRA) present; every `grid_year ≥ current_year − 3`; France < Germany < Poland ordering holds.

### Task 0.5: Car fleet averages research

**Files:** Modify `data/country_factors.json` (car fields), `data/sources.json` if new sub-sources needed

- [ ] Step 1: Research (web): EEA average CO₂ emissions from new passenger cars per EU member state (note explicitly: new-car figures, WLTP); ICCT/IEA for USA, China, India, Brazil, Norway and other non-EU pinned countries. Where only fleet-wide or only new-car data exists, record which in the note; keep 160 g/km fallback (`car_is_fallback: true`) elsewhere.
- [ ] Step 2: Fill `car_gco2_km`, `car_year`, `car_source_id` for at least the 8 pinned countries + 10 more major economies. Test: no pinned country has `car_is_fallback: true`. Commit.

### Task 0.6: Fuel combustion factors and physics constants

**Files:** Create `src/lib/constants.ts`; Test `tests/engine/constants.test.ts`

**Interfaces — Produces:**

```ts
export const FUEL_GCO2_PER_KWH_THERMAL: Record<Exclude<Carrier,'electricity'|'petrol'|'diesel'>, number>; // natural_gas, lpg
export const PETROL_KGCO2_PER_L: number;   // mineral petrol, tailpipe
export const DIESEL_KGCO2_PER_L: number;
export const BOIL_KWH_PER_LITER: number;   // m·c·ΔT for 20→100 °C ≈ 0.0930 kWh
export const FUEL_SOURCE_IDS: Record<string, string[]>;
```

- [ ] Step 1: Research (web): DESNZ 2025 conversion factors workbook + IPCC defaults; pin natural gas (~202 g/kWh gross thermal), LPG (~227), petrol/diesel per liter (mineral, tailpipe-only — record DESNZ's exact figures, spec's 2.31/2.68 kg/L are the expected magnitudes). Compute `BOIL_KWH_PER_LITER = 1.0 kg × 4186 J/(kg·K) × 80 K / 3.6e6` and cite CODATA/handbook.
- [ ] Step 2: Failing test asserting each constant within a hand-checked band (e.g., natural gas 195–210) and `BOIL_KWH_PER_LITER` ≈ 0.0930 ± 0.0002.
- [ ] Step 3: Implement with researched values; test passes. Commit.

### Task 0.7: Items research fan-out

**Files:** Create `data/items.json` (60+ items), `data/equivalences.json`; Modify `data/sources.json` as needed

Dispatch parallel research agents, one per category, each returning candidate values **only from the approved source stack** with URL + year + representative-value justification. Categories and seed lists exactly as spec §4.1: kitchen (12), climate & home (6), personal (7), electronics (8), transport (6) = 39 seed items; extend within the same categories to reach 60+. Each agent's brief includes the `Item` schema, the approved-source table, and the rules of engagement (median of a named dataset; state ranges in `assumption_note`).

- [ ] Step 1: Dispatch category research agents; collect structured candidates.
- [ ] Step 2: Author `items.json`: cross-check each value against the spec's working defaults — investigate any that differ by >2×; write EN+ES names/notes; assign `difficulty` (1: everyday same-carrier, 2: cross-magnitude, 3: cross-carrier/counterintuitive).
- [ ] Step 3: Author `data/equivalences.json` — small lookup for the relatable one-liner (spec §3.5): `{ id, gco2, label: {en,es} }` for smartphone charge, km driven (petrol, EU new-car), hours of LED bulb, cups of tea boiled. Values derived from items.json entries (no new sources).
- [ ] Step 4: Loader parses the full file (0.2 test suite green). Commit.

### Task 0.8: Validation suite

**Files:** Create `scripts/validate-data.ts`; Test `tests/engine/validate.test.ts`

**Interfaces — Produces:** `npm run validate` exits non-zero with a per-violation report; also exported as `validateData(items, factors, sources): string[]` (list of violations) so tests and CI share the logic.

Checks (spec §4.4, all implemented — none optional):
1. Every `source_ids` entry resolves in the registry; registry URLs non-empty; `retrieved_at` valid dates.
2. Sanity band: for every item × every country, implied gCO₂ per hour of typical use within [0.05 g, 100 kg] (catches W/kW and Wh/kWh unit errors). Per-event and per-km items evaluated at 1 event / 10 km.
3. Cross-checks: boiling 1 L — kettle < induction < resistive < microwave < gas-hob in consumed kWh; in France kettle beats gas hob by 6–10×; in Poland gas hob emits less than kettle. EV (0.17 kWh/km) beats petrol default everywhere grid < 500 gCO₂/kWh; narrows/flips above.
4. Every pinned country present with `grid_year` within 3 years; no pinned country on car fallback.
5. Every item has EN and ES for `name` and `assumption_note`.

- [ ] Step 1: Failing tests with small poisoned fixtures (missing source, kW-as-W error, stale year).
- [ ] Step 2: Implement; run against real data — fix any real data failures found (that's the point). `npm test` and `npm run validate` → PASS. Add `"pretest": "npm run validate"`. Commit.

### Task 0.9: Methodology appendix generator

**Files:** Create `scripts/generate-sources-md.ts`, `data/SOURCES.md` (generated)

- [ ] Step 1: Script renders `SOURCES.md` from the registry + items: one section per source (publisher, title, year, license, URL, retrieved), then a table of every item → value → source(s) → year, then the boundary statement (combustion-only fuels vs. generation-based electricity, spec §4.3 rules). Deterministic output.
- [ ] Step 2: Run, commit generated file. Validation (0.8) gains a check: `SOURCES.md` regeneration is byte-identical to the committed file (catches stale docs).

---

# M1 — Core loop, playable locally

### Task 1.1: Next.js scaffold

**Files:** Create `next.config.mjs`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`; Modify `package.json`

- [ ] Step 1: Install `next react react-dom`; scripts `dev`/`build`/`start`. Hand-write minimal `layout.tsx` (viewport meta, lang from i18n, dark-on-light OEC-ish base: system font stack ≈ OEC's, off-white background, near-black text) and placeholder `page.tsx`.
- [ ] Step 2: `npm run build` succeeds; `npm test` still green (vitest excludes `.next`). Commit.

### Task 1.2: Emissions engine (TDD, the heart)

**Files:** Create `src/lib/emissions.ts`; Test `tests/engine/emissions.test.ts`

**Interfaces — Produces (consumed by API, reveal, conversion table, stats):**

```ts
export interface Breakdown {
  item_id: string; quantity: number; unit: Unit;
  energy_kwh: number;               // consumed energy (thermal for fuels)
  carrier: Carrier;
  factor_g_per_kwh: number;         // grid or fuel factor actually applied
  factor_desc: { country?: string; year: number; source_id: string };
  efficiency?: number;
  grams: number;
  steps: { label_en: string; label_es: string; math: string }[]; // "show your work" lines
}
export function computeCO2(item: Item, quantity: number, cf: CountryFactors): Breakdown;
export function solveEquivalent(itemA: Item, qtyA: number, itemB: Item, cf: CountryFactors):
  { qtyB: number; breakdownA: Breakdown; breakdownB: Breakdown };
```

Quantity semantics: `power` → quantity is in `typical_unit` (minutes or hours), converted to hours internally; `per_event` → events; `task` → liters boiled; `per_km` → km. `solveEquivalent` inverts `computeCO2` for B analytically (all models are linear in quantity).

- [ ] Step 1: Failing fixture tests, hand-computed in the test file with the researched values (comments show the arithmetic): hairdryer 10 min in France; fridge-hours equivalent of that; boil 1 L kettle vs gas hob in FRA/POL/NOR (flagship: assert winner flips, ratio ~6–10× in France); petrol car 10 km vs AC hours in Germany; EV vs petrol in Norway and India. Also: linearity (`computeCO2(item, 2q) = 2·computeCO2(item, q)`), unit display invariants.
- [ ] Step 2: Implement; every step appended to `steps[]` so the reveal panel derives the full computation (spec §9.2 "never ship a truth the panel cannot derive").
- [ ] Step 3: `npm test` → PASS. Commit.

### Task 1.3: Scoring module (TDD)

**Files:** Create `src/lib/scoring.ts`; Test `tests/engine/scoring.test.ts`

**Interfaces — Produces:** `score(guess: number, truth: number): number`, `signedLogError(guess, truth): number`, `scoreBinary(correct: boolean): number`, `shareSquare(score: number): '🟩'|'🟨'|'🟧'|'🟥'`.

- [ ] Step 1: Failing tests: exact → 100; 1.1× → 100; 2× → 73; 10× → 0; 0.5× === 2× (symmetry); 3× high === 3× low; binary 50/0; squares at 90/70/40 boundaries (≥). Guard: non-positive guess/truth throws.
- [ ] Step 2: Implement §7 verbatim. PASS. Commit.

### Task 1.4: Round mechanics — bounds, formatting, selection

**Files:** Create `src/lib/rounds.ts`, `src/lib/format.ts`; Tests `tests/engine/rounds.test.ts`, `tests/engine/format.test.ts`

**Interfaces — Produces:**

```ts
// format.ts
export function formatQty(value: number, unit: Unit, lang: 'en'|'es'): string; // 2 sig figs, natural phrasing ("14 h", "2 h 30 min", "850 g")
export function formatCO2(grams: number, lang: 'en'|'es'): string;             // g < 1000, kg above, 2 sig figs
// rounds.ts
export interface RoundDef { id: string; round_type: 'binary'|'quant'; item_a: string; qty_a: number; item_b: string; difficulty: number; }
export function sliderBounds(truth: number): { min: number; max: number };     // log-symmetric, ≥10× each side where human-scale allows, snapped to clean values
export function selectQuantRound(items: Item[], cf: CountryFactors, rng: () => number, opts: { difficulty: number; excludeItemIds?: string[]; requireCrossCarrier?: boolean }): RoundDef;
export function seededRng(seed: string): () => number;                          // sha256-based mulberry32; deterministic
export function generateDailySet(items: Item[], cf: CountryFactors, date: string, salt: string): RoundDef[]; // 1 binary + 4 quant, ≥2 cross-carrier, difficulty ramp, human-scale truths (30 s–1 month in B's unit) validated at generation
```

- [ ] Step 1: Failing tests: `sliderBounds` spans ≥100× and contains truth off-center; `generateDailySet('2026-07-16', salt)` is deterministic (two calls deep-equal), satisfies all §6.3 constraints across 30 sampled dates, never pairs an item with itself; format cases from spec §3.5.
- [ ] Step 2: Implement. Human-scale check: truth in item B's natural unit within [0.5 min, 43,200 min]-equivalent; regenerate pair (bounded retries) when violated. PASS. Commit.

### Task 1.5: LogSlider component

**Files:** Create `src/components/LogSlider.tsx`; Test `tests/e2e/slider.spec.ts` (deferred to Task 4.6 run, write now)

**Interfaces — Produces:** `<LogSlider min max value onChange unit lang disabled? markers? />` — markers render truth/guess pins post-reveal (the signature visual, reused by ConversionTable bars).

- [ ] Step 1: Implement as a controlled component over a hidden native `<input type=range>` (0–1000 linear) mapped through `value = min·(max/min)^(t/1000)`: native input gives keyboard/screen-reader behavior; ARIA (`aria-valuetext` = formatted readout) announces the mapped value. Big live readout above (the "emotional center", spec §14). Touch target ≥ 44 px; thumb in lower half of viewport.
- [ ] Step 2: Unit-test the log mapping functions (exported pure helpers) in vitest: round-trips, endpoints, monotonicity. Commit.

### Task 1.6: Round screen + reveal (local play, hardcoded country)

**Files:** Create `src/app/play/page.tsx`, `src/components/ItemCard.tsx`, `src/components/RevealPanel.tsx`, `src/components/ConversionTable.tsx`, `src/lib/i18n.ts`

**Interfaces — Consumes:** engine, scoring, rounds, LogSlider. **Produces:** `<RevealPanel truth guess score breakdowns conversionRows equivalence lang />`; `buildConversionRows(itemA, qtyA, itemB, playerCf, allCf): Row[]` (player country first + pinned 8, sorted by answer, bar widths log-scaled).

- [ ] Step 1: Build the round screen per spec §6.2/§14: clue card (emoji + name + quantity + country flag), question line, LogSlider, full-width submit bar. No CO₂ shown pre-submit. One screen, no scroll at 375×667.
- [ ] Step 2: Reveal per spec §9 order: result on the same log axis (guess + truth markers), points; "How we computed this" accordion rendering `Breakdown.steps` + assumption notes + source links + factor year; conversion table with one-line generated takeaway ("In Norway this is N× cleaner than in India" — computed max/min ratio); relatable equivalence; fixed bottom Next button.
- [ ] Step 3: Client-side loop over `selectQuantRound` with country hardcoded to France, session score tally. Manually verify in `npm run dev` on a 375px viewport. Commit. **← M1 checkpoint: playable game.**

---

# M2 — Server, identity, Free Play

### Task 2.1: Database + migrations
Create `db/migrate.ts` (tiny runner: applies `db/migrations/*.sql` in order, records in `schema_migrations`), `db/migrations/0001_init.sql` — spec §15.2 schema verbatim plus `players.is_anonymous bool`, `guesses.created_at` index, and indexes: `guesses(round_id)`, `guesses(player_id, created_at)`, `rounds(set_date)`. Create database `emissionary` + role from `.env` (`DATABASE_URL`); `src/lib/db.ts` exports a `pg.Pool` singleton + `q<T>(sql, params)` helper. Test: migration runner idempotent (re-run = no-op) against a scratch schema.

### Task 2.2: Player identity API
`POST /api/player` mints uuid, inserts anonymous player (country from body, validated ISO3), sets httpOnly signed cookie `emy_player` (uuid + HMAC with `PLAYER_TOKEN_SECRET`); `src/lib/player.ts` `requirePlayer(req)` verifies. `GET /api/config` returns countries (iso3/name/flag only — **no factors**), pinned list, item metadata (id/name/emoji/unit — **no physical values**). Vitest API tests via `next`'s route handlers invoked directly: cookie round-trip, tamper rejection, config payload contains no `grid_gco2_kwh`/`power_watts` keys (truth-leak guard, spec §12).

### Task 2.3: Server-authoritative rounds + guess endpoint
`GET /api/freeplay/next`: selects round via `selectQuantRound`/binary (~1 in 4, spec §6.1) avoiding player's last 30 round item-pairs, difficulty adapting to recent avg score (<60 easier, >85 harder), persists to `rounds`, returns descriptions + slider bounds only. `POST /api/guess`: validates bounds×10, computes truth server-side in player's country, scores, inserts with `ON CONFLICT (player_id, round_id) DO NOTHING` (idempotent — replay returns the stored result), returns `{truth, score, breakdown, conversion_table, totals}`. Tests: idempotency, bounds rejection, no-truth-before-guess, cross-carrier truth changes with country while binary correctness may not.

### Task 2.4: Country selector + wire client to server
`CountryPicker` (searchable, flags, stored via `PATCH /api/player`); suggest via `Accept-Language`/IP header if present, always require one tap to confirm (spec §5). Replace Task 1.6's client-side loop with server round-trip; landing page = country confirm → straight into Free Play (≤3 taps to first reveal). Free Play stats strip: avg score, streak (consecutive ≥80), best streak, lifetime rounds (computed server-side in `totals`).

# M3 — Daily Game and social layer

### Task 3.1: Daily sets
`GET /api/daily`: on first request for a UTC date, `generateDailySet(date, DAILY_SALT)` → persist `daily_sets` + `rounds` in one transaction (advisory lock to prevent double-generation); subsequent requests read persisted set (byte-identical guarantee). Country locks at round-1 guess (store `country` on first daily guess; later guesses use it). One attempt: all 5 rounds ≤ 2 h session window enforced server-side. Completion payload: total, percentile among today's players, countdown seconds to next UTC midnight. Tests: determinism across concurrent first requests, country lock, second-attempt rejection, FRA vs DEU same pairs different truths (acceptance §16).

### Task 3.2: Leaderboards
`GET /api/leaderboard?scope=daily|weekly|alltime&country?&cursor?`: daily = sum of today's set scores (complete sets only); weekly = Free Play avg of best 20 rounds this ISO week (window function); alltime = cumulative daily points. Indexed queries over `guesses` only (spec §15.2), keyset pagination (50/page), player's own row always included (`UNION` pinned row). Leaderboard page UI with scope tabs + country filter + pinned own row; anonymous players excluded from public rows, shown own rank privately.

### Task 3.3: Names and the identity prompt
`POST /api/player/name`: 3–20 unicode chars, `#NNNN` discriminator on collision, profanity/impersonation blocklist (curated list incl. "OEC", "admin"), one rename/30 days (`renamed_at`). `NamePrompt` component: shown once after first completed Daily OR 3rd Free Play round (spec §10 trigger), Adjective+Animal generator with regenerate, dismiss → "Anonymous 🦊" + subtle leaderboard CTA only. Playwright assertion added to smoke: no prompt before trigger point.

### Task 3.4: Share card + countdown
`ShareCard`: builds spec §11 text exactly (day number = UTC days since `LAUNCH_DATE` constant, flag, score/450, five squares via `shareSquare`), `navigator.share` with clipboard fallback, no item names/answers in payload (test asserts). Completion screen: score, percentile, share, countdown timer, today's top-10.

# M4 (included scope) — Polish

### Task 4.1: i18n EN/ES
`src/lib/i18n.ts`: typed `t(key, lang)` over two JSON catalogs; `?lang=` + `Accept-Language` + stored preference; all UI strings through catalogs (grep-gate in validate script: no hardcoded English literals in `src/app`/`src/components` JSX text nodes — enforced by an ESLint-style check in `validate-data.ts` step or a simple script). Item strings already localized in data.
### Task 4.2: About/Methodology page
`src/app/about/page.tsx`: scope statement (spec §1), boundary statement, rendered `SOURCES.md`, scoring explainer, link to spec's tagline. EN/ES.
### Task 4.3: /stats public page
`GET /api/stats/summary`: per-item and per-pair median signed log-error, participation counts, most-misjudged ranking (SQL over `guesses`, spec §13 — no ETL). Page renders calibration bars reusing the log-axis visual grammar. (Consult dataviz skill at implementation for the chart specifics.)
### Task 4.4: PWA + performance
`manifest.webmanifest`, icons, minimal service worker (offline shell for static assets; API always network). Next.js route-level code splitting audit; target FCP < 1.5 s on mid-range mobile (Lighthouse mobile run recorded in the task).
### Task 4.5: Rate limiting + integrity hardening
In-app token-bucket per IP (guest creation 10/h, guesses 30/min) via a small `src/lib/ratelimit.ts` (pg-backed counters — no new infra); daily leaderboard requires 5/5 rounds within session window (already 3.1) — verify; audit every API response for factor leakage with a recursive key check test.
### Task 4.6: Accessibility + Playwright smoke suite
Keyboard-only playthrough; `prefers-reduced-motion` disables score animation; axe-core pass on play + reveal + leaderboard. Playwright (375×667): new player → first reveal in ≤3 taps + 1 drag, no typing; daily determinism e2e; name-prompt timing. Wire `npm run e2e`.
### Task 4.7: Auth stub + deploy readiness
`src/lib/auth/provider.ts`: `AuthProvider` interface (`beginLogin`, `handleCallback`, `mergePlayers(anonId, linkedId)` — merge semantics per spec §15.4, earlier guess wins on conflict) + `NullAuthProvider`. `.env.example`, `README.md` (run, migrate, update factors, deploy notes), production `next build` + `systemd`/`pm2` note. Final full-suite run: `npm run validate && npm test && npm run e2e && npm run build`.

---

## Acceptance gate (before calling v1 done — spec §16 verbatim, corrected)

- Boil 1 L: kettle ~6–10× better than gas hob in France; gas hob wins in Poland; reveal derives both fully.
- Exact guess = 100; 10× off = 0; 2× off ≈ 73.
- Devtools: no truth observable pre-guess.
- New phone player: first reveal ≤ 3 taps + 1 slider drag, zero typing.
- Daily set byte-identical across requests/servers; FRA vs DEU same pairs, different truths.

# Emissionary v1 — Build Design (Decision Record)

**Date:** 2026-07-16
**Status:** Approved by owner (cesifoti) on 2026-07-16
**Normative spec:** [`EMISSIONARY.md`](../../../EMISSIONARY.md) at the repo root. That document defines the game: concept, emissions model, data layer, round types, scoring, identity flow, API contract, database schema, and acceptance criteria. This document records only the decisions the spec left open and the deltas against it. Where this document is silent, EMISSIONARY.md governs.

---

## 1. Decisions

### 1.1 Stack

- **Next.js (App Router, TypeScript)** — one self-contained package holding pages, API route handlers, and the emissions engine. Chosen because it matches the OEC's existing React/Next.js ecosystem, satisfying §14's "reads as part of the OEC family" while staying fully independent per §15.
- **PostgreSQL 16** (already running on the target server) with the plain **`pg`** driver and **hand-written SQL migration files** in `db/migrations/`. No ORM: the schema is 7 small tables and the hot paths (leaderboards, guess idempotency) are clearest as explicit SQL.
- **Node 20** runtime (present on the server). PWA via manifest + service-worker offline shell as required by §14.
- Deployed and developed in `/var/www/emissionary` as its own standalone service (§15).

### 1.2 Data rigor: research-verified from day one

Owner selected the strictest option: **every physical value ships verified with a real citation before the items database is considered done.** Concretely:

- A **Phase 0 research pass precedes game code**: structured web research against the spec's approved source stack (§4.3) — Ember (grid intensities), DESNZ/IPCC (fuel combustion factors), DOE/LBNL (cooking efficiencies), EPREL/ENERGY STAR (appliance consumption), EEA/ICCT/IEA (car fleet averages), ADEME Base Carbone (France cross-check).
- Outputs: `data/sources.json` (source registry), `data/country_factors.json` (grid + car factors with per-field source and year), `data/items.json` (60+ items, every physical field carrying a `source_id`). No value is marked "pending verification."
- The §4.4 validation suite runs in CI and fails the build on any uncited value, sanity-band violation, or stale factor year.

### 1.3 Scope of this build

Build **through M3 plus most of M4**, in the spec's milestone order:

- M1: items DB + emissions engine + tests, quantitative round UI with log slider, scoring, reveal with breakdown and country conversion table.
- M2: API, Postgres, anonymous players, server-side truths, Free Play, binary rounds, country selector.
- M3: deterministic Daily Game, one-attempt enforcement, leaderboards (daily/weekly/all-time + country filter), name claiming, share card, countdown.
- M4 (included): ES localization, methodology/About page with auto-generated `data/SOURCES.md`, `/stats` public calibration page, PWA, rate limiting, Ember ingestion script, accessibility pass.
- M4 (deferred): **OEC sign-in.** Blocked on §18 answers from the OEC team (protocol, endpoints, token format, user-id claim). The code ships an `AuthProvider` interface with the anonymous→linked merge semantics of §15.4 defined but the OEC implementation stubbed, so wiring it later touches one module.

### 1.4 Deltas against EMISSIONARY.md

1. **Scoring acceptance criterion corrected.** §7's formula gives a 2×-off guess `100 × (1 − log10 2) / (1 − log10 1.1) ≈ 73`, not the "~66" stated in §16's acceptance criteria. The formula is kept verbatim; the acceptance value is corrected to **≈ 73**.
2. **Tooling language.** The spec names `scripts/update_country_factors.py` and `scripts/validate_data.py`. Both are implemented in **TypeScript** (`scripts/update-country-factors.ts`, `scripts/validate-data.ts`) so the repository is a single toolchain. Behavior and CI role are unchanged.
3. **Deployment target.** v1 runs on this server; final URL (`emissionary.oec.world` or equivalent) and OEC navigation linkage remain open per §18 and do not block the build.

## 2. Architecture shape

```
/var/www/emissionary
├── EMISSIONARY.md              # normative spec
├── data/                       # curated, version-controlled truth data
│   ├── sources.json            # source registry (§4.3)
│   ├── items.json              # 60+ items, every value cited
│   ├── country_factors.json    # grid + car factors per country
│   └── SOURCES.md              # auto-generated methodology appendix
├── db/migrations/              # numbered .sql files, applied by a tiny runner
├── src/
│   ├── lib/emissions.ts        # the single pure engine (§15.3): computeCO2, solveEquivalent
│   ├── lib/scoring.ts          # §7 formula
│   ├── lib/rounds.ts           # round selection (§6.3), seeded daily generation (§8.1)
│   ├── lib/auth/               # AuthProvider interface; OEC implementation stubbed
│   ├── app/                    # Next.js routes: play, daily, leaderboard, stats, about
│   └── app/api/                # §15.1 endpoints, server-authoritative (§12)
├── scripts/                    # update-country-factors.ts, validate-data.ts, generate-sources-md.ts
└── tests/                      # engine fixtures, API tests, Playwright mobile smoke
```

- **Server-authoritative truths** (§12): truths, breakdowns, and conversion tables are computed only inside API handlers via `lib/emissions.ts`; the client never receives a factor or truth before a guess is submitted.
- **Leaderboards** are indexed queries over `guesses` (§15.2), no mutable score tables.
- **i18n**: EN + ES string catalogs; item names/notes localized inside `items.json`.

## 3. Testing

- **Engine fixtures:** hand-computed expected values, including the flagship boil-1-L comparison in France, Poland, and Norway (kettle wins ~8× in France; gas hob wins in Poland) and EV-vs-petrol crossover across grid intensities.
- **Scoring:** exact = 100; ±10% boundary = 100; 2× off ≈ 73; 10× off = 0; symmetry in log space.
- **API tests:** guess idempotency (UNIQUE player+round), daily-set byte-determinism across requests, no truth leakage in pre-guess payloads, country lock after Daily round 1.
- **Playwright (375×667 viewport):** new player reaches first reveal in ≤ 3 taps + 1 slider drag, no text entry; identity prompt appears only after 1 Daily Game or 3 Free Play rounds.

## 4. Out of scope

Everything in §17 of the spec, plus OEC sign-in (deferred per §1.3 above).

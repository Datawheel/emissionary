# Emissionary

**A carbon-intuition guessing game for the OEC.** Players compare pairs of everyday activities ("10 minutes of a hairdryer emits the same CO₂ as how many hours of a refrigerator?"), guess on a logarithmic slider, and discover how the same comparison changes across countries with different electricity mixes.

- Spec: [`EMISSIONARY.md`](EMISSIONARY.md) · Design decisions: [`docs/superpowers/specs/`](docs/superpowers/specs/)
- Data methodology & sources: [`data/SOURCES.md`](data/SOURCES.md) (auto-generated)

## Stack

Next.js (App Router, TypeScript) · PostgreSQL (plain `pg`, SQL migrations) · Vitest · Playwright. Fully self-contained — no shared code with other OEC services (spec §15).

## Run locally

```bash
cp .env.example .env          # set PLAYER_TOKEN_SECRET and DAILY_SALT for anything non-dev
createdb emissionary          # or: sudo -u postgres psql -c "CREATE DATABASE emissionary OWNER emissionary;"
npx tsx db/migrate.ts         # apply SQL migrations (idempotent)
npx tsx scripts/sync-items.ts # upsert items + country factors into the DB
npm run dev                   # http://localhost:3000
```

## Tests

```bash
npm test          # validates data (pretest) then runs unit + API suites (needs emissionary_test DB)
npm run e2e       # Playwright mobile-viewport acceptance smoke (builds/starts on :3210)
npm run validate  # data validation suite alone (spec §4.4)
```

The API tests expect a `emissionary_test` database owned by the same role.

## Data pipeline

- `scripts/update-country-factors.ts` — refresh grid intensities from Ember (via the OWID mirror); car fields are preserved. Commit the regenerated `data/country_factors.json`.
- `scripts/build-items.ts` — regenerates `data/items.json` from the researched values in the script.
- `scripts/generate-sources-md.ts` — regenerates `data/SOURCES.md` from the source registry.
- `npm run validate` — provenance, sanity bands, flagship cross-checks (kettle vs gas hob flips between France and Poland), pinned-country freshness, EN/ES completeness. Runs before every `npm test`.

Truths are computed **only server-side** (`src/lib/emissions.ts` via the API routes); the client never sees a factor or truth before a guess is submitted (spec §12).

## Deployment (this server)

Deployed at **https://emi.cesarhidalgo.com** since 2026-07-16:

- `emissionary.service` (systemd): runs `next start -p 3040` as the `emissionary` system user, env from `/var/www/emissionary/.env` (secrets generated at deploy time; `LAUNCH_DATE=2026-07-16`). Logs: `/var/log/emissionary/web.log`.
- nginx: `/etc/nginx/sites-available/emissionary` proxies the domain to `127.0.0.1:3040`; TLS via certbot (auto-renews via `certbot.timer`).
- Redeploy after changes: `npm run build && sudo systemctl restart emissionary`.

`DAILY_SALT` must never change after launch (it seeds the deterministic daily sets); `LAUNCH_DATE` drives the share-card day counter — reset both together only if you intend to reset the game's history.

## Deferred (blocked on the OEC team — spec §18)

Optional OEC sign-in. The interface and anonymous→linked merge semantics are implemented and tested (`src/lib/auth/provider.ts`); wiring the real OAuth flow is the only remaining work once protocol details are known.

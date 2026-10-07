# Emissionary

**A carbon-intuition guessing game for the OEC.** Players compare pairs of everyday activities ("10 minutes of a hairdryer emits the same CO₂ as how many hours of a refrigerator?"), guess on a logarithmic slider, and discover how the same comparison changes across countries with different electricity mixes.

- Spec: [`EMISSIONARY.md`](EMISSIONARY.md) · Design decisions: [`docs/superpowers/specs/`](docs/superpowers/specs/)
- Data methodology & sources: [`data/SOURCES.md`](data/SOURCES.md) (auto-generated)
- **Deploying: [`DEPLOY.md`](DEPLOY.md)**

Available in English, Spanish, French, German, Russian and Simplified Chinese (`?lang=en|es|fr|de|ru|zh`, otherwise the browser's language).

## Stack

Next.js (App Router, TypeScript) · PostgreSQL (plain `pg`, SQL migrations) · Vitest · Playwright. Fully self-contained — no shared code with other OEC services (spec §15).

## Run locally

```bash
cp .env.example .env          # set PLAYER_TOKEN_SECRET and DAILY_SALT for anything non-dev
createdb emissionary          # or: sudo -u postgres psql -c "CREATE DATABASE emissionary OWNER emissionary;"
npm run db:migrate            # apply SQL migrations (idempotent)
npm run db:sync               # upsert items + country factors into the DB
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

- `npm run data:countries` — refresh grid intensities from Ember (via the OWID mirror; car fields are preserved), regenerate localized country names (`scripts/build-country-names.ts`, CLDR plus reviewed overrides) and the appendix.
- `npm run data:items` — regenerate `data/items.json` from `scripts/build-items.ts` (English/Spanish) and `scripts/i18n/items-*.ts` (French, German, Russian, Chinese), then the appendix.
- `npm run og` — re-render the per-language social preview images (`public/og-*.png`) from `scripts/og/card.html`.
- `npm run validate` — provenance, sanity bands, flagship cross-checks (kettle vs gas hob flips between France and Poland), pinned-country freshness, and translation checks (every language present, same numbers and placeholders as the English). Runs before every `npm test`.
- `npm run package` — writes a clean `dist/emissionary-<date>.zip` of the committed code (no secrets, no `node_modules`) for handing off.

Truths are computed **only server-side** (`src/lib/emissions.ts` via the API routes); the client never sees a factor or truth before a guess is submitted (spec §12).

## Deployment

See [`DEPLOY.md`](DEPLOY.md) for a fresh install. The original instance is deployed at **https://emi.cesarhidalgo.com** since 2026-07-16:

- `emissionary.service` (systemd): runs `next start -p 3040` as the `emissionary` system user, env from `/var/www/emissionary/.env` (secrets generated at deploy time; `LAUNCH_DATE=2026-07-16`). Logs: `/var/log/emissionary/web.log`.
- nginx: `/etc/nginx/sites-available/emissionary` proxies the domain to `127.0.0.1:3040`; TLS via certbot (auto-renews via `certbot.timer`).
- Redeploy after changes: `npm run build && sudo systemctl restart emissionary` (plus `npm run db:sync` after data changes).

`DAILY_SALT` must never change after launch (it seeds the deterministic daily sets); `LAUNCH_DATE` drives the share-card day counter — reset both together only if you intend to reset the game's history.

## Deferred (blocked on the OEC team — spec §18)

Optional OEC sign-in. The interface and anonymous→linked merge semantics are implemented and tested (`src/lib/auth/provider.ts`); wiring the real OAuth flow is the only remaining work once protocol details are known.

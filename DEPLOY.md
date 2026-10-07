# Deploying Emissionary

A self-contained Next.js app with a PostgreSQL database. Nothing is shared with other OEC services. Everything below assumes a Linux host; adapt the service/proxy parts to your infrastructure.

## 1. Requirements

- **Node.js 20.19+ or 22 LTS** (the npm scripts use `--env-file`)
- **PostgreSQL 14+** (developed on 16)
- A reverse proxy for TLS (nginx example below)

## 2. Get the code

If you received a zip, it was made with `npm run package` (a `git archive` of the repository). It contains no secrets, no `node_modules`, and no build output. Unzip it and work inside `emissionary/`.

> Don't deploy by zipping a developer's working folder: it includes their `.env` (production secrets), `node_modules`, and build caches.

## 3. Database

```bash
sudo -u postgres psql -c "CREATE ROLE emissionary LOGIN PASSWORD '<strong password>';"
sudo -u postgres psql -c "CREATE DATABASE emissionary OWNER emissionary;"
```

## 4. Configure

```bash
cp .env.example .env
```

| Variable | What it is |
|---|---|
| `DATABASE_URL` | `postgres://emissionary:<password>@localhost:5432/emissionary` |
| `PLAYER_TOKEN_SECRET` | Signs anonymous-player cookies. `openssl rand -hex 32`. Changing it logs every player out. |
| `DAILY_SALT` | Seeds the daily game sets. `openssl rand -hex 32`. **Never change after launch.** |
| `LAUNCH_DATE` | UTC date of Daily Game #1 (`YYYY-MM-DD`); drives the "#N" in share texts. Set to the public launch day. |
| `SITE_URL` | Public base URL, e.g. `https://emissionary.oec.world` (used for social-preview links). |
| `ADMIN_KEY` | Password for `/admin` (usage inventory, today's daily set). Defaults to `dev-admin` if unset — set your own. |

In production the server **refuses to start** while `PLAYER_TOKEN_SECRET` or `DAILY_SALT` are missing or still hold the placeholder values.

## 5. Install, migrate, build

```bash
npm ci                # dev dependencies are needed for the build and scripts
npm run db:migrate    # creates tables (idempotent; safe to re-run)
npm run db:sync       # loads items and country factors into the DB (re-run after data changes)
npm run og            # optional: re-render the social preview images with your SITE_URL domain
npm run build
```

## 6. Run

`npm start -- -p 3040` (or any free port). Example systemd unit:

```ini
[Unit]
Description=Emissionary
After=network.target postgresql.service

[Service]
User=emissionary
WorkingDirectory=/srv/emissionary
EnvironmentFile=/srv/emissionary/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -p 3040
Restart=always

[Install]
WantedBy=multi-user.target
```

Example nginx server block:

```nginx
server {
  server_name emissionary.oec.world;
  location / {
    proxy_pass http://127.0.0.1:3040;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  listen 443 ssl; # certificates via certbot or your own
}
```

The app relies on `X-Forwarded-For` for per-IP rate limiting, so keep that header.

## 7. Verify

```bash
npm test          # data validation + unit/API tests (needs an emissionary_test database, see README)
npm run e2e       # Playwright smoke test on a phone-sized viewport (builds/starts on port 3210)
```

Then open the site, choose a country, play a round, and check `/about`, `/leaderboard`, and `/admin?key=<ADMIN_KEY>`.

## Languages

The game is in English, Spanish, French, German, Russian and Simplified Chinese. The language follows `?lang=xx` (switch with the language button in the header), falling back to the browser's language and then English. All interface text is in `src/lib/i18n.ts` and `src/lib/i18n-about.ts`; item names and notes are in `scripts/build-items.ts` (English, Spanish) and `scripts/i18n/items-*.ts` (other languages). `npm run validate` (run before every `npm test`) fails if any translation is missing, drops a `{placeholder}`, or changes a number relative to the English.

## Updating data

- New grid intensities (yearly, from Ember): `npm run data:countries`, then `npm run db:sync`.
- Item values: edit `scripts/build-items.ts` (plus the four translation files), run `npm run data:items`, then `npm run db:sync`.
- Commit the regenerated files under `data/` — `data/SOURCES.md` is checked for freshness by `npm run validate`.

## Known items for the OEC team

- **OEC sign-in** is stubbed (`src/lib/auth/provider.ts`): play is anonymous with optional leaderboard names. The merge logic for linking an anonymous player to an account is implemented and tested; only the OAuth flow needs wiring once its details are known (spec §18).
- **~10 item values** are documented product-class conventions marked "Pending verification" in `data/SOURCES.md`, awaiting EPREL/measured data.
- `next build` prints one harmless warning ("Encountered unexpected file in NFT list") caused by the runtime data loader in `src/lib/data.ts`. It only affects Next's optional standalone output tracing, not `next start`.

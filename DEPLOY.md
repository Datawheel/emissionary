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
| `GAMES_TOKEN_SECRET` | Must equal the OEC site's `GAMES_TOKEN_SECRET`. It verifies the signed identity oec.world sends when the game is embedded. Without it everyone stays anonymous (no error). |
| `EMBED_PARENTS` | Optional. Extra origins allowed to embed the game, e.g. `http://localhost:3000` to test a production build against a local OEC. Leave unset in production. |
| `ADMIN_KEY` | Password for `/admin`. **It shows today's Daily Game answers**, so use a long random value (`openssl rand -base64 24`). Without it, `/admin` is disabled. |

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

Run it on **localhost only**, behind the proxy. Example systemd unit (the sandboxing lines make the code read-only to the running app, so even a compromised process can't modify it or touch the rest of the system):

```ini
[Unit]
Description=Emissionary
After=network.target postgresql.service

[Service]
User=emissionary
WorkingDirectory=/srv/emissionary
EnvironmentFile=/srv/emissionary/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3040
Restart=always

NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/srv/emissionary/.next/cache
ProtectHome=true
PrivateTmp=true
PrivateDevices=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectKernelLogs=true
ProtectControlGroups=true
RestrictNamespaces=true
RestrictSUIDSGID=true
LockPersonality=true
CapabilityBoundingSet=
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
SystemCallArchitectures=native
UMask=0077

[Install]
WantedBy=multi-user.target
```

Create `.next/cache` before the first start (`mkdir -p .next/cache`), make `.env` readable only by the service user (`chmod 640 .env`), and check the result with `systemd-analyze security emissionary`.

Example nginx server block:

```nginx
server {
  server_name emissionary.oec.world;
  location / {
    proxy_pass http://127.0.0.1:3040;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  listen 443 ssl; # certificates via certbot or your own
}
```

Rate limiting is per client IP and trusts only what the proxy writes: `X-Real-IP` (which `proxy_set_header` overwrites, so clients can't forge it), else the last `X-Forwarded-For` entry. If another load balancer or CDN sits in front of nginx, set `X-Real-IP` from that layer's real-client header instead.

## Docker (OEC hosts)

The OEC hosts run it like World Trade Cup: `Dockerfile`, `compose.yaml` and `deploy_latest.sh`. Create `.env` as in section 4 (`DATABASE_URL` must be reachable from the container, e.g. `host.docker.internal` for a Postgres on the host), then:

```bash
SYNC_ITEMS=1 ./deploy_latest.sh   # first deploy, and after data changes
./deploy_latest.sh                # any other redeploy
```

The entrypoint applies the SQL migrations on every start; items and country factors are only synced when `SYNC_ITEMS=1` (the sync bumps item versions). The container listens on `127.0.0.1:3040`; point nginx (section 6) at it. Sections 5 and 6 (systemd) are the alternative without Docker.

## 7. Verify

```bash
npm test          # data validation + unit/API tests (needs an emissionary_test database, see README)
npm run e2e       # Playwright smoke test on a phone-sized viewport (builds/starts on port 3210)
```

Then open the site, choose a country, play a round, and check `/about`, `/leaderboard`, and `/admin?key=<ADMIN_KEY>`.

## Security notes

- **Secrets** live only in `.env` (never committed; the zip from `npm run package` excludes it). Production refuses to start with missing or placeholder `PLAYER_TOKEN_SECRET`/`DAILY_SALT`.
- **Database**: PostgreSQL should listen on localhost only, and the database must be owned by the app role. Don't reuse the test role (`emissionary_test`, password in the test files) on a production server.
- **Headers**: the app sends its own Content-Security-Policy, `frame-ancestors` limited to `oec.world` and `*.oec.world` (so the OEC games hub can embed it), `nosniff`, `Referrer-Policy`, `Permissions-Policy` and HSTS (`next.config.mjs`).
- **Admin** (`/admin`) takes the password by POST and sets an 8-hour `HttpOnly`/`SameSite=Strict` session cookie; login is rate-limited and the page is `noindex`/`no-store`.
- **Players** are anonymous by default; sessions are HMAC-signed cookies. No personal data beyond an optional chosen nickname and country is stored.
- Keep dependencies patched: run `npm audit` before each deploy (it reported 0 vulnerabilities at handoff).

## Languages

The game is in English, Spanish, French, German, Russian and Simplified Chinese. The language follows `?lang=xx` (switch with the language button in the header), falling back to the browser's language and then English. All interface text is in `src/lib/i18n.ts` and `src/lib/i18n-about.ts`; item names and notes are in `scripts/build-items.ts` (English, Spanish) and `scripts/i18n/items-*.ts` (other languages). `npm run validate` (run before every `npm test`) fails if any translation is missing, drops a `{placeholder}`, or changes a number relative to the English.

## Updating data

- New grid intensities (yearly, from Ember): `npm run data:countries`, then `npm run db:sync`.
- Item values: edit `scripts/build-items.ts` (plus the four translation files), run `npm run data:items`, then `npm run db:sync`.
- Commit the regenerated files under `data/` — `data/SOURCES.md` is checked for freshness by `npm run validate`.

## Known items for the OEC team

- **OEC sign-in** works through the games hub: oec.world sends a signed token over `postMessage` and `src/lib/auth/oec-link.ts` binds it to the player (needs `GAMES_TOKEN_SECRET`). Outside oec.world play stays anonymous.
- **~10 item values** are documented product-class conventions marked "Pending verification" in `data/SOURCES.md`, awaiting EPREL/measured data.
- `next build` prints one harmless warning ("Encountered unexpected file in NFT list") caused by the runtime data loader in `src/lib/data.ts`. It only affects Next's optional standalone output tracing, not `next start`.

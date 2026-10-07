/**
 * Startup checks (Next.js runs register() once when the server boots).
 * In production, refuse to start on missing or placeholder secrets rather
 * than silently running with the publicly known defaults from .env.example.
 */
export function register() {
  if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE === 'phase-production-build') return;
  const placeholders: Record<string, string> = {
    PLAYER_TOKEN_SECRET: 'change_me_dev_secret',
    DAILY_SALT: 'change_me_daily_salt',
  };
  const bad = Object.entries(placeholders)
    .filter(([name, placeholder]) => !process.env[name] || process.env[name] === placeholder)
    .map(([name]) => name);
  if (bad.length) {
    throw new Error(
      `Emissionary will not start: set ${bad.join(' and ')} in .env (generate with: openssl rand -hex 32). See DEPLOY.md.`,
    );
  }
  for (const name of ['DATABASE_URL', 'LAUNCH_DATE', 'SITE_URL']) {
    if (!process.env[name]) console.warn(`[emissionary] ${name} is not set — see DEPLOY.md`);
  }
}

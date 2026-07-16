import type { Lang, Localized } from './types';

export const LANGS: Lang[] = ['en', 'es'];

export function pickLang(raw: string | null | undefined): Lang {
  return raw === 'es' ? 'es' : 'en';
}

export function L(text: Localized, lang: Lang): string {
  return text[lang] ?? text.en;
}

/** UI string catalog. Every user-facing string in the app lives here (design §M4). */
const STRINGS = {
  app_name: { en: 'Emissionary', es: 'Emissionary' },
  tagline: { en: 'Spread the word about emissions.', es: 'Difunde la palabra sobre las emisiones.' },
  play: { en: 'Play', es: 'Jugar' },
  daily_game: { en: 'Daily Game', es: 'Juego diario' },
  free_play: { en: 'Free Play', es: 'Juego libre' },
  leaderboard: { en: 'Leaderboard', es: 'Clasificación' },
  submit_guess: { en: 'Lock in my guess', es: 'Confirmar mi respuesta' },
  next_round: { en: 'Next round', es: 'Siguiente ronda' },
  which_emits_more: { en: 'Which emits more CO₂?', es: '¿Cuál emite más CO₂?' },
  equals_question: { en: 'emits the same CO₂ as…', es: 'emite el mismo CO₂ que…' },
  how_many: { en: 'How much?', es: '¿Cuánto?' },
  your_guess: { en: 'Your guess', es: 'Tu respuesta' },
  truth: { en: 'Answer', es: 'Respuesta correcta' },
  points: { en: 'points', es: 'puntos' },
  total: { en: 'Total', es: 'Total' },
  how_computed: { en: 'How we computed this', es: 'Cómo lo calculamos' },
  around_the_world: { en: 'The same comparison around the world', es: 'La misma comparación en el mundo' },
  see_all_countries: { en: 'See all countries', es: 'Ver todos los países' },
  type_instead: { en: 'type instead', es: 'escribir en su lugar' },
  choose_country: { en: 'Choose your country', es: 'Elige tu país' },
  confirm_country: { en: 'Confirm', es: 'Confirmar' },
  search_country: { en: 'Search countries…', es: 'Buscar países…' },
  score: { en: 'Score', es: 'Puntuación' },
  streak: { en: 'Streak', es: 'Racha' },
  best_streak: { en: 'Best streak', es: 'Mejor racha' },
  rounds_played: { en: 'Rounds played', es: 'Rondas jugadas' },
  avg_score: { en: 'Avg score', es: 'Puntuación media' },
  claim_leaderboard: { en: 'Claim your place on the leaderboard', es: 'Reclama tu lugar en la clasificación' },
  name_placeholder: { en: 'Pick a name', es: 'Elige un nombre' },
  regenerate: { en: 'New name', es: 'Otro nombre' },
  keep_anonymous: { en: 'Keep playing anonymously', es: 'Seguir jugando de forma anónima' },
  save_name: { en: 'Save', es: 'Guardar' },
  share: { en: 'Share', es: 'Compartir' },
  copied: { en: 'Copied!', es: '¡Copiado!' },
  next_daily_in: { en: 'Next Daily Game in', es: 'Próximo juego diario en' },
  percentile: { en: 'You beat {pct}% of today’s players', es: 'Superaste al {pct}% de los jugadores de hoy' },
  today: { en: 'Today', es: 'Hoy' },
  this_week: { en: 'This Week', es: 'Esta semana' },
  all_time: { en: 'All Time', es: 'Histórico' },
  all_countries: { en: 'All countries', es: 'Todos los países' },
  you: { en: 'You', es: 'Tú' },
  anonymous: { en: 'Anonymous 🦊', es: 'Anónimo 🦊' },
  about: { en: 'About & methodology', es: 'Acerca de y metodología' },
  stats: { en: 'Stats', es: 'Estadísticas' },
  loading: { en: 'Loading…', es: 'Cargando…' },
  error_retry: { en: 'Something went wrong. Tap to retry.', es: 'Algo salió mal. Toca para reintentar.' },
  in_country: { en: 'in', es: 'en' },
  of: { en: 'of', es: 'de' },
  already_played_daily: { en: 'You already played today’s game', es: 'Ya jugaste el juego de hoy' },
  results: { en: 'Results', es: 'Resultados' },
  takeaway_cleaner: {
    en: 'In {clean} this is {ratio}× cleaner than in {dirty}.',
    es: 'En {clean} esto es {ratio}× más limpio que en {dirty}.',
  },
  equivalent_to: { en: 'That’s about', es: 'Eso es aproximadamente' },
} satisfies Record<string, Localized>;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang, vars?: Record<string, string | number>): string {
  let s = STRINGS[key][lang];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

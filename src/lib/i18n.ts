import { LANGS, type Lang, type Localized, type PluralForms } from './types';
import { ABOUT_STRINGS } from './i18n-about';

export { LANGS };

/** Native names for the language menu. */
export const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ru: 'Русский',
  zh: '中文',
};

/** BCP 47 tags used for number formatting, plural rules, and collation. */
export const LOCALE_TAGS: Record<Lang, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ru: 'ru-RU',
  zh: 'zh-CN',
};

export function isLang(raw: unknown): raw is Lang {
  return typeof raw === 'string' && (LANGS as readonly string[]).includes(raw);
}

export function pickLang(raw: string | null | undefined): Lang {
  return isLang(raw) ? raw : 'en';
}

/**
 * Explicit ?lang= wins; otherwise the browser's Accept-Language preference
 * (first supported primary subtag, by q-value); otherwise English.
 */
export function resolveLang(param: string | null | undefined, acceptLanguage: string | null | undefined): Lang {
  if (isLang(param)) return param;
  const prefs = (acceptLanguage ?? '')
    .split(',')
    .map((part, i) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      return { primary: tag.split('-')[0].toLowerCase(), q: q ? Number(q.slice(2)) || 0 : 1, i };
    })
    .filter((p) => p.primary && p.q > 0)
    .sort((a, b) => b.q - a.q || a.i - b.i);
  return prefs.map((p) => p.primary).find(isLang) ?? 'en';
}

export function L(text: Localized, lang: Lang): string {
  return text[lang] ?? text.en;
}

/** Pick the CLDR plural form for n (a displayed, already-rounded value). */
export function plural(forms: PluralForms, n: number, lang: Lang): string {
  const cat = new Intl.PluralRules(LOCALE_TAGS[lang]).select(n) as keyof PluralForms;
  return forms[cat] ?? forms.other;
}

/** Counted nouns that change form with the number (Russian has four forms). */
export const PLURALS = {
  points: {
    en: { one: 'point', other: 'points' },
    es: { one: 'punto', other: 'puntos' },
    fr: { one: 'point', other: 'points' },
    de: { one: 'Punkt', other: 'Punkte' },
    ru: { one: 'очко', few: 'очка', many: 'очков', other: 'очка' },
    zh: { other: '分' },
  },
  days: {
    en: { one: 'day', other: 'days' },
    es: { one: 'día', other: 'días' },
    fr: { one: 'jour', other: 'jours' },
    de: { one: 'Tag', other: 'Tage' },
    ru: { one: 'день', few: 'дня', many: 'дней', other: 'дня' },
    zh: { other: '天' },
  },
  months: {
    en: { one: 'month', other: 'months' },
    es: { one: 'mes', other: 'meses' },
    fr: { one: 'mois', other: 'mois' },
    de: { one: 'Monat', other: 'Monate' },
    ru: { one: 'месяц', few: 'месяца', many: 'месяцев', other: 'месяца' },
    zh: { other: '个月' },
  },
  players: {
    en: { one: 'player', other: 'players' },
    es: { one: 'jugador', other: 'jugadores' },
    fr: { one: 'joueur', other: 'joueurs' },
    de: { one: 'Spieler', other: 'Spieler' },
    ru: { one: 'игрок', few: 'игрока', many: 'игроков', other: 'игрока' },
    zh: { other: '名玩家' },
  },
  guesses: {
    en: { one: 'guess', other: 'guesses' },
    es: { one: 'respuesta', other: 'respuestas' },
    fr: { one: 'réponse', other: 'réponses' },
    de: { one: 'Tipp', other: 'Tipps' },
    ru: { one: 'ответ', few: 'ответа', many: 'ответов', other: 'ответа' },
    zh: { other: '次作答' },
  },
  /** "N times" in ratio sentences — only Russian inflects it ("в 3 раза", "в 5 раз"). */
  rounds: {
    en: { one: 'round', other: 'rounds' },
    es: { one: 'ronda', other: 'rondas' },
    fr: { one: 'manche', other: 'manches' },
    de: { one: 'Runde', other: 'Runden' },
    ru: { one: 'раунд', few: 'раунда', many: 'раундов', other: 'раунда' },
    zh: { other: '轮' },
  },
  times: {
    en: { one: 'time', other: 'times' },
    es: { one: 'vez', other: 'veces' },
    fr: { one: 'fois', other: 'fois' },
    de: { other: 'mal' },
    ru: { one: 'раз', few: 'раза', many: 'раз', other: 'раза' },
    zh: { other: '倍' },
  },
} satisfies Record<string, Record<Lang, PluralForms>>;

export type PluralKey = keyof typeof PLURALS;

export function pluralWord(key: PluralKey, n: number, lang: Lang): string {
  return plural(PLURALS[key][lang], n, lang);
}

/**
 * UI string catalog — every user-facing string in the app lives here or in
 * i18n-about.ts. French strings use a no-break space before : ; ? ! and %.
 */
const UI_STRINGS = {
  tagline: {
    en: 'How good is your carbon intuition?',
    es: '¿Qué tan buena es tu intuición sobre el CO₂?',
    fr: 'Ton intuition carbone est-elle juste ?',
    de: 'Wie gut ist dein CO₂-Gespür?',
    ru: 'Насколько точно вы чувствуете выбросы CO₂?',
    zh: '你的碳直觉有多准？',
  },
  subtitle: {
    en: 'Test your knowledge of everyday emissions — one comparison at a time.',
    es: 'Pon a prueba lo que sabes de las emisiones cotidianas, comparación a comparación.',
    fr: 'Teste tes connaissances sur les émissions du quotidien, une comparaison à la fois.',
    de: 'Teste dein Wissen über alltägliche Emissionen – Vergleich für Vergleich.',
    ru: 'Проверьте свои знания о повседневных выбросах — сравнение за сравнением.',
    zh: '测试你对日常排放的了解——一次一个比较。',
  },
  meta_description: {
    en: 'How good is your carbon intuition? Test your knowledge of everyday emissions — a game by the OEC.',
    es: '¿Qué tan buena es tu intuición sobre el CO₂? Pon a prueba lo que sabes de las emisiones cotidianas — un juego del OEC.',
    fr: 'Ton intuition carbone est-elle juste\u00a0? Teste tes connaissances sur les émissions du quotidien — un jeu de l’OEC.',
    de: 'Wie gut ist dein CO₂-Gespür? Teste dein Wissen über alltägliche Emissionen – ein Spiel des OEC.',
    ru: 'Насколько точно вы чувствуете выбросы CO₂? Проверьте свои знания о повседневных выбросах — игра от OEC.',
    zh: '你的碳直觉有多准？测试你对日常排放的了解——OEC 出品的游戏。',
  },
  /** Social preview card, second line (after "10 min of hairdryer ="); **…** is highlighted. */
  og_question: {
    en: '**how many hours** of refrigerator?',
    es: '¿**cuántas horas** de nevera?',
    fr: '**combien d’heures** de réfrigérateur\u00a0?',
    de: '**wie viele Stunden** Kühlschrank?',
    ru: '**сколько часов** работы холодильника?',
    zh: '冰箱要运行**几小时**？',
  },
  daily_game: {
    en: 'Daily Game',
    es: 'Juego diario',
    fr: 'Défi du jour',
    de: 'Tagesspiel',
    ru: 'Игра дня',
    zh: '每日挑战',
  },
  free_play: {
    en: 'Free Play',
    es: 'Juego libre',
    fr: 'Partie libre',
    de: 'Freies Spiel',
    ru: 'Свободная игра',
    zh: '自由模式',
  },
  leaderboard: {
    en: 'Leaderboard',
    es: 'Clasificación',
    fr: 'Classement',
    de: 'Bestenliste',
    ru: 'Таблица лидеров',
    zh: '排行榜',
  },
  about: { en: 'About', es: 'Acerca de', fr: 'À propos', de: 'Über', ru: 'О проекте', zh: '关于' },
  stats: { en: 'Stats', es: 'Estadísticas', fr: 'Statistiques', de: 'Statistik', ru: 'Статистика', zh: '统计' },
  language: { en: 'Language', es: 'Idioma', fr: 'Langue', de: 'Sprache', ru: 'Язык', zh: '语言' },
  submit_guess: {
    en: 'Lock in my guess',
    es: 'Confirmar mi respuesta',
    fr: 'Valider ma réponse',
    de: 'Tipp abgeben',
    ru: 'Зафиксировать ответ',
    zh: '确认我的答案',
  },
  move_slider_hint: {
    en: 'Slide to guess',
    es: 'Desliza para responder',
    fr: 'Fais glisser le curseur pour répondre',
    de: 'Schieb den Regler, um zu schätzen',
    ru: 'Передвиньте ползунок, чтобы ответить',
    zh: '拖动滑块作答',
  },
  next_round: {
    en: 'Next round',
    es: 'Siguiente ronda',
    fr: 'Manche suivante',
    de: 'Nächste Runde',
    ru: 'Следующий раунд',
    zh: '下一轮',
  },
  round_of: {
    en: '{n} of {total}',
    es: '{n} de {total}',
    fr: '{n} sur {total}',
    de: '{n} von {total}',
    ru: '{n} из {total}',
    zh: '第 {n}/{total} 轮',
  },
  which_emits_more: {
    en: 'Which emits more CO₂?',
    es: '¿Cuál emite más CO₂?',
    fr: 'Lequel émet le plus de CO₂ ?',
    de: 'Was verursacht mehr CO₂?',
    ru: 'Что выбрасывает больше CO₂?',
    zh: '哪个排放的 CO₂ 更多？',
  },
  /** How an amount of a product reads: "10 min of hairdryer". */
  clue_pattern: {
    en: '{qty} of {name}',
    es: '{qty} de {name}',
    fr: '{qty} de {name}',
    de: '{qty} {name}',
    ru: '{name}: {qty}',
    zh: '{name} {qty}',
  },
  /** Boiling items: the amount is litres of water, so say so. */
  clue_pattern_boil: {
    en: 'boiling {qty} of water with {name}',
    es: 'hervir {qty} de agua con {name}',
    fr: 'faire bouillir {qty} d’eau avec {name}',
    de: '{qty} Wasser kochen mit {name}',
    ru: '{name}: вскипятить {qty} воды',
    zh: '用{name}烧开 {qty}水',
  },
  /** A boiling item named as a quantity of something ("this much water boiled with…"). */
  boil_item: {
    en: 'water boiled with {name}',
    es: 'agua hervida con {name}',
    fr: 'eau bouillie avec {name}',
    de: 'Wasser (gekocht mit {name})',
    ru: 'кипячение воды ({name})',
    zh: '用{name}烧开的水',
  },
  equals_question: {
    en: 'emits as much CO₂ as…',
    es: '= tanto CO₂ como…',
    fr: '= autant de CO₂ que…',
    de: '= so viel CO₂ wie …',
    ru: 'выбрасывает столько же CO₂, сколько…',
    zh: '排放的 CO₂ 相当于……',
  },
  connector_time: {
    en: '…running for:',
    es: '…funcionando durante:',
    fr: '…en marche pendant :',
    de: '… in Betrieb für:',
    ru: '…за время работы:',
    zh: '……运行时长：',
  },
  connector_km: {
    en: '…driving:',
    es: '…recorriendo:',
    fr: '…sur une distance de :',
    de: '… auf einer Strecke von:',
    ru: '…на расстоянии:',
    zh: '……行驶距离：',
  },
  connector_liters: {
    en: '…boiling this much water:',
    es: '…hirviendo esta cantidad de agua:',
    fr: '…pour faire bouillir cette quantité d’eau :',
    de: '… beim Kochen dieser Wassermenge:',
    ru: '…вскипятив столько воды:',
    zh: '……烧开的水量：',
  },
  connector_events: {
    en: '…doing:',
    es: '…haciendo:',
    fr: '…pour :',
    de: '… für:',
    ru: '…за:',
    zh: '……次数：',
  },
  /** The parenthetical that marks shared-vehicle names; kept when names appear in sentences. */
  per_passenger: {
    en: '(per passenger)',
    es: '(por pasajero)',
    fr: '(par passager)',
    de: '(pro Person)',
    ru: '(на пассажира)',
    zh: '（人均）',
  },
  your_guess: { en: 'Your guess', es: 'Tu respuesta', fr: 'Ta réponse', de: 'Dein Tipp', ru: 'Ваш ответ', zh: '你的答案' },
  truth: {
    en: 'Answer',
    es: 'Respuesta correcta',
    fr: 'Bonne réponse',
    de: 'Richtige Antwort',
    ru: 'Правильный ответ',
    zh: '正确答案',
  },
  results: { en: 'Results', es: 'Resultados', fr: 'Résultats', de: 'Ergebnis', ru: 'Результаты', zh: '结果' },
  how_computed: {
    en: 'How we computed this',
    es: 'Cómo lo calculamos',
    fr: 'Comment nous l’avons calculé',
    de: 'So haben wir gerechnet',
    ru: 'Как мы это посчитали',
    zh: '我们如何计算',
  },
  unit_facts_title: {
    en: 'Worth remembering:',
    es: 'Vale la pena recordar:',
    fr: 'À retenir :',
    de: 'Gut zu wissen:',
    ru: 'Стоит запомнить:',
    zh: '值得记住：',
  },
  or: { en: 'or', es: 'o', fr: 'ou', de: 'oder', ru: 'или', zh: '或' },
  around_the_world: {
    en: 'Around the world',
    es: 'En el mundo',
    fr: 'Autour du monde',
    de: 'Rund um die Welt',
    ru: 'По всему миру',
    zh: '世界各地',
  },
  conversion_context: {
    en: '{clue} is worth this much {item} in each country:',
    es: 'El equivalente de {clue} en {item}, país por país:',
    fr: 'L’équivalent de {clue} en {item}, pays par pays :',
    de: 'Gegenwert von {clue} in {item}, Land für Land:',
    ru: '«{clue}» в пересчёте на «{item}» — по странам:',
    zh: '在各国，{clue}相当于以下{item}用量：',
  },
  emissions_context: {
    en: 'What {clue} emits in each country:',
    es: 'Emisiones de {clue} en cada país:',
    fr: 'Émissions de {clue} dans chaque pays :',
    de: 'CO₂-Ausstoß von {clue} in jedem Land:',
    ru: 'Выбросы «{clue}» по странам:',
    zh: '{clue}在各国的排放量：',
  },
  answer_same_everywhere: {
    en: 'The answer itself is the same everywhere — both products use the same energy source.',
    es: 'La respuesta en sí es igual en todas partes: ambos productos usan la misma fuente de energía.',
    fr: 'La réponse elle-même est la même partout : les deux produits utilisent la même source d’énergie.',
    de: 'Die Antwort selbst ist überall gleich – beide Produkte nutzen dieselbe Energiequelle.',
    ru: 'Сам ответ везде одинаков: оба варианта используют один и тот же источник энергии.',
    zh: '答案本身在各地都一样——两者使用的是同一种能源。',
  },
  same_everywhere: {
    en: '{clue} equals the same amount of {item} in every country — neither depends on the local electricity mix, so the answer doesn’t change.',
    es: 'En todos los países, el equivalente de {clue} en {item} es el mismo: ninguno depende de la mezcla eléctrica local, así que la respuesta no cambia.',
    fr: 'Dans tous les pays, l’équivalent de {clue} en {item} est le même : aucun des deux ne dépend du mix électrique local, la réponse ne change donc pas.',
    de: 'In jedem Land ist der Gegenwert von {clue} in {item} gleich – keines von beiden hängt vom lokalen Strommix ab, also ändert sich die Antwort nicht.',
    ru: '«{clue}» в любой стране равно одному и тому же количеству «{item}»: ни то ни другое не зависит от структуры местной электроэнергетики, поэтому ответ не меняется.',
    zh: '在每个国家，{clue}都相当于同样多的{item}——两者都不依赖当地的电力结构，所以答案不变。',
  },
  takeaway_cleaner: {
    en: 'In the cleanest country here ({clean}), {clue} emits {ratio}× less CO₂ than in the dirtiest ({dirty}).',
    es: 'En el país más limpio de la tabla ({clean}), las emisiones de {clue} son {ratio}× menores que en el más sucio ({dirty}).',
    fr: 'Dans le pays le plus propre du tableau ({clean}), les émissions de {clue} sont {ratio}× plus faibles que dans le plus émetteur ({dirty}).',
    de: 'Im saubersten Land der Tabelle ({clean}) ist der CO₂-Ausstoß von {clue} {ratio}× geringer als im schmutzigsten ({dirty}).',
    ru: 'В самой чистой стране таблицы ({clean}) «{clue}» даёт в {ratio} {times} меньше CO₂, чем в самой грязной ({dirty}).',
    zh: '{clue}在本表中排放最高的国家（{dirty}）产生的 CO₂ 是排放最低的国家（{clean}）的 {ratio} 倍。',
  },
  takeaway_more: {
    en: 'In the cleanest country here ({clean}), the CO₂ of {clue} buys you {ratio}× more {item} than in the dirtiest ({dirty}).',
    es: 'En el país más limpio de la tabla ({clean}), el CO₂ de {clue} te da {ratio}× más {item} que en el más sucio ({dirty}).',
    fr: 'Dans le pays le plus propre du tableau ({clean}), le CO₂ de {clue} permet {ratio}× plus de {item} que dans le plus émetteur ({dirty}).',
    de: 'Im saubersten Land der Tabelle ({clean}) reicht das CO₂ von {clue} für {ratio}× mehr {item} als im schmutzigsten ({dirty}).',
    ru: 'В самой чистой стране таблицы ({clean}) за те же выбросы, что и «{clue}», можно получить в {ratio} {times} больше «{item}», чем в самой грязной ({dirty}).',
    zh: '同样是{clue}排放的 CO₂，在本表中电力最清洁的国家（{clean}）能换来的{item}是排放最高的国家（{dirty}）的 {ratio} 倍。',
  },
  see_all_countries: {
    en: 'See all countries',
    es: 'Ver todos los países',
    fr: 'Voir tous les pays',
    de: 'Alle Länder anzeigen',
    ru: 'Показать все страны',
    zh: '查看所有国家',
  },
  intro_how: {
    en: 'Compare the CO₂ of everyday things — guess with the slider; the closer you get, the more points you score.',
    es: 'Compara el CO₂ de cosas cotidianas: responde con el deslizador; cuanto más te acerques, más puntos ganas.',
    fr: 'Compare le CO₂ des objets du quotidien : réponds avec le curseur ; plus tu es proche, plus tu marques de points.',
    de: 'Vergleiche das CO₂ alltäglicher Dinge – schätze mit dem Schieberegler; je näher du liegst, desto mehr Punkte bekommst du.',
    ru: 'Сравнивайте CO₂ повседневных вещей — отвечайте с помощью ползунка: чем ближе к правильному ответу, тем больше очков.',
    zh: '比较日常事物的 CO₂ 排放——用滑块作答，越接近正确答案，得分越高。',
  },
  intro_boundary: {
    en: 'We count only the emissions of using things — running a washing machine, driving 10 km — not of manufacturing them.',
    es: 'Solo contamos las emisiones de usar las cosas — una lavadora funcionando, 10 km en coche — no las de fabricarlas.',
    fr: 'Nous ne comptons que les émissions liées à l’utilisation — faire tourner un lave-linge, rouler 10 km —, pas celles de la fabrication.',
    de: 'Wir zählen nur die Emissionen der Nutzung – eine Waschmaschine laufen lassen, 10 km fahren –, nicht die der Herstellung.',
    ru: 'Мы учитываем только выбросы при использовании — работа стиральной машины, поездка на 10 км, — а не при производстве.',
    zh: '我们只计算使用过程中的排放——例如运行洗衣机、开车 10 公里——不包括制造过程的排放。',
  },
  choose_country: {
    en: 'Choose your country',
    es: 'Elige tu país',
    fr: 'Choisis ton pays',
    de: 'Wähle dein Land',
    ru: 'Выберите свою страну',
    zh: '选择你的国家',
  },
  country_grid_note: {
    en: 'Electricity emissions depend on your country’s grid.',
    es: 'Las emisiones de la electricidad dependen de la red de tu país.',
    fr: 'Les émissions de l’électricité dépendent du réseau de ton pays.',
    de: 'Die Emissionen von Strom hängen vom Stromnetz deines Landes ab.',
    ru: 'Выбросы от электричества зависят от энергосистемы вашей страны.',
    zh: '用电排放取决于你所在国家的电网。',
  },
  country_menu_label: {
    en: 'Country (electricity mix)',
    es: 'País (mezcla eléctrica)',
    fr: 'Pays (mix électrique)',
    de: 'Land (Strommix)',
    ru: 'Страна (структура электроэнергетики)',
    zh: '国家（电力结构）',
  },
  search_country: {
    en: 'Search countries…',
    es: 'Buscar países…',
    fr: 'Rechercher un pays…',
    de: 'Land suchen …',
    ru: 'Поиск страны…',
    zh: '搜索国家……',
  },
  tap_to_change: {
    en: 'Tap to change',
    es: 'Toca para cambiar',
    fr: 'Touche pour changer',
    de: 'Tippen zum Ändern',
    ru: 'Нажмите, чтобы изменить',
    zh: '点击更改',
  },
  next: { en: 'Next', es: 'Siguiente', fr: 'Suivant', de: 'Weiter', ru: 'Далее', zh: '下一步' },
  claim_leaderboard: {
    en: 'Claim your place on the leaderboard',
    es: 'Reclama tu lugar en la clasificación',
    fr: 'Réserve ta place au classement',
    de: 'Sichere dir deinen Platz in der Bestenliste',
    ru: 'Займите своё место в таблице лидеров',
    zh: '在排行榜上占据一席之地',
  },
  name_placeholder: {
    en: 'Pick a name',
    es: 'Elige un nombre',
    fr: 'Choisis un pseudo',
    de: 'Wähle einen Namen',
    ru: 'Выберите имя',
    zh: '取个名字',
  },
  regenerate: { en: 'New name', es: 'Otro nombre', fr: 'Autre pseudo', de: 'Neuer Name', ru: 'Другое имя', zh: '换一个' },
  keep_anonymous: {
    en: 'Keep playing anonymously',
    es: 'Seguir jugando de forma anónima',
    fr: 'Continuer en anonyme',
    de: 'Anonym weiterspielen',
    ru: 'Продолжить анонимно',
    zh: '继续匿名游戏',
  },
  save_name: { en: 'Save', es: 'Guardar', fr: 'Enregistrer', de: 'Speichern', ru: 'Сохранить', zh: '保存' },
  name_err_length: {
    en: 'Names must be 3–20 characters.',
    es: 'El nombre debe tener entre 3 y 20 caracteres.',
    fr: 'Le pseudo doit comporter de 3 à 20 caractères.',
    de: 'Der Name muss 3–20 Zeichen lang sein.',
    ru: 'Имя должно содержать от 3 до 20 символов.',
    zh: '名字长度须为 3–20 个字符。',
  },
  name_err_chars: {
    en: 'That name contains characters we can’t use.',
    es: 'Ese nombre contiene caracteres no permitidos.',
    fr: 'Ce pseudo contient des caractères non autorisés.',
    de: 'Der Name enthält unzulässige Zeichen.',
    ru: 'Имя содержит недопустимые символы.',
    zh: '名字包含不允许的字符。',
  },
  name_err_blocked: {
    en: 'That name isn’t allowed.',
    es: 'Ese nombre no está permitido.',
    fr: 'Ce pseudo n’est pas autorisé.',
    de: 'Dieser Name ist nicht erlaubt.',
    ru: 'Это имя использовать нельзя.',
    zh: '不允许使用这个名字。',
  },
  name_err_cooldown: {
    en: 'You can change your name once every 30 days.',
    es: 'Puedes cambiar tu nombre una vez cada 30 días.',
    fr: 'Tu peux changer de pseudo une fois tous les 30 jours.',
    de: 'Du kannst deinen Namen alle 30 Tage einmal ändern.',
    ru: 'Имя можно менять раз в 30 дней.',
    zh: '每 30 天只能改一次名字。',
  },
  name_err_taken: {
    en: 'That name is taken — try another.',
    es: 'Ese nombre ya está en uso; prueba otro.',
    fr: 'Ce pseudo est déjà pris, essaie-en un autre.',
    de: 'Der Name ist vergeben – probier einen anderen.',
    ru: 'Это имя занято — попробуйте другое.',
    zh: '这个名字已被使用，换一个试试。',
  },
  name_err_generic: {
    en: 'Couldn’t save your name. Try again.',
    es: 'No se pudo guardar el nombre. Inténtalo de nuevo.',
    fr: 'Impossible d’enregistrer le pseudo. Réessaie.',
    de: 'Der Name konnte nicht gespeichert werden. Versuch es noch einmal.',
    ru: 'Не удалось сохранить имя. Попробуйте ещё раз.',
    zh: '名字保存失败，请重试。',
  },
  share: { en: 'Share', es: 'Compartir', fr: 'Partager', de: 'Teilen', ru: 'Поделиться', zh: '分享' },
  copied: { en: 'Copied!', es: '¡Copiado!', fr: 'Copié !', de: 'Kopiert!', ru: 'Скопировано!', zh: '已复制！' },
  next_daily_in: {
    en: 'Next Daily Game in',
    es: 'Próximo juego diario en',
    fr: 'Prochain défi du jour dans',
    de: 'Nächstes Tagesspiel in',
    ru: 'Следующая игра дня через',
    zh: '距离下一次每日挑战还有',
  },
  percentile: {
    en: 'You beat {pct}% of today’s players',
    es: 'Superaste al {pct}% de los jugadores de hoy',
    fr: 'Tu as fait mieux que {pct} % des joueurs du jour',
    de: 'Du warst besser als {pct} % der heutigen Spieler',
    ru: 'Вы обошли {pct}% сегодняшних игроков',
    zh: '你超过了今天 {pct}% 的玩家',
  },
  today: { en: 'Today', es: 'Hoy', fr: 'Aujourd’hui', de: 'Heute', ru: 'Сегодня', zh: '今天' },
  all_time: { en: 'All Time', es: 'Histórico', fr: 'Depuis le début', de: 'Gesamt', ru: 'За всё время', zh: '总榜' },
  days_played: {
    en: 'Days played',
    es: 'Días jugados',
    fr: 'Jours joués',
    de: 'Gespielte Tage',
    ru: 'Сыграно дней',
    zh: '参与天数',
  },
  practice_note: {
    en: 'Only Daily Games score points here — Free Play is for practice.',
    es: 'Solo los juegos diarios puntúan aquí — el juego libre es para practicar.',
    fr: 'Seuls les défis du jour comptent ici — la partie libre sert à s’entraîner.',
    de: 'Hier zählen nur Tagesspiele – das freie Spiel ist zum Üben da.',
    ru: 'Здесь засчитываются только игры дня — свободная игра нужна для тренировки.',
    zh: '只有每日挑战计入排行榜——自由模式仅供练习。',
  },
  all_countries: {
    en: 'All countries',
    es: 'Todos los países',
    fr: 'Tous les pays',
    de: 'Alle Länder',
    ru: 'Все страны',
    zh: '所有国家',
  },
  all_players: {
    en: 'All players',
    es: 'Todos los jugadores',
    fr: 'Tous les joueurs',
    de: 'Alle Spieler',
    ru: 'Все игроки',
    zh: '所有玩家',
  },
  you: { en: 'You', es: 'Tú', fr: 'Toi', de: 'Du', ru: 'Вы', zh: '你' },
  /** the viewer among every player, anonymous included (histogram card) */
  you_top_pct: {
    en: 'You: top {pct}% of all players ({total})',
    es: 'Tú: top {pct}% de todos los jugadores ({total})',
    fr: 'Toi : top {pct} % de tous les joueurs ({total})',
    de: 'Du: Top {pct} % aller Spieler ({total})',
    ru: 'Вы: топ-{pct}% среди всех игроков ({total})',
    zh: '你：位列所有玩家（{total} 人）的前 {pct}%',
  },
  anonymous_you: { en: 'Anonymous 🦊', es: 'Anónimo 🦊', fr: 'Anonyme 🦊', de: 'Anonym 🦊', ru: 'Аноним 🦊', zh: '匿名 🦊' },
  /** axis labels under the leaderboard histogram */
  axis_days: { en: 'days', es: 'días', fr: 'jours', de: 'Tage', ru: 'дни', zh: '天数' },
  axis_points: { en: 'points', es: 'puntos', fr: 'points', de: 'Punkte', ru: 'очки', zh: '分数' },
  run_rules: {
    en: 'Three strikes and you’re out: a strike is a slider guess worth 0 points or a wrong pick. How far can you get?',
    es: 'Tres fallos y quedas fuera: un fallo es una respuesta con el deslizador que vale 0 puntos o una elección equivocada. ¿Hasta dónde llegarás?',
    fr: 'Trois erreurs et c’est fini : une erreur, c’est une réponse au curseur qui vaut 0 point ou un mauvais choix. Jusqu’où iras-tu ?',
    de: 'Drei Fehler und du bist raus: Ein Fehler ist ein Tipp mit dem Schieberegler, der 0 Punkte bringt, oder eine falsche Wahl. Wie weit kommst du?',
    ru: 'Три промаха — и игра окончена: промах — это ответ ползунком на 0 очков или неверный выбор. Как далеко вы сможете пройти?',
    zh: '三次失误即出局：失误是指滑块作答得 0 分，或二选一选错。看看你能走多远？',
  },
  strikes_aria: {
    en: 'Strikes: {n} of {max}',
    es: 'Fallos: {n} de {max}',
    fr: 'Erreurs : {n} sur {max}',
    de: 'Fehler: {n} von {max}',
    ru: 'Промахи: {n} из {max}',
    zh: '失误：{n}/{max}',
  },
  strike_hit: {
    en: 'Strike {n} of {max}',
    es: 'Fallo {n} de {max}',
    fr: 'Erreur {n} sur {max}',
    de: 'Fehler {n} von {max}',
    ru: 'Промах {n} из {max}',
    zh: '第 {n} 次失误（共 {max} 次）',
  },
  see_results: {
    en: 'See results',
    es: 'Ver resultados',
    fr: 'Voir les résultats',
    de: 'Ergebnis ansehen',
    ru: 'Посмотреть результаты',
    zh: '查看结果',
  },
  game_over: { en: 'Game over', es: 'Fin del juego', fr: 'Partie terminée', de: 'Spiel vorbei', ru: 'Игра окончена', zh: '游戏结束' },
  run_lasted: {
    en: 'You lasted',
    es: 'Aguantaste',
    fr: 'Tu as tenu',
    de: 'Du hast durchgehalten:',
    ru: 'Вы продержались',
    zh: '你坚持了',
  },
  personal_best: {
    en: 'Personal best: {rounds}',
    es: 'Tu mejor marca: {rounds}',
    fr: 'Ton record : {rounds}',
    de: 'Deine Bestleistung: {rounds}',
    ru: 'Ваш рекорд: {rounds}',
    zh: '个人最佳：{rounds}',
  },
  new_best: {
    en: 'New personal best!',
    es: '¡Nueva mejor marca!',
    fr: 'Nouveau record !',
    de: 'Neue Bestleistung!',
    ru: 'Новый рекорд!',
    zh: '新的个人最佳！',
  },
  play_again: { en: 'Play again', es: 'Jugar de nuevo', fr: 'Rejouer', de: 'Nochmal spielen', ru: 'Играть снова', zh: '再玩一次' },
  loading: { en: 'Loading…', es: 'Cargando…', fr: 'Chargement…', de: 'Wird geladen …', ru: 'Загрузка…', zh: '加载中……' },
  error_retry: {
    en: 'Something went wrong. Tap to retry.',
    es: 'Algo salió mal. Toca para reintentar.',
    fr: 'Une erreur s’est produite. Touche pour réessayer.',
    de: 'Etwas ist schiefgelaufen. Tippe, um es erneut zu versuchen.',
    ru: 'Что-то пошло не так. Нажмите, чтобы повторить.',
    zh: '出错了，点击重试。',
  },
  stats_calibration_title: {
    en: 'Calibration by item',
    es: 'Calibración por producto',
    fr: 'Calibrage par objet',
    de: 'Kalibrierung nach Gerät',
    ru: 'Калибровка по предметам',
    zh: '按物品的校准情况',
  },
  stats_calibration_desc: {
    en: 'Do people overestimate (→) or underestimate (←) the equivalent amount?',
    es: '¿La gente sobreestima (→) o subestima (←) la cantidad equivalente?',
    fr: 'Les joueurs surestiment-ils (→) ou sous-estiment-ils (←) la quantité équivalente ?',
    de: 'Überschätzen (→) oder unterschätzen (←) die Spieler die gleichwertige Menge?',
    ru: 'Игроки переоценивают (→) или недооценивают (←) эквивалентное количество?',
    zh: '大家是高估（→）还是低估（←）了等效数量？',
  },
  stats_not_enough: {
    en: 'Not enough data yet.',
    es: 'Aún no hay datos suficientes.',
    fr: 'Pas encore assez de données.',
    de: 'Noch nicht genug Daten.',
    ru: 'Пока недостаточно данных.',
    zh: '数据还不够。',
  },
  stats_misjudged_title: {
    en: 'Most misjudged comparisons',
    es: 'Comparaciones más malinterpretadas',
    fr: 'Les comparaisons les plus mal estimées',
    de: 'Die am stärksten verschätzten Vergleiche',
    ru: 'Сравнения с самыми большими ошибками',
    zh: '误判最多的比较',
  },
  stats_error_note: {
    en: 'Error is log₁₀ of (guess ÷ truth): +1 means guessing 10× too high.',
    es: 'El error es el log₁₀ de (respuesta ÷ valor real): +1 significa adivinar 10× de más.',
    fr: 'L’erreur est le log₁₀ de (réponse ÷ valeur réelle) : +1 signifie une réponse 10× trop élevée.',
    de: 'Der Fehler ist log₁₀(Tipp ÷ wahrer Wert): +1 bedeutet einen 10× zu hohen Tipp.',
    ru: 'Ошибка — это log₁₀(ответ ÷ истинное значение): +1 означает ответ, завышенный в 10 раз.',
    zh: '误差为 log₁₀（答案 ÷ 真实值）：+1 表示答案高出 10 倍。',
  },

  // ——— "How we computed this" breakdown steps (built server-side in emissions.ts) ———
  step_energy: {
    en: 'Energy consumed',
    es: 'Energía consumida',
    fr: 'Énergie consommée',
    de: 'Energieverbrauch',
    ru: 'Потреблённая энергия',
    zh: '消耗的能量',
  },
  step_useful: {
    en: 'Useful energy (physics)',
    es: 'Energía útil (física)',
    fr: 'Énergie utile (physique)',
    de: 'Nutzenergie (Physik)',
    ru: 'Полезная энергия (физика)',
    zh: '有效能量（物理计算）',
  },
  step_efficiency: {
    en: 'Device efficiency {pct}%',
    es: 'Eficiencia del aparato {pct}%',
    fr: 'Rendement de l’appareil : {pct} %',
    de: 'Wirkungsgrad des Geräts: {pct} %',
    ru: 'КПД устройства: {pct}%',
    zh: '设备效率 {pct}%',
  },
  step_avg_car: {
    en: 'Average car ({country}, {year})',
    es: 'Coche promedio ({country}, {year})',
    fr: 'Voiture moyenne ({country}, {year})',
    de: 'Durchschnittsauto ({country}, {year})',
    ru: 'Средний автомобиль ({country}, {year})',
    zh: '平均汽车（{country}，{year}）',
  },
  step_fuel_petrol: {
    en: 'Fuel burned (petrol)',
    es: 'Combustible quemado (gasolina)',
    fr: 'Carburant brûlé (essence)',
    de: 'Verbrannter Kraftstoff (Benzin)',
    ru: 'Сожжённое топливо (бензин)',
    zh: '燃料消耗（汽油）',
  },
  step_fuel_diesel: {
    en: 'Fuel burned (diesel)',
    es: 'Combustible quemado (diésel)',
    fr: 'Carburant brûlé (gazole)',
    de: 'Verbrannter Kraftstoff (Diesel)',
    ru: 'Сожжённое топливо (дизель)',
    zh: '燃料消耗（柴油）',
  },
  step_factor_pkm: {
    en: 'Emission factor per passenger-km',
    es: 'Factor de emisión por pasajero-km',
    fr: 'Facteur d’émission par passager-km',
    de: 'Emissionsfaktor pro Personenkilometer',
    ru: 'Коэффициент выбросов на пассажиро-километр',
    zh: '每人公里排放因子',
  },
  step_factor_km: {
    en: 'Emission factor per km',
    es: 'Factor de emisión por km',
    fr: 'Facteur d’émission par km',
    de: 'Emissionsfaktor pro km',
    ru: 'Коэффициент выбросов на км',
    zh: '每公里排放因子',
  },
  step_grid: {
    en: 'Grid intensity ({country}, {year}, Ember)',
    es: 'Intensidad de la red ({country}, {year}, Ember)',
    fr: 'Intensité carbone du réseau ({country}, {year}, Ember)',
    de: 'CO₂-Intensität des Stromnetzes ({country}, {year}, Ember)',
    ru: 'Углеродоёмкость энергосистемы ({country}, {year}, Ember)',
    zh: '电网碳强度（{country}，{year}，Ember）',
  },
  step_combustion_gas: {
    en: 'Natural gas combustion factor (per kWh of heat, same in every country)',
    es: 'Factor de combustión del gas natural (por kWh de calor, igual en todos los países)',
    fr: 'Facteur de combustion du gaz naturel (par kWh de chaleur, identique dans tous les pays)',
    de: 'Verbrennungsfaktor von Erdgas (pro kWh Wärme, in jedem Land gleich)',
    ru: 'Коэффициент сгорания природного газа (на кВт·ч тепла, одинаков во всех странах)',
    zh: '天然气燃烧排放因子（按每千瓦时热量计，各国相同）',
  },
  step_combustion_lpg: {
    en: 'LPG combustion factor (per kWh of heat, same in every country)',
    es: 'Factor de combustión del GLP (por kWh de calor, igual en todos los países)',
    fr: 'Facteur de combustion du GPL (par kWh de chaleur, identique dans tous les pays)',
    de: 'Verbrennungsfaktor von Flüssiggas (pro kWh Wärme, in jedem Land gleich)',
    ru: 'Коэффициент сгорания сжиженного газа (на кВт·ч тепла, одинаков во всех странах)',
    zh: '液化石油气燃烧排放因子（按每千瓦时热量计，各国相同）',
  },
  step_total: {
    en: 'Total emissions',
    es: 'Emisiones totales',
    fr: 'Émissions totales',
    de: 'Gesamtemissionen',
    ru: 'Итого выбросов',
    zh: '总排放',
  },
} satisfies Record<string, Localized>;

const STRINGS = { ...UI_STRINGS, ...ABOUT_STRINGS };

export type StringKey = keyof typeof STRINGS;
export const STRING_KEYS = Object.keys(STRINGS) as StringKey[];

export type Vars = Record<string, string | number>;

/** French elision: "de" / "que" before a vowel become "d’" / "qu’". */
function elideFr(s: string): string {
  return s.replace(/(^|[\s(«])(de|que) (?=[aeiouyàâäéèêëîïôöûüœAEIOUYÀÂÉÈÊÎÔŒ])/g, (_m, pre: string, w: string) =>
    `${pre}${w === 'de' ? 'd’' : 'qu’'}`,
  );
}

/** Format a number for use inside a sentence (no digit grouping, so years stay "2024"). */
export function fmtVar(v: number, lang: Lang): string {
  return v.toLocaleString(LOCALE_TAGS[lang], { useGrouping: false, maximumFractionDigits: 6 });
}

export function fill(template: string, lang: Lang, vars?: Vars): string {
  let s = template;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, typeof v === 'number' ? fmtVar(v, lang) : v);
    }
  }
  return lang === 'fr' ? elideFr(s) : s;
}

export function t(key: StringKey, lang: Lang, vars?: Vars): string {
  return fill(STRINGS[key][lang], lang, vars);
}

/** One string in every language — for server-built text the client localizes later. */
export function tAll(key: StringKey, vars?: (lang: Lang) => Vars): Localized {
  return Object.fromEntries(LANGS.map((lang) => [lang, t(key, lang, vars?.(lang))])) as Localized;
}

/** The raw catalog, for completeness tests. */
export function rawString(key: StringKey): Localized {
  return STRINGS[key];
}

export function capFirst(s: string, lang: Lang): string {
  return s.charAt(0).toLocaleUpperCase(LOCALE_TAGS[lang]) + s.slice(1);
}

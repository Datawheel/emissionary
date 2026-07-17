import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';
import AppHeader from '@/components/AppHeader';
import { getCountry, loadItems, loadSources } from '@/lib/data';
import { computeCO2 } from '@/lib/emissions';
import { formatCO2 } from '@/lib/format';
import { pickLang, t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Plain-language guide to what each source provides. */
const SOURCE_GUIDE: { id: string; en: string; es: string }[] = [
  {
    id: 'ember_yearly',
    en: 'How clean each country’s electricity is (grams of CO₂ per kWh generated), updated yearly for ~200 countries.',
    es: 'Qué tan limpia es la electricidad de cada país (gramos de CO₂ por kWh generado), actualizado cada año para ~200 países.',
  },
  {
    id: 'desnz_2025',
    en: 'The CO₂ released by burning fuels — natural gas, LPG, petrol, diesel — and per-km values for cars, buses, trains and flights. The standard used in corporate carbon reporting worldwide.',
    es: 'El CO₂ liberado al quemar combustibles — gas natural, GLP, gasolina, diésel — y valores por km para coches, autobuses, trenes y vuelos. El estándar del reporte corporativo de carbono en el mundo.',
  },
  {
    id: 'energystar',
    en: 'How much electricity real appliances use. We take the median of every certified model — for example, our refrigerator is the median of 4,659 certified fridges.',
    es: 'Cuánta electricidad usan los electrodomésticos reales. Tomamos la mediana de todos los modelos certificados — por ejemplo, nuestra nevera es la mediana de 4.659 neveras certificadas.',
  },
  {
    id: 'doe_tsd_cooking',
    en: 'Lab-measured cooking efficiency: how much of a stove’s energy actually reaches the pot (gas ~40%, electric coil ~74%).',
    es: 'Eficiencia de cocción medida en laboratorio: cuánta energía de la cocina llega realmente a la olla (gas ~40%, resistencia eléctrica ~74%).',
  },
  {
    id: 'energystar_induction',
    en: 'Induction cooking efficiency (~84%).',
    es: 'Eficiencia de la cocción por inducción (~84%).',
  },
  {
    id: 'epa_fueleconomy',
    en: 'Official US ratings for electric-car consumption, including charging losses.',
    es: 'Calificaciones oficiales de EE. UU. del consumo de coches eléctricos, incluidas las pérdidas de carga.',
  },
  {
    id: 'epa_trends',
    en: 'Real-world CO₂ per km of new cars in the United States.',
    es: 'CO₂ real por km de los coches nuevos en Estados Unidos.',
  },
  {
    id: 'codata_physics',
    en: 'Basic physics — for example, that heating one liter of water from 20 °C to boiling takes 0.093 kWh, no matter the device.',
    es: 'Física básica — por ejemplo, que calentar un litro de agua de 20 °C a ebullición requiere 0,093 kWh, sea cual sea el aparato.',
  },
  {
    id: 'doe_energysaver',
    en: 'Typical rated power for small appliances (hairdryers, toasters, irons) where no certified dataset exists — these values are marked “pending verification” in the appendix.',
    es: 'Potencia nominal típica de pequeños electrodomésticos (secadores, tostadoras, planchas) donde no existe base certificada — marcados “pendiente de verificación” en el apéndice.',
  },
];

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = pickLang((await searchParams).lang);
  const sourcesMd = readFileSync(join(process.cwd(), 'data', 'SOURCES.md'), 'utf8');
  const sourcesHtml = marked.parse(sourcesMd) as string;
  const registry = loadSources();

  // live worked example: 10 minutes of hairdryer in France vs Poland
  const hairdryer = loadItems().find((i) => i.id === 'hairdryer')!;
  const fra = getCountry('FRA');
  const pol = getCountry('POL');
  const exFra = computeCO2(hairdryer, 10, fra);
  const exPol = computeCO2(hairdryer, 10, pol);

  const en = lang === 'en';
  const h2 = { fontSize: '1.05rem', marginBottom: 8 } as const;

  return (
    <>
      <AppHeader lang={lang} />
      <main className="screen" style={{ maxWidth: 640 }}>
        <h1 style={{ fontSize: '1.4rem' }}>{t('about', lang)}</h1>

        <section className="card">
          <h2 style={h2}>{en ? 'What is Emissionary?' : '¿Qué es Emissionary?'}</h2>
          <p style={{ marginBottom: 8 }}>
            {en
              ? 'Emissionary is a game that trains your intuition about everyday CO₂ emissions. Each round compares two things you know — a hairdryer, a car trip, a load of laundry — and asks: how much of one equals the other? Most people are off by 10× or more. Playing fixes that.'
              : 'Emissionary es un juego que entrena tu intuición sobre las emisiones cotidianas de CO₂. Cada ronda compara dos cosas que conoces — un secador, un viaje en coche, una lavadora — y pregunta: ¿cuánto de una equivale a la otra? La mayoría se equivoca por 10× o más. Jugar lo corrige.'}
          </p>
          <p>
            {en
              ? 'The twist: the answer depends on where you live, because electricity is generated differently in every country. That is the deeper lesson the game wants you to take home.'
              : 'El giro: la respuesta depende de dónde vives, porque la electricidad se genera de forma distinta en cada país. Esa es la lección profunda que el juego quiere que te lleves.'}
          </p>
        </section>

        <section className="card">
          <h2 style={h2}>{en ? 'How we compute every answer' : 'Cómo calculamos cada respuesta'}</h2>
          <p style={{ marginBottom: 8 }}>
            {en ? 'One formula runs the whole game:' : 'Una sola fórmula mueve todo el juego:'}
          </p>
          <p className="takeaway" style={{ marginBottom: 10 }}>
            {en ? 'CO₂ = energy used × emissions per unit of energy' : 'CO₂ = energía usada × emisiones por unidad de energía'}
          </p>
          <p style={{ marginBottom: 8 }}>
            {en ? (
              <>
                Worked example — <strong>10 minutes of a hairdryer</strong> (1,800 W):
              </>
            ) : (
              <>
                Ejemplo — <strong>10 minutos de secador de pelo</strong> (1.800 W):
              </>
            )}
          </p>
          <ol style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
            <li>
              {en
                ? `Energy: 1,800 W × ${(10 / 60).toFixed(2)} h = 0.3 kWh — the same everywhere on Earth.`
                : `Energía: 1.800 W × ${(10 / 60).toFixed(2)} h = 0,3 kWh — igual en cualquier parte del mundo.`}
            </li>
            <li>
              {en
                ? `In France, a kWh of electricity causes ~${Math.round(fra.grid_gco2_kwh)} g of CO₂ (mostly nuclear and hydro), so: 0.3 × ${Math.round(fra.grid_gco2_kwh)} ≈ ${formatCO2(exFra.grams, lang)}.`
                : `En Francia, un kWh de electricidad causa ~${Math.round(fra.grid_gco2_kwh)} g de CO₂ (sobre todo nuclear e hidráulica), así que: 0,3 × ${Math.round(fra.grid_gco2_kwh)} ≈ ${formatCO2(exFra.grams, lang)}.`}
            </li>
            <li>
              {en
                ? `In Poland, where coal dominates, a kWh causes ~${Math.round(pol.grid_gco2_kwh)} g, so the very same 10 minutes emit ≈ ${formatCO2(exPol.grams, lang)} — about ${Math.round(exPol.grams / exFra.grams)}× more.`
                : `En Polonia, donde domina el carbón, un kWh causa ~${Math.round(pol.grid_gco2_kwh)} g, así que los mismos 10 minutos emiten ≈ ${formatCO2(exPol.grams, lang)} — unas ${Math.round(exPol.grams / exFra.grams)} veces más.`}
            </li>
          </ol>
          <p style={{ marginTop: 8 }}>
            {en
              ? 'Fuels are simpler: burning a liter of petrol releases the same 2.3 kg of CO₂ in every country — chemistry doesn’t care about geography. That is why gas-vs-electric comparisons flip between countries, and why the game asks where you live.'
              : 'Los combustibles son más simples: quemar un litro de gasolina libera los mismos 2,3 kg de CO₂ en cualquier país — a la química no le importa la geografía. Por eso las comparaciones gas-vs-eléctrico se invierten entre países, y por eso el juego pregunta dónde vives.'}
          </p>
        </section>

        <section className="card">
          <h2 style={h2}>{en ? 'What counts — and what doesn’t' : 'Qué contamos — y qué no'}</h2>
          <p style={{ marginBottom: 8 }}>
            {en
              ? 'We count only the emissions from using a product: the electricity it draws or the fuel it burns. We do not count making the product, shipping it, or disposing of it. This keeps every comparison fair — the same boundary on both sides — and the numbers verifiable.'
              : 'Contamos solo las emisiones de usar un producto: la electricidad que consume o el combustible que quema. No contamos fabricarlo, transportarlo ni desecharlo. Así cada comparación es justa — la misma frontera en ambos lados — y los números son verificables.'}
          </p>
          <p className="muted">
            {en
              ? 'The numbers are honest approximations of typical products. The game teaches orders of magnitude, not lab precision — being 15% off never matters here; being 15× off is the thing to cure.'
              : 'Los números son aproximaciones honestas de productos típicos. El juego enseña órdenes de magnitud, no precisión de laboratorio: equivocarse por 15% aquí no importa; equivocarse por 15× es lo que hay que curar.'}
          </p>
        </section>

        <section className="card">
          <h2 style={h2}>{en ? 'Scoring' : 'Puntuación'}</h2>
          <p>
            {en
              ? 'A perfect guess (within ±10%) earns 100 points. Points fall off evenly on the multiplicative scale until 10× off in either direction, which earns 0. Guessing 3× too high costs exactly as much as 3× too low. “Which emits more?” rounds are worth 50 points. Only Daily Games count for the leaderboard — Free Play is unlimited practice.'
              : 'Una respuesta perfecta (±10%) vale 100 puntos. Los puntos bajan uniformemente en la escala multiplicativa hasta 10× de error en cualquier dirección, que vale 0. Pasarse 3× cuesta exactamente lo mismo que quedarse corto 3×. Las rondas de “¿cuál emite más?” valen 50 puntos. Solo los juegos diarios cuentan para la clasificación — el juego libre es práctica ilimitada.'}
          </p>
        </section>

        <section className="card">
          <h2 style={h2}>{en ? 'Where the numbers come from' : 'De dónde salen los números'}</h2>
          <p className="muted" style={{ marginBottom: 10 }}>
            {en
              ? 'Every number in the game traces to a public, authoritative source. No blogs, no guesswork. In plain terms:'
              : 'Cada número del juego proviene de una fuente pública y autorizada. Sin blogs, sin conjeturas. En términos simples:'}
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            {SOURCE_GUIDE.map((g) => {
              const src = registry.find((s) => s.source_id === g.id);
              if (!src) return null;
              return (
                <div key={g.id} style={{ borderLeft: '3px solid var(--line)', paddingLeft: 10 }}>
                  <a href={src.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
                    {src.publisher}
                  </a>{' '}
                  <span className="muted">({src.year})</span>
                  <p style={{ fontSize: '0.92rem' }}>{en ? g.en : g.es}</p>
                </div>
              );
            })}
          </div>
          <details className="breakdown" style={{ marginTop: 12 }}>
            <summary>{en ? 'Full technical appendix (every item, every value)' : 'Apéndice técnico completo (cada producto, cada valor)'}</summary>
            <div style={{ overflowX: 'auto', fontSize: '0.85rem' }} dangerouslySetInnerHTML={{ __html: sourcesHtml }} />
          </details>
        </section>
      </main>
    </>
  );
}

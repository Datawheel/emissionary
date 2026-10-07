import { marked } from 'marked';
import AppHeader from '@/components/AppHeader';
import { getCountry, loadCountryFactors, loadItems, loadSources } from '@/lib/data';
import { computeCO2 } from '@/lib/emissions';
import { countryName } from '@/lib/country-names';
import { PETROL_KGCO2_PER_L } from '@/lib/constants';
import { clueLabel, formatCO2, formatExact, formatNumber } from '@/lib/format';
import { pluralWord, t, type StringKey } from '@/lib/i18n';
import { requestLang } from '@/lib/request-lang';
import { generateSourcesMd } from '@/lib/sources-md';

export const dynamic = 'force-dynamic';

/** Sources explained in plain language, in reading order (text: src_<id> in the catalog). */
const SOURCE_GUIDE = [
  'ember_yearly',
  'desnz_2025',
  'energystar',
  'doe_tsd_cooking',
  'energystar_induction',
  'epa_fueleconomy',
  'epa_trends',
  'codata_physics',
  'doe_energysaver',
] as const;

export default async function AboutPage() {
  const lang = await requestLang();
  const sourcesHtml = marked.parse(generateSourcesMd(lang)) as string;
  const registry = loadSources();

  // live worked example: 10 minutes of hairdryer in France vs Poland
  const hairdryer = loadItems().find((i) => i.id === 'hairdryer')!;
  const fra = getCountry('FRA');
  const pol = getCountry('POL');
  const exFra = computeCO2(hairdryer, 10, fra);
  const exPol = computeCO2(hairdryer, 10, pol);
  const kwh = formatNumber(exFra.energy_kwh!, lang);
  const ratio = Math.round(exPol.grams / exFra.grams);

  const h2 = { fontSize: '1.05rem', marginBottom: 8 } as const;
  const gridRows = [...loadCountryFactors()].sort((a, b) => a.grid_gco2_kwh - b.grid_gco2_kwh);
  // ribbon semantics: tint by intensity on a log scale from ~25 to ~750 gCO₂/kWh
  const gridColor = (g: number) => {
    const f = Math.min(1, Math.max(0, (Math.log10(g) - Math.log10(25)) / (Math.log10(750) - Math.log10(25))));
    return `hsl(${150 - 135 * f}, 55%, 38%)`;
  };

  // the example phrase is bold inside a translated sentence: split on {example}
  const [introBefore, introAfter] = t('about_example_intro', lang, { watts: formatExact(hairdryer.power_watts!, lang) }).split(
    '{example}',
  );

  return (
    <>
      <AppHeader lang={lang} />
      <main className="screen" style={{ maxWidth: 640 }}>
        <h1 style={{ fontSize: '1.4rem' }}>{t('about', lang)}</h1>

        <section className="card">
          <h2 style={h2}>{t('about_what_title', lang)}</h2>
          <p style={{ marginBottom: 8 }}>{t('about_what_p1', lang)}</p>
          <p>{t('about_what_p2', lang)}</p>
        </section>

        <section className="card">
          <h2 style={h2}>{t('about_how_title', lang)}</h2>
          <p style={{ marginBottom: 8 }}>{t('about_how_intro', lang)}</p>
          <p className="takeaway" style={{ marginBottom: 10 }}>
            {t('about_formula', lang)}
          </p>
          <p style={{ marginBottom: 8 }}>
            {introBefore}
            <strong>{clueLabel(10, hairdryer, lang)}</strong>
            {introAfter}
          </p>
          <ol style={{ paddingLeft: 20, display: 'grid', gap: 6 }}>
            <li>
              {t('about_example_step1', lang, {
                watts: formatExact(hairdryer.power_watts!, lang),
                hours: formatExact(Number((10 / 60).toFixed(2)), lang),
                kwh,
              })}
            </li>
            <li>
              {t('about_example_step2', lang, {
                g: Math.round(fra.grid_gco2_kwh),
                kwh,
                co2: formatCO2(exFra.grams, lang),
              })}
            </li>
            <li>
              {t('about_example_step3', lang, {
                g: Math.round(pol.grid_gco2_kwh),
                co2: formatCO2(exPol.grams, lang),
                ratio,
                times: pluralWord('times', ratio, lang),
              })}
            </li>
          </ol>
          <p style={{ marginTop: 8 }}>{t('about_fuels', lang, { petrol: formatNumber(PETROL_KGCO2_PER_L, lang) })}</p>
        </section>

        <section className="card">
          <h2 style={h2}>{t('about_boundary_title', lang)}</h2>
          <p style={{ marginBottom: 8 }}>{t('about_boundary_p1', lang)}</p>
          <p className="muted">{t('about_boundary_p2', lang)}</p>
        </section>

        <section className="card">
          <h2 style={h2}>{t('about_scoring_title', lang)}</h2>
          <p>{t('about_scoring_p', lang)}</p>
        </section>

        <section className="card">
          <h2 style={h2}>{t('about_grid_title', lang)}</h2>
          <p className="muted" style={{ marginBottom: 4 }}>
            {t('about_grid_note', lang)}
          </p>
          <p className="muted" style={{ marginBottom: 8 }}>
            {t('about_grid_source', lang)}{' '}
            <a href="https://ourworldindata.org/grapher/carbon-intensity-electricity" target="_blank" rel="noreferrer">
              {t('about_grid_source_link', lang)}
            </a>
          </p>
          <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 10 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: 'var(--card)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 10px' }}>{t('about_col_country', lang)}</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px' }}>gCO₂/kWh</th>
                  <th style={{ textAlign: 'right', padding: '6px 10px' }}>{t('about_col_year', lang)}</th>
                </tr>
              </thead>
              <tbody>
                {gridRows.map((c) => (
                  <tr key={c.iso3} style={{ borderTop: '1px solid var(--line)' }}>
                    <td style={{ padding: '5px 10px' }}>
                      {c.flag} {countryName(c.iso3, lang)}
                    </td>
                    <td
                      style={{
                        padding: '5px 10px',
                        textAlign: 'right',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        color: gridColor(c.grid_gco2_kwh),
                      }}
                    >
                      {Math.round(c.grid_gco2_kwh)}
                    </td>
                    <td style={{ padding: '5px 10px', textAlign: 'right', color: 'var(--ink-soft)' }}>{c.grid_year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2 style={h2}>{t('about_sources_title', lang)}</h2>
          <p className="muted" style={{ marginBottom: 10 }}>
            {t('about_sources_intro', lang)}
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            {SOURCE_GUIDE.map((id) => {
              const src = registry.find((s) => s.source_id === id);
              if (!src) return null;
              return (
                <div key={id} style={{ borderLeft: '3px solid var(--line)', paddingLeft: 10 }}>
                  <a href={src.url} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>
                    {src.publisher}
                  </a>{' '}
                  <span className="muted">({src.year})</span>
                  <p style={{ fontSize: '0.92rem' }}>{t(`src_${id}` as StringKey, lang)}</p>
                </div>
              );
            })}
          </div>
          {lang !== 'en' && (
            <p className="muted" style={{ marginTop: 8, fontSize: '0.85rem' }}>
              {t('about_titles_original', lang)}
            </p>
          )}
          <details className="breakdown" style={{ marginTop: 12 }}>
            <summary>{t('about_appendix_summary', lang)}</summary>
            <div style={{ overflowX: 'auto', fontSize: '0.85rem' }} dangerouslySetInnerHTML={{ __html: sourcesHtml }} />
          </details>
        </section>
      </main>
    </>
  );
}

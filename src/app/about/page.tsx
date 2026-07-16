import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';
import AppHeader from '@/components/AppHeader';
import { pickLang, t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const lang = pickLang((await searchParams).lang);
  const sourcesMd = readFileSync(join(process.cwd(), 'data', 'SOURCES.md'), 'utf8');
  const sourcesHtml = marked.parse(sourcesMd) as string;

  return (
    <>
      <AppHeader lang={lang} />
      <main className="screen" style={{ maxWidth: 640 }}>
        <h1 style={{ fontSize: '1.3rem' }}>{t('about', lang)}</h1>
        <section className="card">
          {lang === 'es' ? (
            <>
              <p style={{ marginBottom: 8 }}>
                <strong>Emissionary</strong> entrena tu intuición sobre el CO₂ cotidiano comparando pares de
                actividades. Cada cifra es <strong>solo de la fase de uso</strong>: la energía consumida al usar un
                producto multiplicada por el factor de emisión de su fuente de energía. La fabricación, el carbono
                incorporado y el fin de vida quedan fuera del alcance.
              </p>
              <p style={{ marginBottom: 8 }}>
                Las cifras son aproximaciones transparentes basadas en productos típicos y factores citados: el juego
                enseña órdenes de magnitud, no precisión de laboratorio.
              </p>
              <p>
                <strong>Puntuación:</strong> 100 puntos con un error de ±10%; decae linealmente en el espacio
                logarítmico hasta 0 puntos a 10× de distancia (en cualquier dirección). Adivinar 3× de más cuesta lo
                mismo que 3× de menos.
              </p>
            </>
          ) : (
            <>
              <p style={{ marginBottom: 8 }}>
                <strong>Emissionary</strong> trains your intuition about everyday CO₂ by comparing pairs of
                activities. Every figure is <strong>use-phase only</strong>: the energy consumed while using a product
                multiplied by the emission factor of its energy source. Manufacturing, embodied carbon, and
                end-of-life are out of scope.
              </p>
              <p style={{ marginBottom: 8 }}>
                Figures are transparent approximations based on typical products and cited factors — the game teaches
                orders of magnitude, not lab-grade precision.
              </p>
              <p>
                <strong>Scoring:</strong> 100 points within ±10% of the truth; linear decay in log space to 0 points
                at 10× off in either direction. Guessing 3× too high costs the same as 3× too low.
              </p>
            </>
          )}
        </section>
        <section
          className="card"
          style={{ overflowX: 'auto', fontSize: '0.9rem' }}
          dangerouslySetInnerHTML={{ __html: sourcesHtml }}
        />
      </main>
    </>
  );
}

/**
 * Renders the social preview cards — public/og-<lang>.png (1200×630) and
 * public/og-square.png — from scripts/og/card.html, with text from the i18n
 * catalog. Set SITE_URL to print your domain in the corner.
 *
 *   SITE_URL=https://emissionary.example.org npx tsx scripts/render-og.ts
 */
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { loadItems } from '../src/lib/data';
import { clueTitle, formatNumber, UNIT_SYMBOLS } from '../src/lib/format';
import { t } from '../src/lib/i18n';
import { LANGS, type Lang } from '../src/lib/types';

const root = process.cwd();
const template = readFileSync(join(root, 'scripts', 'og', 'card.html'), 'utf8');
const host = process.env.SITE_URL ? new URL(process.env.SITE_URL).host : '';
const hairdryer = loadItems().find((i) => i.id === 'hairdryer')!;
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function card(lang: Lang): string {
  const clue = esc(clueTitle(10, hairdryer, lang));
  const question = esc(t('og_question', lang)).replace(/\*\*(.+?)\*\*/, '<b class="q">$1</b>');
  return template
    .replaceAll('{{LANG}}', lang === 'zh' ? 'zh-Hans' : lang)
    .replaceAll('{{CLUE}}', clue)
    .replaceAll('{{QUESTION}}', question)
    .replaceAll('{{T1}}', `${formatNumber(1, lang)} ${UNIT_SYMBOLS[lang].h}`) // decade marks, in hours
    .replaceAll('{{T10}}', `${formatNumber(10, lang)} ${UNIT_SYMBOLS[lang].h}`)
    .replaceAll('{{T100}}', `${formatNumber(100, lang)} ${UNIT_SYMBOLS[lang].h}`)
    .replaceAll('{{TAGLINE}}', esc(t('tagline', lang)))
    .replaceAll('{{HOST}}', esc(host));
}

const browser = await chromium.launch();
for (const lang of LANGS) {
  const file = join(root, 'scripts', 'og', `.render-${lang}.html`);
  writeFileSync(file, card(lang));
  const shots: [string, number, number][] = [[`og-${lang}.png`, 1200, 630]];
  if (lang === 'en') shots.push(['og.png', 1200, 630], ['og-square.png', 1200, 1200]);
  for (const [name, width, height] of shots) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`file://${file}`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(root, 'public', name) });
    await page.close();
  }
  rmSync(file);
}
await browser.close();
console.log(`rendered cards for ${LANGS.join(', ')}${host ? ` with host ${host}` : ' (no host — set SITE_URL to print one)'}`);

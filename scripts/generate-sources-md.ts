/**
 * Writes data/SOURCES.md — the English edition of the methodology appendix
 * (spec §4.3.3). The generator lives in src/lib/sources-md.ts so the About
 * page can render the same appendix in every language.
 *
 * Usage: npx tsx scripts/generate-sources-md.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateSourcesMd } from '../src/lib/sources-md';

export { generateSourcesMd };

const isMain = process.argv[1]?.endsWith('generate-sources-md.ts');
if (isMain) {
  const md = generateSourcesMd('en');
  const out = join(process.cwd(), 'data', 'SOURCES.md');
  writeFileSync(out, md);
  console.log(`wrote ${out} (${md.length} chars)`);
}

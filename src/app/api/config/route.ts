import { NextResponse } from 'next/server';
import { loadCountryFactors, loadItems, PINNED_COUNTRIES } from '@/lib/data';

/**
 * Public config: country list and item METADATA only — deliberately no
 * grid factors, wattages, or any physical values (spec §12).
 */
export async function GET() {
  const countries = loadCountryFactors().map((c) => ({ iso3: c.iso3, name: c.name, flag: c.flag }));
  const items = loadItems().map((i) => ({
    id: i.id,
    name: i.name,
    emoji: i.emoji,
    category: i.category,
    typical_unit: i.typical_unit,
    event_noun: i.event_noun ?? null,
  }));
  return NextResponse.json(
    { countries, pinned: PINNED_COUNTRIES, items },
    { headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}

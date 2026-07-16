/**
 * Upserts data/items.json and data/country_factors.json into the database
 * (items/country_factors tables exist for FK integrity and analytics joins;
 * the JSON files remain the source of truth for physics).
 *
 * Usage: npx tsx scripts/sync-items.ts
 */
import pg from 'pg';
import { loadCountryFactors, loadItems } from '../src/lib/data';

export async function syncItems(databaseUrl: string): Promise<{ items: number; countries: number }> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const items = loadItems();
    for (const item of items) {
      await client.query(
        `INSERT INTO items (id, payload, version) VALUES ($1, $2, 1)
         ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, version = items.version + 1`,
        [item.id, JSON.stringify(item)],
      );
    }
    const factors = loadCountryFactors();
    for (const cf of factors) {
      await client.query(
        `INSERT INTO country_factors (iso3, grid_gco2_kwh, grid_year, car_gco2_km, car_year, sources)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (iso3) DO UPDATE SET
           grid_gco2_kwh = EXCLUDED.grid_gco2_kwh, grid_year = EXCLUDED.grid_year,
           car_gco2_km = EXCLUDED.car_gco2_km, car_year = EXCLUDED.car_year,
           sources = EXCLUDED.sources`,
        [cf.iso3, cf.grid_gco2_kwh, cf.grid_year, cf.car_gco2_km, cf.car_year,
         JSON.stringify({ grid: cf.grid_source_id, car: cf.car_source_id })],
      );
    }
    return { items: items.length, countries: factors.length };
  } finally {
    await client.end();
  }
}

const isMain = process.argv[1]?.endsWith('sync-items.ts');
if (isMain) {
  const url = process.env.DATABASE_URL ?? 'postgres://emissionary:emissionary_dev@localhost:5432/emissionary';
  syncItems(url).then(
    ({ items, countries }) => console.log(`synced ${items} items, ${countries} countries`),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}

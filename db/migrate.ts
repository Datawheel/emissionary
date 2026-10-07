/**
 * Tiny idempotent migration runner: applies db/migrations/*.sql in filename
 * order, recording applied files in schema_migrations.
 *
 * Usage: npx tsx db/migrate.ts
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const MIGRATIONS_DIR = join(process.cwd(), 'db', 'migrations');

export async function migrate(databaseUrl: string): Promise<string[]> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  const applied: string[] = [];
  try {
    // check first: CREATE ... IF NOT EXISTS still needs CREATE on the schema,
    // which an app role may lack (PostgreSQL 15+ default) once set up
    const { rows } = await client.query("SELECT to_regclass('schema_migrations') IS NOT NULL AS present");
    if (!rows[0].present) {
      await client.query(
        'CREATE TABLE schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
      );
    }
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const { rowCount } = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [file]);
      if (rowCount) continue;
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`migration ${file} failed: ${(err as Error).message}`);
      }
    }
  } finally {
    await client.end();
  }
  return applied;
}

const isMain = process.argv[1]?.endsWith('migrate.ts');
if (isMain) {
  const url = process.env.DATABASE_URL ?? 'postgres://emissionary:emissionary_dev@localhost:5432/emissionary';
  migrate(url).then(
    (applied) => console.log(applied.length ? `applied: ${applied.join(', ')}` : 'up to date'),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}

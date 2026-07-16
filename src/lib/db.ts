import pg from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __emissionaryPool: pg.Pool | undefined;
}

export function getPool(): pg.Pool {
  if (!globalThis.__emissionaryPool) {
    const connectionString =
      process.env.DATABASE_URL ?? 'postgres://emissionary:emissionary_dev@localhost:5432/emissionary';
    globalThis.__emissionaryPool = new pg.Pool({ connectionString, max: 10 });
  }
  return globalThis.__emissionaryPool;
}

export async function q<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await getPool().query<T>(sql, params);
  return res.rows;
}

export async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

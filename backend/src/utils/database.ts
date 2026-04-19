import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;

export function getDb(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });
  }
  return pool;
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const db = getDb();
  const start = Date.now();
  try {
    const result = await db.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
    }
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  } catch (error: any) {
    console.error('Database query error:', { text: text.substring(0, 100), error: error.message });
    throw error;
  }
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const db = getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function runMigrations(): Promise<void> {
  try {
    const db = getDb();
    
    // Create migrations table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Get already-run migrations
    const { rows: runMigrations } = await db.query('SELECT filename FROM migrations ORDER BY id');
    const runSet = new Set(runMigrations.map((r: any) => r.filename));

    // Read migration files
    const migrationsDir = path.join(__dirname, '../../migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found, skipping...');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (runSet.has(file)) continue;

      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      await db.query(sql);
      await db.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
      
      console.log(`✅ Migration completed: ${file}`);
    }
  } catch (error: any) {
    if (
      error?.code === 'ECONNREFUSED' || 
      error?.message?.includes('ECONNREFUSED') ||
      error?.message?.includes('Connection terminated due to connection timeout') ||
      error?.message?.includes('Connection terminated unexpectedly')
    ) {
      console.warn('⚠️  Database not available — running without PostgreSQL. Some features will be disabled.');
      return;
    }
    console.error('Migration error:', error);
    throw error;
  }
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

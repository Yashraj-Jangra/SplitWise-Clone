import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

/**
 * Oracle Autonomous Database Helper for Single-Table `SplitItDB`
 * Provides connection pooling with automatic keep-alive, dead socket eviction,
 * auto-reconnect, and seamless query retries for transient cloud network disconnects.
 */

const globalForOracle = globalThis as unknown as {
  oraclePoolPromise?: Promise<any> | null;
};

const isDev = process.env.NODE_ENV !== 'production';

async function resetOraclePool(): Promise<void> {
  if (globalForOracle.oraclePoolPromise) {
    const oldPromise = globalForOracle.oraclePoolPromise;
    globalForOracle.oraclePoolPromise = null;
    try {
      const oldPool = await oldPromise;
      if (oldPool && typeof oldPool.close === 'function') {
        await oldPool.close(5); // 5s drain timeout to gracefully release Oracle sessions
      }
    } catch {
      // Safe ignore error while closing severed pool
    }
  }
}

async function getOraclePool() {
  if (!globalForOracle.oraclePoolPromise) {
    globalForOracle.oraclePoolPromise = (async () => {
      const oracledb = await import('oracledb');
      oracledb.default.outFormat = oracledb.default.OUT_FORMAT_OBJECT;
      oracledb.default.autoCommit = true;

      const walletDir = process.env.ORA_WALLET_DIR 
        ? path.resolve(process.env.ORA_WALLET_DIR)
        : path.join(process.cwd(), 'wallet');

      const dbUser = process.env.ORA_DB_USER || 'ADMIN';
      const dbPassword = process.env.ORA_DB_PASSWORD;
      // Default to splititdb_low: has up to 300 concurrent connection capacity on Free Tier,
      // avoiding the strict 3-concurrent-session bottleneck of splititdb_high.
      const connectString = process.env.ORA_CONNECT_STRING || 'splititdb_low';

      if (!dbPassword) {
        throw new Error('ORA_DB_PASSWORD is not set in .env.local');
      }

      return oracledb.default.createPool({
        user: dbUser,
        password: dbPassword,
        connectString: connectString,
        configDir: walletDir,
        walletLocation: walletDir,
        walletPassword: dbPassword,
        // In dev, keep pool tiny (0-3 connections) so dev HMR never exhausts the 20-session limit
        // shared with the production server.
        poolMin: isDev ? 0 : 1,
        poolMax: isDev ? 3 : 10,
        poolIncrement: 1,
        poolTimeout: isDev ? 30 : 120, // Terminate idle dev connections faster
        poolPingInterval: 30, // Validate connection health before handing out of pool
        queueTimeout: isDev ? 15000 : 60000, // 15s queue in dev so failures fail fast rather than hang
        enableStatistics: false,
      });
    })().catch((err) => {
      globalForOracle.oraclePoolPromise = null; // Ensure future attempts can try reconnecting
      throw err;
    });
  }
  return globalForOracle.oraclePoolPromise;
}

function isRecoverableOracleError(err: any): boolean {
  if (!err) return false;
  if (err.isRecoverable) return true;
  const msg = (err.message || '').toUpperCase();
  const code = (err.code || '').toUpperCase();
  return (
    code === 'NJS-500' ||
    code === 'NJS-521' ||
    code === 'NJS-040' ||
    code === 'NJS-511' ||
    msg.includes('NJS-500') ||
    msg.includes('NJS-521') ||
    msg.includes('NJS-040') ||
    msg.includes('NJS-511') ||
    msg.includes('CLOSED OR BROKEN') ||
    msg.includes('END-OF-FILE ON COMMUNICATION CHANNEL') ||
    msg.includes('QUEUE TIMEOUT') ||
    msg.includes('ORA-03113') ||
    msg.includes('ORA-03114') ||
    msg.includes('ORA-03135') ||
    msg.includes('ORA-12523') ||
    msg.includes('ORA-12516') ||
    msg.includes('ORA-12519')
  );
}

export async function executeOracleQuery<T = any>(sql: string, params: any = {}, retries = 1): Promise<T[]> {
  try {
    const pool = await getOraclePool();
    const connection = await pool.getConnection();
    try {
      const result = await connection.execute(sql, params);
      return (result.rows || []) as T[];
    } finally {
      try {
        await connection.close();
      } catch {
        // Safe ignore on already-closed connection
      }
    }
  } catch (err: any) {
    if (retries > 0 && isRecoverableOracleError(err)) {
      console.warn(`Oracle connection severed (${err.code || 'recoverable'}), refreshing pool and retrying query...`);
      await resetOraclePool();
      return executeOracleQuery<T>(sql, params, retries - 1);
    }
    console.error('Oracle Query Error:', err.message || err);
    throw err;
  }
}

// High-performance in-memory TTL cache for read operations
const readCache = new Map<string, { expiresAt: number; data: any }>();
const CACHE_TTL_MS = 15000; // 15-second read cache

export function clearNoSqlCache(): void {
  readCache.clear();
}

/**
 * Get a single document by Primary Key (pk, sk)
 */
export async function getItem<T = any>(pk: string, sk: string): Promise<T | null> {
  const cacheKey = `getItem:${pk}:${sk}`;
  const cached = readCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data as T;
  }

  const rows = await executeOracleQuery<{ DATA: string | object }>(
    `SELECT data FROM SplitItDB WHERE pk = :pk AND sk = :sk`,
    { pk, sk }
  );

  if (!rows || rows.length === 0) return null;
  const raw = rows[0].DATA;
  const result = (typeof raw === 'string' ? JSON.parse(raw) : raw) as T;
  readCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data: result });
  return result;
}

/**
 * Insert or Update a single document in SplitItDB
 */
export async function putItem(
  pk: string,
  sk: string,
  entityType: string,
  data: Record<string, any>,
  gsi1pk: string | null = null,
  gsi1sk: string | null = null
): Promise<void> {
  clearNoSqlCache();
  const dataStr = JSON.stringify(data);
  const sql = `
    MERGE INTO SplitItDB dst
    USING (SELECT :pk AS pk, :sk AS sk FROM dual) src
    ON (dst.pk = src.pk AND dst.sk = src.sk)
    WHEN MATCHED THEN
      UPDATE SET dst.entityType = :entityType, dst.gsi1pk = :gsi1pk, dst.gsi1sk = :gsi1sk, dst.data = :data, dst.updatedAt = CURRENT_TIMESTAMP
    WHEN NOT MATCHED THEN
      INSERT (pk, sk, entityType, gsi1pk, gsi1sk, data)
      VALUES (:pk, :sk, :entityType, :gsi1pk, :gsi1sk, :data)
  `;

  await executeOracleQuery(sql, {
    pk,
    sk,
    entityType,
    gsi1pk,
    gsi1sk,
    data: dataStr,
  });
}

/**
 * Query all documents under a Partition Key (e.g., GROUP#123)
 */
export async function queryByPk<T = any>(pk: string): Promise<T[]> {
  const cacheKey = `queryByPk:${pk}`;
  const cached = readCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data as T[];
  }

  const rows = await executeOracleQuery<{ DATA: string | object }>(
    `SELECT data FROM SplitItDB WHERE pk = :pk OR LOWER(pk) = LOWER(:pk)`,
    { pk }
  );

  const result = rows.map((r) => (typeof r.DATA === 'string' ? JSON.parse(r.DATA) : r.DATA));
  readCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data: result });
  return result;
}

/**
 * Query documents by Entity Type (e.g., USER, GROUP)
 */
export async function queryByEntityType<T = any>(entityType: string): Promise<T[]> {
  const cacheKey = `queryByEntityType:${entityType}`;
  const cached = readCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data as T[];
  }

  const rows = await executeOracleQuery<{ DATA: string | object }>(
    `SELECT data FROM SplitItDB WHERE entityType = :entityType`,
    { entityType }
  );

  const result = rows.map((r) => (typeof r.DATA === 'string' ? JSON.parse(r.DATA) : r.DATA));
  readCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data: result });
  return result;
}

/**
 * Query documents by Global Secondary Index (e.g. EMAIL#user@example.com)
 */
export async function queryByGsi<T = any>(gsi1pk: string): Promise<T[]> {
  const cacheKey = `queryByGsi:${gsi1pk}`;
  const cached = readCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data as T[];
  }

  const rows = await executeOracleQuery<{ DATA: string | object }>(
    `SELECT data FROM SplitItDB WHERE gsi1pk = :gsi1pk OR LOWER(gsi1pk) = LOWER(:gsi1pk)`,
    { gsi1pk }
  );

  const result = rows.map((r) => (typeof r.DATA === 'string' ? JSON.parse(r.DATA) : r.DATA));
  readCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, data: result });
  return result;
}

/**
 * Delete a document by Primary Key (pk, sk)
 */
export async function deleteItem(pk: string, sk: string): Promise<void> {
  clearNoSqlCache();
  await executeOracleQuery(`DELETE FROM SplitItDB WHERE pk = :pk AND sk = :sk`, { pk, sk });
}

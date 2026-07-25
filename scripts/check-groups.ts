/**
 * Quick check: how many groups currently exist in Oracle vs. what Firebase has
 */
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

function parseData(raw: any): any {
  if (!raw) return null;
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return raw; } }
  return raw;
}

async function getPool() {
  const oracledb = await import('oracledb');
  oracledb.default.outFormat = oracledb.default.OUT_FORMAT_OBJECT;
  oracledb.default.autoCommit = true;
  const walletDir = process.env.ORA_WALLET_DIR
    ? path.resolve(process.env.ORA_WALLET_DIR)
    : path.join(process.cwd(), 'wallet');
  return oracledb.default.createPool({
    user: process.env.ORA_DB_USER || 'ADMIN',
    password: process.env.ORA_DB_PASSWORD!,
    connectString: process.env.ORA_CONNECT_STRING || 'splititdb_high',
    configDir: walletDir, walletLocation: walletDir,
    walletPassword: process.env.ORA_DB_PASSWORD!,
    poolMin: 1, poolMax: 3, poolIncrement: 1,
  });
}

async function q(pool: any, sql: string, params: any = {}): Promise<any[]> {
  const conn = await pool.getConnection();
  try { const r = await conn.execute(sql, params); return (r.rows || []) as any[]; }
  finally { await conn.close(); }
}

async function main() {
  const groups = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'oracle_migration_data/group.json'), 'utf8'));
  const members = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'oracle_migration_data/groupMember.json'), 'utf8'));

  console.log(`\nFirebase migration data has:`);
  console.log(`  ${groups.length} groups`);
  console.log(`  ${members.length} group members\n`);

  const pool = await getPool();
  try {
    const oracleGroups = await q(pool, `SELECT pk, sk, data FROM SplitItDB WHERE entityType = 'GROUP'`);
    console.log(`Oracle currently has: ${oracleGroups.length} GROUP rows\n`);

    const oracleGroupIds = new Set(oracleGroups.map(r => {
      const d = parseData(r.DATA);
      return d?.id;
    }));

    const missingGroups = groups.filter((g: any) => !oracleGroupIds.has(g.id));
    console.log(`Missing groups (${missingGroups.length}):`);
    missingGroups.forEach((g: any) => {
      const grpMembers = members.filter((m: any) => m.groupId === g.id);
      console.log(`  [${g.id}] "${g.name}" — creator: ${g.createdById} — members: ${grpMembers.map((m: any) => m.userId).join(', ') || 'none'}`);
    });

    if (missingGroups.length === 0) {
      console.log('  ✅ All groups already present in Oracle — no sync needed.');
    }
  } finally {
    await pool.close(0);
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

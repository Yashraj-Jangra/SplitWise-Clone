/**
 * Patch script: Fix all migrated users so Google OAuth linking works.
 *
 * Problems found:
 * 1. emailVerified = false for many migrated users → Better Auth blocks Google linking
 * 2. Account GSI keys use ACCOUNT#email#<emailAddress> not ACCOUNT#email#<userId>
 *    → adapter's findOne/findMany for accounts by userId can't find them
 * 3. providerId is 'email' not 'credential' → adapter misses credential lookups
 *
 * Fixes:
 * A. Set emailVerified = true for all users who have an account (they verified via old system)
 * B. Re-index account rows: add proper GSI keys ACCOUNT#<providerId>#<userId> so adapter finds them
 * C. Leave providerId as 'email' (don't rename — Better Auth also accepts 'email' provider)
 */
import path from 'path';
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
    configDir: walletDir,
    walletLocation: walletDir,
    walletPassword: process.env.ORA_DB_PASSWORD!,
    poolMin: 1, poolMax: 3, poolIncrement: 1,
  });
}

async function q(pool: any, sql: string, params: any = {}): Promise<any[]> {
  const conn = await pool.getConnection();
  try {
    const r = await conn.execute(sql, params);
    return (r.rows || []) as any[];
  } finally {
    await conn.close();
  }
}

async function execute(pool: any, sql: string, params: any = {}): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.execute(sql, params);
  } finally {
    await conn.close();
  }
}

async function main() {
  const pool = await getPool();
  let fixedEmailVerified = 0;
  let fixedAccountGsi = 0;
  let skipped = 0;

  try {
    // ── Step 1: Get all users ─────────────────────────────────────────────────
    console.log('Loading all users...');
    const userRows = await q(pool, `SELECT pk, sk, gsi1pk, data FROM SplitItDB WHERE entityType = 'USER'`);
    console.log(`Found ${userRows.length} user(s).`);

    // ── Step 2: Get all accounts ──────────────────────────────────────────────
    console.log('Loading all accounts...');
    const accountRows = await q(pool, `SELECT pk, sk, gsi1pk, gsi1sk, entityType, data FROM SplitItDB WHERE entityType = 'ACCOUNT'`);
    console.log(`Found ${accountRows.length} account(s).\n`);

    // ── Step 3: Fix each user ─────────────────────────────────────────────────
    for (const uRow of userRows) {
      const user = parseData(uRow.DATA);
      if (!user?.id || !user?.email) { skipped++; continue; }

      const userId = user.id;
      const email  = user.email.toLowerCase();

      // --- Fix A: emailVerified ---
      const ev = user.emailVerified;
      const isVerified = ev === true || ev === 'true' || ev === 1 || ev === '1';
      if (!isVerified) {
        const updatedUser = { ...user, emailVerified: true };
        await execute(pool,
          `UPDATE SplitItDB SET data = :data WHERE pk = :pk AND sk = :sk`,
          { data: JSON.stringify(updatedUser), pk: `USER#${userId}`, sk: 'PROFILE' }
        );
        console.log(`✅ emailVerified fixed: ${user.email}`);
        fixedEmailVerified++;
      }

      // --- Fix B: Re-index account GSI keys ---
      // Find all accounts that belong to this user
      const userAccounts = accountRows.filter(ar => {
        const d = parseData(ar.DATA);
        return d?.userId === userId;
      });

      for (const ar of userAccounts) {
        const acc = parseData(ar.DATA);
        const providerId = acc.providerId || 'credential';
        const accountId  = acc.accountId  || acc.id;

        // Expected GSI key format: ACCOUNT#<providerId>#<userId>
        const expectedGsi1pk = `ACCOUNT#${providerId}#${userId}`;
        const expectedSk     = `ACCOUNT#${providerId}#${accountId}`;
        const expectedPk     = `USER#${userId}`;

        const currentGsi = ar.GSI1PK || '';
        const currentSk  = ar.SK || '';
        const currentPk  = ar.PK || '';

        const needsGsifix   = currentGsi.toLowerCase() !== expectedGsi1pk.toLowerCase();
        const needsSkFix    = currentSk.toLowerCase()  !== expectedSk.toLowerCase();
        const needsPkFix    = currentPk.toLowerCase()  !== expectedPk.toLowerCase();

        if (needsGsifix || needsSkFix || needsPkFix) {
          console.log(`  🔧 Re-indexing account [${providerId}] for user ${email}`);
          console.log(`     old pk/sk: ${currentPk} / ${currentSk}`);
          console.log(`     old gsi  : ${currentGsi}`);
          console.log(`     new pk/sk: ${expectedPk} / ${expectedSk}`);
          console.log(`     new gsi  : ${expectedGsi1pk}`);

          // Delete old row
          await execute(pool,
            `DELETE FROM SplitItDB WHERE pk = :pk AND sk = :sk`,
            { pk: currentPk, sk: currentSk }
          );

          // Insert corrected row
          await execute(pool,
            `INSERT INTO SplitItDB (pk, sk, entityType, gsi1pk, gsi1sk, data)
             VALUES (:pk, :sk, :entityType, :gsi1pk, :gsi1sk, :data)`,
            {
              pk: expectedPk,
              sk: expectedSk,
              entityType: 'ACCOUNT',
              gsi1pk: expectedGsi1pk,
              gsi1sk: 'ACCOUNT',
              data: JSON.stringify({ ...acc, userId }),
            }
          );

          fixedAccountGsi++;
        }
      }
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log(`\n${'─'.repeat(60)}`);
    console.log('Patch complete!');
    console.log(`  emailVerified fixed : ${fixedEmailVerified} user(s)`);
    console.log(`  account GSI fixed   : ${fixedAccountGsi} account(s)`);
    console.log(`  skipped             : ${skipped} row(s)`);
  } finally {
    await pool.close(0);
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

/**
 * Diagnostic script - compare auth records for two users
 * jangrayash1505@gmail.com (working) vs bhuvanshkataria@gmail.com (broken)
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

function parseData(raw: any): any {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw; // already an object (Oracle returns CLOB/JSON as object)
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

async function inspectUser(pool: any, email: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`USER: ${email}`);
  console.log('='.repeat(70));

  const emailGsi = `EMAIL#${email.toLowerCase()}`;

  // 1. Find user via email GSI
  const gsiRows = await q(pool,
    `SELECT pk, sk, gsi1pk, gsi1sk, data FROM SplitItDB WHERE LOWER(gsi1pk) = LOWER(:v)`,
    { v: emailGsi }
  );

  if (gsiRows.length === 0) {
    console.log(`❌ No row found with gsi1pk = ${emailGsi}`);
    // Fallback: entity scan
    const allUsers = await q(pool, `SELECT data FROM SplitItDB WHERE entityType = 'USER'`);
    const match = allUsers.find(r => {
      const d = parseData(r.DATA);
      return d?.email?.toLowerCase() === email.toLowerCase();
    });
    if (match) {
      const d = parseData(match.DATA);
      console.log(`⚠️  Found via entity scan but EMAIL# GSI is MISSING or WRONG!`);
      console.log('  id:', d.id, '| emailVerified:', d.emailVerified);
    } else {
      console.log('❌ Not found in database at all.');
    }
    return;
  }

  const userRow = gsiRows[0];
  const user = parseData(userRow.DATA);
  
  console.log('\n📋 User record:');
  console.log('  pk            :', userRow.PK);
  console.log('  sk            :', userRow.SK);
  console.log('  gsi1pk        :', userRow.GSI1PK);
  console.log('  id            :', user.id);
  console.log('  email         :', user.email);
  console.log('  name          :', user.name);
  console.log('  emailVerified :', user.emailVerified, `(raw type: ${typeof user.emailVerified})`);
  console.log('  createdAt     :', user.createdAt);

  // 2. All rows under USER#{id}
  const pkRows = await q(pool,
    `SELECT pk, sk, gsi1pk, gsi1sk, data FROM SplitItDB WHERE LOWER(pk) = LOWER(:v)`,
    { v: `USER#${user.id}` }
  );

  const accounts = pkRows.filter(r => {
    const d = parseData(r.DATA);
    return !!d?.providerId;
  });

  console.log(`\n🔗 Account records (${accounts.length}) under USER#${user.id}:`);
  if (accounts.length === 0) {
    console.log('  ❌ NONE FOUND under pk = USER#' + user.id);
  }
  for (const r of accounts) {
    const d = parseData(r.DATA);
    console.log(`\n  sk        : ${r.SK}`);
    console.log(`  gsi1pk    : ${r.GSI1PK}`);
    console.log(`  providerId: ${d.providerId}`);
    console.log(`  accountId : ${d.accountId}`);
    console.log(`  password  : ${d.password ? `[len=${String(d.password).length}, starts=${String(d.password).substring(0,12)}]` : 'NULL/EMPTY'}`);
  }

  // 3. Check expected GSI keys
  const credGsi = await q(pool,
    `SELECT data FROM SplitItDB WHERE LOWER(gsi1pk) = LOWER(:v)`,
    { v: `ACCOUNT#credential#${user.id}` }
  );
  const googleGsi = await q(pool,
    `SELECT data FROM SplitItDB WHERE LOWER(gsi1pk) = LOWER(:v)`,
    { v: `ACCOUNT#google#${user.id}` }
  );

  console.log(`\n  GSI ACCOUNT#credential#${user.id}: ${credGsi.length} row(s)`);
  if (credGsi.length > 0) {
    const d = parseData(credGsi[0].DATA);
    console.log(`    password: ${d.password ? `len=${String(d.password).length}` : 'NULL'}`);
  }
  console.log(`  GSI ACCOUNT#google#${user.id}   : ${googleGsi.length} row(s)`);

  // 4. Diagnosis summary
  console.log('\n🩺 DIAGNOSIS:');
  const ev = user.emailVerified;
  const isVerified = ev === true || ev === 'true' || ev === 1 || ev === '1';
  if (!isVerified) {
    console.log(`  ❌ emailVerified = ${JSON.stringify(ev)} → NOT truthy!`);
    console.log(`     Better Auth requires emailVerified=true to link via trustedProviders.`);
    console.log(`     FIX: Run the patch script to set emailVerified=true for this user.`);
  } else {
    console.log(`  ✅ emailVerified = ${JSON.stringify(ev)}`);
  }

  if (credGsi.length === 0 && accounts.length === 0) {
    console.log('  ❌ No accounts found at all — account lookup is broken (adapter bug)');
  } else if (credGsi.length > 0) {
    const d = parseData(credGsi[0].DATA);
    const pw = d.password ? String(d.password) : '';
    if (!pw || pw.length < 20) {
      console.log('  ❌ Credential account found but password hash is INVALID/SHORT');
    } else {
      console.log('  ✅ Credential account with valid password hash');
    }
  }

  googleGsi.length > 0
    ? console.log('  ✅ Google account already linked')
    : console.log('  ⚠️  No Google account linked yet (normal for first Google sign-in)');
}

async function main() {
  const pool = await getPool();
  try {
    await inspectUser(pool, 'jangrayash1505@gmail.com');
    await inspectUser(pool, 'bhuvanshkataria@gmail.com');
  } finally {
    await pool.close(0);
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

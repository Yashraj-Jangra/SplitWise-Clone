import oracledb from 'oracledb';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const walletDir = process.env.ORA_WALLET_DIR
  ? path.resolve(process.env.ORA_WALLET_DIR)
  : path.join(process.cwd(), 'wallet');

async function setupVectorTable() {
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  oracledb.autoCommit = true;

  const pool = await oracledb.createPool({
    user: process.env.ORA_DB_USER || 'ADMIN',
    password: process.env.ORA_DB_PASSWORD!,
    connectString: process.env.ORA_CONNECT_STRING || 'splititdb_tp',
    configDir: walletDir,
    walletLocation: walletDir,
    walletPassword: process.env.ORA_DB_PASSWORD!,
    poolMin: 1,
    poolMax: 2,
    poolIncrement: 1,
  });

  const conn = await pool.getConnection();

  console.log('Checking if SPLITITVECTORS table exists...');
  const check = await conn.execute<{ TABLE_NAME: string }>(
    `SELECT table_name FROM user_tables WHERE table_name = 'SPLITITVECTORS'`
  );

  if (!check.rows || check.rows.length === 0) {
    console.log('Creating SPLITITVECTORS table with Oracle 23ai native VECTOR(2048, FLOAT32)...');
    await conn.execute(`
      CREATE TABLE SPLITITVECTORS (
        id           VARCHAR2(100)         NOT NULL PRIMARY KEY,
        userId       VARCHAR2(100)         NOT NULL,
        groupId      VARCHAR2(100),
        entityType   VARCHAR2(50)          NOT NULL,
        textChunk    VARCHAR2(4000)        NOT NULL,
        embedding    VECTOR(2048, FLOAT32) NOT NULL,
        createdAt    TIMESTAMP             DEFAULT CURRENT_TIMESTAMP,
        updatedAt    TIMESTAMP             DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('SPLITITVECTORS table created successfully.');
  } else {
    console.log('SPLITITVECTORS table already exists.');
  }

  // Create indexes
  try {
    console.log('Creating index on userId...');
    await conn.execute(`CREATE INDEX svec_user_idx ON SPLITITVECTORS (userId)`);
  } catch (err: any) {
    if (!err.message?.includes('ORA-00955') && !err.message?.includes('already used')) {
      console.warn('Index on userId warning:', err.message);
    }
  }

  try {
    console.log('Creating index on groupId...');
    await conn.execute(`CREATE INDEX svec_group_idx ON SPLITITVECTORS (groupId)`);
  } catch (err: any) {
    if (!err.message?.includes('ORA-00955') && !err.message?.includes('already used')) {
      console.warn('Index on groupId warning:', err.message);
    }
  }

  // Vector index
  try {
    console.log('Creating HNSW/Neighbor Partitions vector index...');
    await conn.execute(`
      CREATE VECTOR INDEX svec_idx
        ON SPLITITVECTORS (embedding)
        ORGANIZATION NEIGHBOR PARTITIONS
        WITH TARGET ACCURACY 95
        DISTANCE COSINE
    `);
    console.log('Vector index created successfully.');
  } catch (err: any) {
    if (!err.message?.includes('ORA-00955') && !err.message?.includes('already used')) {
      console.warn('Vector index creation note:', err.message);
    }
  }

  console.log('SPLITITVECTORS verification complete.');
  await conn.close();
  await pool.close();
}

setupVectorTable().catch((err) => {
  console.error('Fatal error setting up vector table:', err);
  process.exit(1);
});

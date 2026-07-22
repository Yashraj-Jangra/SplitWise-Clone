import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

/**
 * Imports single-table documents into Oracle Autonomous Database (AJD)
 * using standard Oracle SQL + Native JSON column (Thin Mode Compatible).
 */
async function main() {
  const walletDir = path.join(process.cwd(), 'wallet');
  const dbUser = process.env.ORA_DB_USER || 'ADMIN';
  const dbPassword = process.env.ORA_DB_PASSWORD;
  const connectString = process.env.ORA_CONNECT_STRING || 'splititdb_high';

  if (!fs.existsSync(walletDir)) {
    console.error('❌ Wallet directory not found at:', walletDir);
    process.exit(1);
  }

  if (!dbPassword) {
    console.error('❌ ORA_DB_PASSWORD missing in .env.local');
    process.exit(1);
  }

  const oracledb = await import('oracledb');
  oracledb.default.outFormat = oracledb.default.OUT_FORMAT_OBJECT;
  oracledb.default.autoCommit = true;

  try {
    console.log(`🔌 Connecting to Autonomous DB (${connectString}) in Thin Mode...`);
    const connection = await oracledb.default.getConnection({
      user: dbUser,
      password: dbPassword,
      connectString: connectString,
      configDir: walletDir,
      walletLocation: walletDir,
      walletPassword: dbPassword,
    });

    console.log('✅ Connected to Oracle Autonomous Database successfully!');

    // 1. Create SplitItDB Table if not exists
    console.log('🏗️  Ensuring table SplitItDB exists...');
    try {
      await connection.execute(`
        CREATE TABLE SplitItDB (
            pk VARCHAR2(255) NOT NULL,
            sk VARCHAR2(255) NOT NULL,
            entityType VARCHAR2(100) NOT NULL,
            gsi1pk VARCHAR2(255),
            gsi1sk VARCHAR2(255),
            data JSON NOT NULL,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT pk_splititdb PRIMARY KEY (pk, sk)
        )
      `);
      console.log('  ✅ Created table SplitItDB');
    } catch (err: any) {
      if (err.message && err.message.includes('ORA-00955')) {
        console.log('  ℹ️  Table SplitItDB already exists.');
      } else {
        console.warn('  ⚠️  Table creation note:', err.message);
      }
    }

    // 2. Create Indexes
    console.log('⚡ Ensuring Indexes exist...');
    try {
      await connection.execute(`CREATE INDEX idx_gsi1 ON SplitItDB (gsi1pk, gsi1sk)`);
    } catch (e) {}
    try {
      await connection.execute(`CREATE INDEX idx_entityType ON SplitItDB (entityType)`);
    } catch (e) {}

    // 3. Load Items
    const jsonPath = path.join(process.cwd(), 'oracle_migration_data', 'SplitItDB_single_table_items.json');
    if (!fs.existsSync(jsonPath)) {
      console.error('❌ Data file not found:', jsonPath);
      await connection.close();
      process.exit(1);
    }

    const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`📦 Found ${items.length} single-table documents to import.`);

    // Clear existing data for clean import
    console.log('🧹 Truncating table SplitItDB for fresh import...');
    try {
      await connection.execute(`TRUNCATE TABLE SplitItDB`);
    } catch (e) {}

    // Batch insert using executeMany
    console.log('🚀 Executing batch insert...');
    const sql = `
      INSERT INTO SplitItDB (pk, sk, entityType, gsi1pk, gsi1sk, data)
      VALUES (:pk, :sk, :entityType, :gsi1pk, :gsi1sk, :data)
    `;

    const batchSize = 250;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize).map((item: any) => ({
        pk: item.pk,
        sk: item.sk,
        entityType: item.entityType,
        gsi1pk: item.gsi1pk || null,
        gsi1sk: item.gsi1sk || null,
        data: JSON.stringify(item.data || {}),
      }));

      await connection.executeMany(sql, batch, {
        bindDefs: {
          pk: { type: oracledb.default.STRING, maxSize: 255 },
          sk: { type: oracledb.default.STRING, maxSize: 255 },
          entityType: { type: oracledb.default.STRING, maxSize: 100 },
          gsi1pk: { type: oracledb.default.STRING, maxSize: 255 },
          gsi1sk: { type: oracledb.default.STRING, maxSize: 255 },
          data: { type: oracledb.default.STRING, maxSize: 100000 },
        },
      });

      console.log(`  Progress: ${Math.min(i + batchSize, items.length)} / ${items.length} records imported.`);
    }

    // Verify row count
    const result: any = await connection.execute(`SELECT COUNT(*) AS total FROM SplitItDB`);
    const count = result.rows[0]?.TOTAL || result.rows[0]?.count || result.rows[0][0];

    console.log('\n===========================================');
    console.log('🎉 Live Data Migration to Oracle Autonomous DB Succeeded!');
    console.log(`✅ Total Records in Table SplitItDB: ${count}`);
    console.log('===========================================\n');

    await connection.close();
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message || err);
  }
}

main().catch(console.error);

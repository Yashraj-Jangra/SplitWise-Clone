import fs from 'fs';
import path from 'path';

/**
 * Script to import transformed Single-Table documents into Oracle Autonomous JSON Database (AJD)
 * using Oracle's MongoDB API Endpoint or MongoDB Connection URI.
 */
async function main() {
  const mongoUri = process.env.ORA_MONGO_URI || process.env.DATABASE_URL;

  if (!mongoUri || !mongoUri.startsWith('mongodb')) {
    console.log('\n===========================================');
    console.log('⚠️  Oracle MongoDB Connection URI Required');
    console.log('===========================================');
    console.log('To import data into your Oracle Autonomous JSON Database:');
    console.log('1. Go to Oracle Cloud Console -> Autonomous Database -> Your DB.');
    console.log('2. Click "Database Actions" -> "MongoDB API" (or Copy Connection String).');
    console.log('3. Set environment variable ORA_MONGO_URI in your .env.local file.');
    console.log('4. Re-run: npx tsx scripts/import-oracle-ajd.ts\n');
    process.exit(0);
  }

  try {
    const { MongoClient } = await import('mongodb');
    console.log('🔌 Connecting to Oracle Autonomous JSON Database via MongoDB API...');
    const client = new MongoClient(mongoUri);
    await client.connect();
    console.log('✅ Connected successfully!');

    const db = client.db('admin'); // Default database
    const collection = db.collection('SplitItCollection');

    const jsonPath = path.join(process.cwd(), 'oracle_migration_data', 'SplitItDB_single_table_items.json');
    if (!fs.existsSync(jsonPath)) {
      console.error('❌ Data file not found:', jsonPath);
      process.exit(1);
    }

    const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`📦 Found ${items.length} single-table documents to import.`);

    // Clear existing collection to ensure clean import
    await collection.deleteMany({});
    console.log('🧹 Cleared existing collection items.');

    // Insert items in batches of 100
    const batchSize = 100;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await collection.insertMany(batch);
      console.log(`  Progress: ${Math.min(i + batchSize, items.length)} / ${items.length} items imported.`);
    }

    // Create Indexes for ultra-fast queries
    console.log('⚡ Creating Indexes for fast lookups...');
    await collection.createIndex({ pk: 1, sk: 1 }, { unique: true });
    await collection.createIndex({ gsi1pk: 1, gsi1sk: 1 });
    await collection.createIndex({ entityType: 1 });

    console.log('\n===========================================');
    console.log('🎉 Live Data Import to Oracle AJD Complete!');
    console.log(`✅ Total Documents Uploaded: ${items.length}`);
    console.log('===========================================\n');

    await client.close();
  } catch (err: any) {
    console.error('❌ Import failed:', err.message);
  }
}

main().catch(console.error);

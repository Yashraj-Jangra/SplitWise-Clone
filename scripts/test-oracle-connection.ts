import { queryByEntityType, executeOracleQuery } from '../src/lib/nosql';

async function testConnection() {
  console.log('🔌 Testing Oracle Autonomous Database Connection...');
  try {
    const totalCountRes = await executeOracleQuery<{ COUNT: number }>('SELECT COUNT(*) as COUNT FROM SplitItDB');
    console.log('✅ Connected successfully to Oracle Autonomous Database!');
    console.log(`📊 Total Documents in SplitItDB: ${totalCountRes[0]?.COUNT}`);

    const types = ['USER', 'ACCOUNT', 'SESSION', 'GROUP', 'EXPENSE', 'SETTLEMENT', 'SETTINGS'];
    for (const t of types) {
      const items = await queryByEntityType<any>(t);
      console.log(`  • ${t}: ${items.length} items`);
    }

    const users = await queryByEntityType<any>('USER');
    if (users.length > 0) {
      console.log('\n👤 Sample User Document:');
      console.log(JSON.stringify(users[0], null, 2));
    }

    const accounts = await queryByEntityType<any>('ACCOUNT');
    if (accounts.length > 0) {
      console.log('\n🔑 Sample Account Document:');
      console.log(JSON.stringify(accounts[0], null, 2));
    }
  } catch (err) {
    console.error('❌ Connection failed:', err);
  }
}

testConnection();

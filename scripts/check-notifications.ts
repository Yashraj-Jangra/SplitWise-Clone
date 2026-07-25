import { queryByEntityType } from '../src/lib/nosql';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

async function main() {
  console.log('Querying all notifications in Oracle...');
  const notifs = await queryByEntityType<any>('NOTIFICATION');
  console.log(`Found ${notifs.length} notifications total.`);

  for (const n of notifs) {
    if (n.target === 'all_users' || n.type?.startsWith('broadcast')) {
      console.log(`\n📢 Broadcast found:`);
      console.log(`  ID: ${n.id}`);
      console.log(`  Type: ${n.type}`);
      console.log(`  Title: ${n.title}`);
      console.log(`  Body: ${n.body}`);
      console.log(`  Target: ${n.target}`);
      console.log(`  CreatedAt: ${n.createdAt}`);
      console.log(`  Reads (${n.reads?.length || 0}):`, JSON.stringify(n.reads));
    }
  }
}

main().catch(console.error);

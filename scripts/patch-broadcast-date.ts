import { getItem, putItem } from '../src/lib/nosql';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

async function main() {
  const notifId = 'M5H1qREsxctmkOGpcfav';
  console.log(`Fetching NOTIFICATION#${notifId}...`);
  const doc = await getItem<any>(`NOTIFICATION#${notifId}`, 'METADATA');
  if (!doc) {
    console.error('Notification not found!');
    return;
  }
  
  console.log('Current document:', JSON.stringify(doc, null, 2));
  
  doc.createdAt = '2026-07-20T04:59:02.113Z';
  
  console.log('Updating document...');
  await putItem(
    `NOTIFICATION#${notifId}`,
    'METADATA',
    'NOTIFICATION',
    doc,
    doc.actorId ? `USER#${doc.actorId}` : null,
    `NOTIFICATION#${notifId}`
  );
  
  console.log('Successfully patched notification date!');
  process.exit(0);
}

main().catch(console.error);

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const exportDir = path.join(process.cwd(), 'scripts', 'exports');

async function main() {
  console.log("=== Verification Report ===");

  const collections = [
    { name: 'users', json: 'users.json', table: 'user' },
    { name: 'groups', json: 'groups.json', table: 'group' },
    { name: 'expenses', json: 'expenses.json', table: 'expense' },
    { name: 'settlements', json: 'settlements.json', table: 'settlement' },
    { name: 'history', json: 'history.json', table: 'historyEvent' },
    { name: 'tickets', json: 'tickets.json', table: 'supportTicket' },
    { name: 'notifications', json: 'notifications_v2.json', table: 'notification' },
  ];

  for (const col of collections) {
    const jsonPath = path.join(exportDir, col.json);
    let jsonCount = 0;
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      jsonCount = data.length;
    }

    let dbCount = 0;
    try {
      dbCount = await (prisma[col.table as keyof typeof prisma] as any).count();
    } catch (e) {
      console.error(`Error counting rows for table ${col.table}:`, e);
    }

    const diff = dbCount - jsonCount;
    const status = diff === 0 ? '✔ MATCH' : `❌ MISMATCH (Diff: ${diff})`;
    console.log(`${col.name.padEnd(15)}: JSON = ${jsonCount.toString().padEnd(5)} | DB = ${dbCount.toString().padEnd(5)} | STATUS = ${status}`);
  }

  console.log("===========================");
}

main()
  .catch((e) => {
    console.error("Verification script error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

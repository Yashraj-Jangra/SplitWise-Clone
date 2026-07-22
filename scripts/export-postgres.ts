import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting PostgreSQL Data Export...');

  const outputDir = path.join(process.cwd(), 'oracle_migration_data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const models = [
    { name: 'user', fn: () => prisma.user.findMany() },
    { name: 'session', fn: () => prisma.session.findMany() },
    { name: 'account', fn: () => prisma.account.findMany() },
    { name: 'verification', fn: () => prisma.verification.findMany() },
    { name: 'group', fn: () => prisma.group.findMany() },
    { name: 'groupMember', fn: () => prisma.groupMember.findMany() },
    { name: 'expense', fn: () => prisma.expense.findMany() },
    { name: 'expensePayer', fn: () => prisma.expensePayer.findMany() },
    { name: 'expenseParticipant', fn: () => prisma.expenseParticipant.findMany() },
    { name: 'settlement', fn: () => prisma.settlement.findMany() },
    { name: 'historyEvent', fn: () => prisma.historyEvent.findMany() },
    { name: 'settings', fn: () => prisma.settings.findMany() },
    { name: 'supportTicket', fn: () => prisma.supportTicket.findMany() },
    { name: 'ticketMessage', fn: () => prisma.ticketMessage.findMany() },
    { name: 'notification', fn: () => prisma.notification.findMany() },
    { name: 'notificationRecipient', fn: () => prisma.notificationRecipient.findMany() },
    { name: 'notificationRead', fn: () => prisma.notificationRead.findMany() },
    { name: 'pushSubscription', fn: () => prisma.pushSubscription.findMany() },
    { name: 'userNotificationPrefs', fn: () => prisma.userNotificationPrefs.findMany() },
  ];

  let totalRecords = 0;
  const summary: Record<string, number> = {};

  for (const model of models) {
    try {
      const records = await model.fn();
      const filePath = path.join(outputDir, `${model.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
      summary[model.name] = records.length;
      totalRecords += records.length;
      console.log(`  ✅ Exported ${records.length.toString().padStart(5)} records -> oracle_migration_data/${model.name}.json`);
    } catch (err: any) {
      console.error(`  ❌ Failed to export ${model.name}:`, err.message);
    }
  }

  console.log('\n===========================================');
  console.log(`🎉 Total Records Exported: ${totalRecords}`);
  console.log('===========================================\n');
}

main()
  .catch((e) => {
    console.error('Fatal export error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

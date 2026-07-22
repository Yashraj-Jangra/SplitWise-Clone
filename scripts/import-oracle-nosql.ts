import fs from 'fs';
import path from 'path';

// Note: Requires npm install oracle-nosqldb for live execution against OCI
// import { NoSQLClient, Region } from 'oracle-nosqldb';

export interface SingleTableItem {
  pk: string;
  sk: string;
  entityType: string;
  gsi1pk?: string | null;
  gsi1sk?: string | null;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export function transformToSingleTable(): SingleTableItem[] {
  const dataDir = path.join(process.cwd(), 'oracle_migration_data');
  const readJson = (filename: string) => {
    const filePath = path.join(dataDir, filename);
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  };

  const users = readJson('user.json');
  const sessions = readJson('session.json');
  const accounts = readJson('account.json');
  const groups = readJson('group.json');
  const groupMembers = readJson('groupMember.json');
  const expenses = readJson('expense.json');
  const expensePayers = readJson('expensePayer.json');
  const expenseParticipants = readJson('expenseParticipant.json');
  const settlements = readJson('settlement.json');
  const historyEvents = readJson('historyEvent.json');
  const settings = readJson('settings.json');
  const tickets = readJson('supportTicket.json');
  const ticketMessages = readJson('ticketMessage.json');
  const notifications = readJson('notification.json');
  const notificationReads = readJson('notificationRead.json');
  const userPrefs = readJson('userNotificationPrefs.json');

  const items: SingleTableItem[] = [];

  // 1. USERS
  for (const u of users) {
    const { id, createdAt, updatedAt, email, ...userData } = u;
    items.push({
      pk: `USER#${id}`,
      sk: 'PROFILE',
      entityType: 'USER',
      gsi1pk: `EMAIL#${email}`,
      gsi1sk: 'PROFILE',
      data: { id, email, ...userData },
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: updatedAt || new Date().toISOString(),
    });
  }

  // 2. SESSIONS
  for (const s of sessions) {
    const { id, userId, token, createdAt, updatedAt, ...sessData } = s;
    items.push({
      pk: `USER#${userId}`,
      sk: `SESSION#${id}`,
      entityType: 'SESSION',
      gsi1pk: `TOKEN#${token}`,
      gsi1sk: 'SESSION',
      data: { id, userId, token, ...sessData },
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: updatedAt || new Date().toISOString(),
    });
  }

  // 3. ACCOUNTS
  for (const a of accounts) {
    const { id, userId, providerId, accountId, createdAt, updatedAt, ...accData } = a;
    items.push({
      pk: `USER#${userId}`,
      sk: `ACCOUNT#${providerId}#${accountId}`,
      entityType: 'ACCOUNT',
      gsi1pk: `ACCOUNT#${providerId}#${accountId}`,
      gsi1sk: 'ACCOUNT',
      data: { id, userId, providerId, accountId, ...accData },
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: updatedAt || new Date().toISOString(),
    });
  }

  // 4. GROUPS (With embedded members array)
  for (const g of groups) {
    const { id, createdAt, createdById, ...grpData } = g;
    const members = groupMembers.filter((m: any) => m.groupId === id);
    items.push({
      pk: `GROUP#${id}`,
      sk: 'METADATA',
      entityType: 'GROUP',
      gsi1pk: `USER#${createdById}`,
      gsi1sk: `GROUP#${id}`,
      data: { id, createdById, members, ...grpData },
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 5. EXPENSES (With embedded payers & participants arrays!)
  for (const e of expenses) {
    const { id, groupId, createdAt, expenseCreatorId, ...expData } = e;
    const payers = expensePayers.filter((p: any) => p.expenseId === id);
    const participants = expenseParticipants.filter((pt: any) => pt.expenseId === id);

    items.push({
      pk: `GROUP#${groupId}`,
      sk: `EXPENSE#${id}`,
      entityType: 'EXPENSE',
      gsi1pk: `USER#${expenseCreatorId}`,
      gsi1sk: `EXPENSE#${id}`,
      data: {
        id,
        groupId,
        expenseCreatorId,
        payers,
        participants,
        ...expData,
      },
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 6. SETTLEMENTS
  for (const st of settlements) {
    const { id, groupId, createdAt, paidById, paidToId, ...stData } = st;
    items.push({
      pk: `GROUP#${groupId}`,
      sk: `SETTLEMENT#${id}`,
      entityType: 'SETTLEMENT',
      gsi1pk: `USER#${paidById}`,
      gsi1sk: `SETTLEMENT#${id}`,
      data: { id, groupId, paidById, paidToId, ...stData },
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 7. HISTORY EVENTS
  for (const h of historyEvents) {
    const { id, groupId, timestamp, actorId, ...hData } = h;
    items.push({
      pk: `GROUP#${groupId}`,
      sk: `HISTORY#${timestamp || 'UNTIMED'}#${id}`,
      entityType: 'HISTORY',
      gsi1pk: `USER#${actorId}`,
      gsi1sk: `HISTORY#${id}`,
      data: { id, groupId, actorId, timestamp, ...hData },
      createdAt: timestamp || new Date().toISOString(),
      updatedAt: timestamp || new Date().toISOString(),
    });
  }

  // 8. SUPPORT TICKETS (With embedded messages array!)
  for (const t of tickets) {
    const { id, userId, createdAt, updatedAt, ...tData } = t;
    const messages = ticketMessages.filter((m: any) => m.ticketId === id);
    items.push({
      pk: `TICKET#${id}`,
      sk: 'METADATA',
      entityType: 'TICKET',
      gsi1pk: `USER#${userId}`,
      gsi1sk: `TICKET#${id}`,
      data: { id, userId, messages, ...tData },
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: updatedAt || new Date().toISOString(),
    });
  }

  // 9. NOTIFICATIONS
  for (const n of notifications) {
    const { id, actorId, createdAt, ...nData } = n;
    const reads = notificationReads.filter((r: any) => r.notificationId === id);
    items.push({
      pk: `NOTIFICATION#${id}`,
      sk: 'METADATA',
      entityType: 'NOTIFICATION',
      gsi1pk: actorId ? `USER#${actorId}` : null,
      gsi1sk: `NOTIFICATION#${id}`,
      data: { id, actorId, reads, ...nData },
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: createdAt || new Date().toISOString(),
    });
  }

  // 10. USER NOTIFICATION PREFS
  for (const p of userPrefs) {
    const { userId, updatedAt, ...pData } = p;
    items.push({
      pk: `USER#${userId}`,
      sk: 'NOTIFICATION_PREFS',
      entityType: 'USER_PREFS',
      data: { userId, ...pData },
      createdAt: new Date().toISOString(),
      updatedAt: updatedAt || new Date().toISOString(),
    });
  }

  // 11. SETTINGS
  for (const s of settings) {
    const { id, updatedAt, ...sData } = s;
    items.push({
      pk: 'SYSTEM',
      sk: 'SETTINGS',
      entityType: 'SETTINGS',
      data: { id, ...sData },
      createdAt: new Date().toISOString(),
      updatedAt: updatedAt || new Date().toISOString(),
    });
  }

  return items;
}

async function main() {
  console.log('🔄 Transforming relational PostgreSQL data to Single-Table (SplitItDB)...');
  const items = transformToSingleTable();

  const dataDir = path.join(process.cwd(), 'oracle_migration_data');
  const outputPath = path.join(dataDir, 'SplitItDB_single_table_items.json');
  fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));

  console.log(`\n===========================================`);
  console.log(`✅ Single-Table Transformation Complete!`);
  console.log(`📦 Transformed Items Count: ${items.length}`);
  console.log(`📄 Saved output to: oracle_migration_data/SplitItDB_single_table_items.json`);
  console.log(`===========================================\n`);
}

if (require.main === module) {
  main().catch(console.error);
}

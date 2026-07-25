/**
 * EMERGENCY RESTORE: Re-import all groups from oracle_migration_data/group.json
 * and oracle_migration_data/groupMember.json back into Oracle.
 * 
 * The sync script overwrote groups with empty members[] from Firebase.
 * This script restores the correct member data from the migration files.
 */
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import { putItem } from '../src/lib/nosql';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

async function main() {
  const dataDir = path.join(process.cwd(), 'oracle_migration_data');

  const groups  = JSON.parse(fs.readFileSync(path.join(dataDir, 'group.json'),       'utf8'));
  const members = JSON.parse(fs.readFileSync(path.join(dataDir, 'groupMember.json'), 'utf8'));

  console.log(`\nRestoring ${groups.length} groups with ${members.length} member records...`);

  // Build member lookup: groupId → [{userId, joinedAt}]
  const memberMap = new Map<string, { userId: string; joinedAt: string }[]>();
  for (const m of members) {
    if (!memberMap.has(m.groupId)) memberMap.set(m.groupId, []);
    memberMap.get(m.groupId)!.push({ userId: m.userId, joinedAt: m.joinedAt });
  }

  let restored = 0;
  for (const g of groups) {
    const { id, createdAt, createdById, ...rest } = g;
    const grpMembers = memberMap.get(id) || [];

    const groupDoc = {
      id,
      createdById,
      members: grpMembers,   // ← correct members from migration data
      ...rest,
      createdAt: createdAt || new Date().toISOString(),
    };

    await putItem(
      `GROUP#${id}`,
      'METADATA',
      'GROUP',
      groupDoc,
      `USER#${createdById}`,
      `GROUP#${id}`,
    );

    console.log(`  ✅ [${id}] "${g.name}" — ${grpMembers.length} member(s): ${grpMembers.map(m => m.userId).join(', ') || 'creator only'}`);
    restored++;
  }

  console.log(`\n✅ Restored ${restored} groups to Oracle. Groups should be visible again.`);
  process.exit(0);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });

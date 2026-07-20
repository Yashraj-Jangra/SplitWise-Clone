import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const exportDir = path.join(process.cwd(), 'scripts', 'exports');

function toDate(val: any): Date {
  if (!val) return new Date();
  if (typeof val === 'object' && val._seconds !== undefined) {
    return new Date(val._seconds * 1000);
  }
  return new Date(val);
}

async function main() {
  console.log("Starting import to PostgreSQL...");

  // 1. Settings
  const settingsPath = path.join(exportDir, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    const raw = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const general = raw.general || {};
    const categories = raw.expenseCategories || {};
    const mergedData = {
      ...general,
      expenseCategories: categories.categories || general.expenseCategories,
    };
    await prisma.settings.upsert({
      where: { id: 'general' },
      create: { id: 'general', data: mergedData },
      update: { data: mergedData },
    });
    console.log("✔ Imported site settings.");
  }

  // 2. Users & Accounts
  const usersPath = path.join(exportDir, 'users.json');
  if (fs.existsSync(usersPath)) {
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    const seenEmails = new Set<string>();
    const seenUsernames = new Set<string>();

    for (const u of users) {
      const name = `${u.firstName || 'User'} ${u.lastName || ''}`.trim();
      
      let email = u.email;
      if (email) {
        email = email.toLowerCase().trim();
        if (seenEmails.has(email)) {
          const parts = email.split('@');
          email = `${parts[0]}+${u.id.substring(0, 5)}@${parts[1]}`;
        }
        seenEmails.add(email);
      } else {
        email = `missing-email-${u.id}@placeholder.com`;
      }

      let username = u.username;
      if (username) {
        username = username.toLowerCase().trim();
        if (seenUsernames.has(username)) {
          username = `${username}_${u.id.substring(0, 5)}`;
        }
        seenUsernames.add(username);
      }

      await prisma.user.upsert({
        where: { id: u.id },
        create: {
          id: u.id,
          name,
          email,
          emailVerified: u.emailVerified || false,
          image: u.avatarUrl || null,
          role: u.role || 'user',
          firstName: u.firstName || null,
          lastName: u.lastName || null,
          username: username || null,
          avatarUrl: u.avatarUrl || null,
          countryCode: u.countryCode || null,
          mobileNumber: u.mobileNumber || null,
          dob: u.dob ? toDate(u.dob) : null,
          createdAt: toDate(u.createdAt),
          updatedAt: toDate(u.updatedAt || u.createdAt),
        },
        update: {}
      });

      // Create credential account for Better Auth so they can do password resets
      await prisma.account.upsert({
        where: { providerId_accountId: { providerId: 'email', accountId: email } },
        create: {
          userId: u.id,
          providerId: 'email',
          accountId: email,
          password: 'MIGRATED_PASSWORD_RESET_REQUIRED', // placeholder
        },
        update: {}
      });
    }
    console.log(`✔ Imported ${users.length} users and mapped to auth accounts.`);
  }

  // 3. Groups & Members
  const groupsPath = path.join(exportDir, 'groups.json');
  if (fs.existsSync(groupsPath)) {
    const groups = JSON.parse(fs.readFileSync(groupsPath, 'utf8'));
    for (const g of groups) {
      await prisma.group.upsert({
        where: { id: g.id },
        create: {
          id: g.id,
          name: g.name,
          description: g.description || null,
          coverImageUrl: g.coverImageUrl || null,
          currency: g.currency || null,
          totalExpenses: g.totalExpenses || 0,
          createdById: g.createdById,
          archivedAt: g.archivedAt ? toDate(g.archivedAt) : null,
          createdAt: toDate(g.createdAt),
        },
        update: {}
      });

      if (g.memberIds && Array.isArray(g.memberIds)) {
        await prisma.groupMember.createMany({
          data: g.memberIds.map((uid: string) => ({
            groupId: g.id,
            userId: uid,
          })),
          skipDuplicates: true,
        });
      }
    }
    console.log(`✔ Imported ${groups.length} groups and membership relations.`);
  }

  // 4. Expenses, Payers & Participants
  const expensesPath = path.join(exportDir, 'expenses.json');
  if (fs.existsSync(expensesPath)) {
    const expenses = JSON.parse(fs.readFileSync(expensesPath, 'utf8'));
    for (const e of expenses) {
      await prisma.expense.upsert({
        where: { id: e.id },
        create: {
          id: e.id,
          groupId: e.groupId,
          description: e.description,
          amount: e.amount,
          splitType: e.splitType,
          category: e.category || null,
          masterCategory: e.masterCategory || null,
          notes: e.notes || null,
          receiptImageUrl: e.receiptImageUrl || null,
          expenseCreatorId: e.expenseCreatorId,
          groupCreatorId: e.groupCreatorId || e.expenseCreatorId,
          date: toDate(e.date),
          createdAt: toDate(e.createdAt || e.date),
        },
        update: {}
      });

      if (e.payers && Array.isArray(e.payers)) {
        await prisma.expensePayer.createMany({
          data: e.payers.map((p: any) => ({
            expenseId: e.id,
            userId: p.userId,
            amount: p.amount,
          })),
          skipDuplicates: true,
        });
      }

      if (e.participants && Array.isArray(e.participants)) {
        await prisma.expenseParticipant.createMany({
          data: e.participants.map((p: any) => ({
            expenseId: e.id,
            userId: p.userId,
            amountOwed: p.amountOwed,
            share: p.share || null,
          })),
          skipDuplicates: true,
        });
      }
    }
    console.log(`✔ Imported ${expenses.length} expenses with payers and participants.`);
  }

  // 5. Settlements
  const settlementsPath = path.join(exportDir, 'settlements.json');
  if (fs.existsSync(settlementsPath)) {
    const settlements = JSON.parse(fs.readFileSync(settlementsPath, 'utf8'));
    for (const s of settlements) {
      await prisma.settlement.upsert({
        where: { id: s.id },
        create: {
          id: s.id,
          groupId: s.groupId,
          paidById: s.paidById,
          paidToId: s.paidToId,
          amount: s.amount,
          date: toDate(s.date),
          notes: s.notes || null,
          createdAt: toDate(s.createdAt || s.date),
        },
        update: {}
      });
    }
    console.log(`✔ Imported ${settlements.length} settlements.`);
  }

  // 6. History Events
  const historyPath = path.join(exportDir, 'history.json');
  if (fs.existsSync(historyPath)) {
    const events = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    for (const ev of events) {
      await prisma.historyEvent.upsert({
        where: { id: ev.id },
        create: {
          id: ev.id,
          groupId: ev.groupId,
          eventType: ev.eventType,
          actorId: ev.actorId,
          description: ev.description,
          data: ev.data || null,
          restored: ev.restored || false,
          expenseId: ev.expenseId || null,
          timestamp: toDate(ev.timestamp),
        },
        update: {}
      });
    }
    console.log(`✔ Imported ${events.length} history log events.`);
  }

  // 7. Support Tickets & Messages
  const ticketsPath = path.join(exportDir, 'tickets.json');
  if (fs.existsSync(ticketsPath)) {
    const tickets = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
    for (const t of tickets) {
      await prisma.supportTicket.upsert({
        where: { id: t.id },
        create: {
          id: t.id,
          userId: t.userId,
          userName: t.userName,
          userEmail: t.userEmail,
          subject: t.subject,
          category: t.category,
          status: t.status,
          assignedToId: t.assignedToId || null,
          createdAt: toDate(t.createdAt),
          updatedAt: toDate(t.updatedAt),
        },
        update: {}
      });

      if (t.messages && Array.isArray(t.messages)) {
        await prisma.ticketMessage.createMany({
          data: t.messages.map((m: any) => ({
            ticketId: t.id,
            sentById: m.sentById,
            message: m.message,
            sentAt: toDate(m.sentAt),
          })),
          skipDuplicates: true,
        });
      }
    }
    console.log(`✔ Imported ${tickets.length} support tickets and replies.`);
  }

  // 8. Notifications
  const notifsPath = path.join(exportDir, 'notifications_v2.json');
  if (fs.existsSync(notifsPath)) {
    const notifications = JSON.parse(fs.readFileSync(notifsPath, 'utf8'));
    for (const n of notifications) {
      await prisma.notification.upsert({
        where: { id: n.id },
        create: {
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          actorId: n.actorId || null,
          groupId: n.groupId || null,
          expenseId: n.expenseId || null,
          settlementId: n.settlementId || null,
          target: n.target || 'specific_users',
          channels: n.channels || ['in_app'],
          imageUrl: n.imageUrl || null,
          createdAt: toDate(n.createdAt),
          createdBy: n.createdBy || null,
        },
        update: {}
      });

      if (n.recipientIds && Array.isArray(n.recipientIds)) {
        await prisma.notificationRecipient.createMany({
          data: n.recipientIds.map((uid: string) => ({
            notificationId: n.id,
            userId: uid,
          })),
          skipDuplicates: true,
        });
      }

      if (n.readBy && Array.isArray(n.readBy)) {
        await prisma.notificationRead.createMany({
          data: n.readBy.map((uid: string) => ({
            notificationId: n.id,
            userId: uid,
            readAt: toDate(n.createdAt), // fallback read time
          })),
          skipDuplicates: true,
        });
      }
    }
    console.log(`✔ Imported ${notifications.length} notifications, recipients, and read states.`);
  }

  // 9. Notification Prefs
  const prefsPath = path.join(exportDir, 'user_notification_prefs.json');
  if (fs.existsSync(prefsPath)) {
    const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
    for (const p of prefs) {
      // Find or create in case user wasn't imported properly
      await prisma.userNotificationPrefs.upsert({
        where: { userId: p.id },
        create: {
          userId: p.id,
          inAppEnabled: p.inAppEnabled !== false,
          pushEnabled: p.pushEnabled !== false,
          emailEnabled: p.emailEnabled !== false,
          events: p.events || {},
        },
        update: {
          inAppEnabled: p.inAppEnabled !== false,
          pushEnabled: p.pushEnabled !== false,
          emailEnabled: p.emailEnabled !== false,
          events: p.events || {},
        }
      });
    }
    console.log(`✔ Imported notification preferences.`);
  }

  console.log("PostgreSQL import finished successfully!");
}

main()
  .catch((e) => {
    console.error("Error during import:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

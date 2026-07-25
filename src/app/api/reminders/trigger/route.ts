import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/services/user.service';
import { getAllGroups } from '@/lib/services/group.service';
import { getAllExpenses } from '@/lib/services/expense.service';
import { dispatchNotification } from '@/lib/notification-service';

export async function POST(request: Request) {
  try {
    const internalSecret = request.headers.get('x-internal-secret');
    const isInternal = !!(
      internalSecret &&
      process.env.INTERNAL_API_SECRET &&
      internalSecret === process.env.INTERNAL_API_SECRET
    );

    if (!isInternal) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type } = await request.json().catch(() => ({}));
    if (!type || (type !== 'monthly_summary' && type !== 'group_inactivity')) {
      return NextResponse.json({ error: 'Invalid trigger type' }, { status: 400 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allExpenses = await getAllExpenses();

    if (type === 'monthly_summary') {
      const allUsers = await getAllUsers();
      const recentExpenses = allExpenses.filter(e => new Date(e.date) >= thirtyDaysAgo);
      let count = 0;

      for (const user of allUsers) {
        // Filter to expenses paid by or split with this user
        const userExpenses = recentExpenses.filter(e =>
          e.payers.some(p => p.user.uid === user.uid) ||
          e.participants.some(p => p.user.uid === user.uid)
        );

        if (userExpenses.length === 0) continue;

        let totalSpent = 0;
        let totalOwed = 0;
        const categoryMap: Record<string, number> = {};

        userExpenses.forEach(e => {
          // Spent amount (user's contribution as payer)
          const payRecord = e.payers.find(p => p.user.uid === user.uid);
          if (payRecord) {
            totalSpent += payRecord.amount;
          }

          // Owed amount (user's share as participant)
          const partRecord = e.participants.find(p => p.user.uid === user.uid);
          if (partRecord) {
            totalOwed += partRecord.amountOwed;
            const category = e.category || 'Other';
            categoryMap[category] = (categoryMap[category] || 0) + partRecord.amountOwed;
          }
        });

        // Determine top expense category
        let topCategory = 'None';
        let maxCategoryAmt = 0;
        Object.entries(categoryMap).forEach(([cat, amt]) => {
          if (amt > maxCategoryAmt) {
            maxCategoryAmt = amt;
            topCategory = cat;
          }
        });

        const netBalance = totalSpent - totalOwed;
        const netSign = netBalance >= 0 ? '+' : '';

        const body = `In the last 30 days, you spent ₹${totalSpent.toFixed(2)}, split ₹${totalOwed.toFixed(2)}. Net position: ${netSign}₹${netBalance.toFixed(2)}. Top expense category: ${topCategory}.`;

        await dispatchNotification({
          type: 'monthly_summary',
          recipientIds: [user.uid],
          title: `📊 Monthly Spend Report`,
          body,
          target: 'specific_users',
          amount: totalSpent,
          description: `Summary of last 30 days`
        });

        count++;
      }

      return NextResponse.json({ success: true, message: `Dispatched digests to ${count} users.` });
    } else {
      // type === 'group_inactivity'
      const allGroups = await getAllGroups();
      let count = 0;

      for (const group of allGroups) {
        if (group.archivedAt) continue;

        const groupExpenses = allExpenses.filter(e => e.groupId === group.id);
        // allExpenses is pre-sorted descending, so groupExpenses[0] is the latest
        const latestExpense = groupExpenses.length > 0 ? groupExpenses[0] : null;
        const lastActive = latestExpense ? new Date(latestExpense.date) : new Date(group.createdAt || Date.now());

        if (lastActive < thirtyDaysAgo) {
          await dispatchNotification({
            type: 'group_inactivity',
            recipientIds: group.members.map(m => m.uid),
            title: `😴 Dormant Group Nudge`,
            body: `Group "${group.name}" has had no expense additions in the last 30 days. Let's settle balances or add new splits!`,
            groupId: group.id,
            target: 'specific_users'
          });

          count++;
        }
      }

      return NextResponse.json({ success: true, message: `Nudged members in ${count} inactive groups.` });
    }
  } catch (error: any) {
    console.error('Error triggering scheduled reminders:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

import { getGroupById, getGroupsByUserId } from '@/lib/services/group.service';
import { getGroupBalances, getAllUserBalances, simplifyDebts } from '@/lib/services/balance.service';
import { getExpensesByGroupId } from '@/lib/services/expense.service';
import { getFullName } from '@/lib/utils';
import type { Balance, SimplifiedSettlement } from '@/types';

export interface FinancialSnapshot {
  scope: 'group' | 'global';
  groupName?: string;
  netBalance: number;
  youAreOwed: { name: string; amount: number }[];
  youOwe: { name: string; amount: number }[];
  monthlySpent: number;
  recentExpenses: {
    description: string;
    amount: number;
    date: string;
    paidBy: string;
  }[];
  budget?: {
    monthlyLimit: number;
    currentSpent: number;
    percentage: number;
  };
  formattedText: string;
}

/**
 * Builds an authoritative, server-calculated financial snapshot for a user
 * ensuring zero math hallucinations by the LLM.
 */
export async function buildFinancialSnapshot(
  userId: string,
  groupId?: string
): Promise<FinancialSnapshot> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (groupId) {
    const group = await getGroupById(groupId);
    const groupName = group?.name || 'Current Group';

    const [groupBalances, expenses] = await Promise.all([
      getGroupBalances(groupId).catch(() => [] as Balance[]),
      getExpensesByGroupId(groupId).catch(() => []),
    ]);

    const simplified = simplifyDebts(groupBalances);
    const userBalanceObj = groupBalances.find((b) => b.user.uid === userId);
    const netBalance = userBalanceObj?.netBalance || 0;

    const youAreOwed = simplified
      .filter((s) => s.to.uid === userId)
      .map((s) => ({
        name: getFullName(s.from.firstName, s.from.lastName) || s.from.username || 'Member',
        amount: parseFloat(s.amount.toFixed(2)),
      }));

    const youOwe = simplified
      .filter((s) => s.from.uid === userId)
      .map((s) => ({
        name: getFullName(s.to.firstName, s.to.lastName) || s.to.username || 'Member',
        amount: parseFloat(s.amount.toFixed(2)),
      }));

    // Monthly spending in this group for active user
    let monthlySpent = 0;
    expenses.forEach((e) => {
      if (!e?.date) return;
      const d = new Date(e.date);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        // Amount user actually paid or owed
        const userParticipant = e.participants.find((p) => p.user.uid === userId);
        if (userParticipant) {
          monthlySpent += userParticipant.amountOwed;
        }
      }
    });

    const recentExpenses = expenses.slice(0, 5).map((e) => ({
      description: e.description,
      amount: e.amount,
      date: e.date ? new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent',
      paidBy: e.payers.map((p) => getFullName(p.user.firstName, p.user.lastName) || p.user.username).join(', ') || 'Unknown',
    }));

    let budgetInfo: FinancialSnapshot['budget'] = undefined;
    if (group?.budget?.enabled && group.budget.monthlyLimit > 0) {
      const groupMonthSpent = expenses.reduce((sum, e) => {
        if (!e?.date) return sum;
        const d = new Date(e.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth ? sum + e.amount : sum;
      }, 0);
      budgetInfo = {
        monthlyLimit: group.budget.monthlyLimit,
        currentSpent: parseFloat(groupMonthSpent.toFixed(2)),
        percentage: Math.round((groupMonthSpent / group.budget.monthlyLimit) * 100),
      };
    }

    const lines: string[] = [
      `SCOPE: Group "${groupName}" (ID: ${groupId})`,
      `EXACT NET BALANCE: ${netBalance > 0.01 ? `+₹${netBalance.toFixed(2)} (you are owed in net)` : netBalance < -0.01 ? `-₹${Math.abs(netBalance).toFixed(2)} (you owe in net)` : '₹0.00 (all settled up)'}`,
    ];

    if (youAreOwed.length > 0) {
      lines.push('PEOPLE WHO OWE YOU IN THIS GROUP:');
      youAreOwed.forEach((o) => lines.push(`- ${o.name} owes you ₹${o.amount.toFixed(2)}`));
    }

    if (youOwe.length > 0) {
      lines.push('PEOPLE YOU OWE IN THIS GROUP:');
      youOwe.forEach((o) => lines.push(`- You owe ${o.name} ₹${o.amount.toFixed(2)}`));
    }

    if (youAreOwed.length === 0 && youOwe.length === 0) {
      lines.push('DEBT BREAKDOWN: All debts in this group are settled up.');
    }

    lines.push(`YOUR SPENDING IN THIS GROUP THIS MONTH: ₹${monthlySpent.toFixed(2)}`);

    if (budgetInfo) {
      lines.push(`GROUP BUDGET: ₹${budgetInfo.currentSpent.toFixed(2)} spent of ₹${budgetInfo.monthlyLimit.toFixed(2)} monthly limit (${budgetInfo.percentage}%)`);
    }

    if (recentExpenses.length > 0) {
      lines.push('RECENT GROUP EXPENSES:');
      recentExpenses.forEach((e) => lines.push(`- "${e.description}": ₹${e.amount.toFixed(2)} on ${e.date} (Paid by ${e.paidBy})`));
    }

    return {
      scope: 'group',
      groupName,
      netBalance,
      youAreOwed,
      youOwe,
      monthlySpent: parseFloat(monthlySpent.toFixed(2)),
      recentExpenses,
      budget: budgetInfo,
      formattedText: lines.join('\n'),
    };
  }

  // Global view
  const [userBalances, userGroups] = await Promise.all([
    getAllUserBalances(userId).catch(() => [] as Balance[]),
    getGroupsByUserId(userId).catch(() => []),
  ]);

  const totalNetBalance = userBalances.reduce((sum, b) => sum + b.netBalance, 0);

  const youAreOwed = userBalances
    .filter((b) => b.netBalance > 0.01)
    .map((b) => ({
      name: getFullName(b.user.firstName, b.user.lastName) || b.user.username || 'Member',
      amount: parseFloat(b.netBalance.toFixed(2)),
    }));

  const youOwe = userBalances
    .filter((b) => b.netBalance < -0.01)
    .map((b) => ({
      name: getFullName(b.user.firstName, b.user.lastName) || b.user.username || 'Member',
      amount: parseFloat(Math.abs(b.netBalance).toFixed(2)),
    }));

  const lines: string[] = [
    'SCOPE: Global (All Groups & Friends)',
    `TOTAL NET BALANCE: ${totalNetBalance > 0.01 ? `+₹${totalNetBalance.toFixed(2)} (you are owed overall)` : totalNetBalance < -0.01 ? `-₹${Math.abs(totalNetBalance).toFixed(2)} (you owe overall)` : '₹0.00 (all settled up)'}`,
    `ACTIVE GROUPS: ${userGroups.length} groups (${userGroups.map((g) => g.name).slice(0, 5).join(', ')}${userGroups.length > 5 ? '...' : ''})`,
  ];

  if (youAreOwed.length > 0) {
    lines.push('PEOPLE WHO OWE YOU OVERALL:');
    youAreOwed.forEach((o) => lines.push(`- ${o.name} owes you ₹${o.amount.toFixed(2)}`));
  }

  if (youOwe.length > 0) {
    lines.push('PEOPLE YOU OWE OVERALL:');
    youOwe.forEach((o) => lines.push(`- You owe ${o.name} ₹${o.amount.toFixed(2)}`));
  }

  if (youAreOwed.length === 0 && youOwe.length === 0) {
    lines.push('DEBT STATUS: You have no outstanding debts or credits across any group.');
  }

  return {
    scope: 'global',
    netBalance: parseFloat(totalNetBalance.toFixed(2)),
    youAreOwed,
    youOwe,
    monthlySpent: 0,
    recentExpenses: [],
    formattedText: lines.join('\n'),
  };
}

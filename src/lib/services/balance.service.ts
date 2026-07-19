import type { Balance, SimplifiedSettlement, UserProfile } from '@/types';
import { getGroupById, getGroupsByUserId } from './group.service';
import { getExpensesByGroupId } from './expense.service';
import { getSettlementsByGroupId } from './settlement.service';

export async function getGroupBalances(groupId: string): Promise<Balance[]> {
  const group = await getGroupById(groupId);
  if (!group) return [];
  
  const [expenses, settlements] = await Promise.all([
    getExpensesByGroupId(groupId),
    getSettlementsByGroupId(groupId)
  ]);

  const memberBalances: Record<string, number> = {};
  group.members.forEach(member => {
    memberBalances[member.uid] = 0;
  });

  expenses.forEach(expense => {
    expense.payers.forEach(payer => {
      if (memberBalances[payer.user.uid] !== undefined) {
        memberBalances[payer.user.uid] += payer.amount;
      }
    });
    expense.participants.forEach(p => {
      if (memberBalances[p.user.uid] !== undefined) {
        memberBalances[p.user.uid] -= p.amountOwed;
      }
    });
  });

  settlements.forEach(settlement => {
    if (memberBalances[settlement.paidBy.uid] !== undefined) {
      memberBalances[settlement.paidBy.uid] += settlement.amount;
    }
    if (memberBalances[settlement.paidTo.uid] !== undefined) {
      memberBalances[settlement.paidTo.uid] -= settlement.amount;
    }
  });

  return group.members.map(member => {
    const netBalance = parseFloat((memberBalances[member.uid] || 0).toFixed(2));
    return {
      user: member,
      netBalance,
    };
  });
}

export function simplifyDebts(balances: Balance[]): SimplifiedSettlement[] {
  const debtors = balances
    .filter(b => b.netBalance < 0)
    .map(b => ({ user: b.user, amount: Math.abs(b.netBalance) }));

  const creditors = balances
    .filter(b => b.netBalance > 0)
    .map(b => ({ user: b.user, amount: b.netBalance }));

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: SimplifiedSettlement[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amountToSettle = Math.min(debtor.amount, creditor.amount);

    if (amountToSettle > 0.01) {
      settlements.push({
        from: debtor.user,
        to: creditor.user,
        amount: amountToSettle,
      });

      debtor.amount -= amountToSettle;
      creditor.amount -= amountToSettle;
    }

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }
  return settlements;
}

export async function getAllUserBalances(userId: string): Promise<Balance[]> {
  const userGroups = await getGroupsByUserId(userId);
  if (userGroups.length === 0) return [];

  const allGroupBalancesPromises = userGroups.map(group => getGroupBalances(group.id));
  const allGroupBalancesArrays = await Promise.all(allGroupBalancesPromises);

  const allSettlements: SimplifiedSettlement[] = allGroupBalancesArrays
    .map(groupBalances => simplifyDebts(groupBalances))
    .flat();

  const userP2PBalanceMap = new Map<string, { user: UserProfile; netBalance: number }>();

  allSettlements.forEach(settlement => {
    if (settlement.from.uid === userId) {
      const otherUser = settlement.to;
      const existing = userP2PBalanceMap.get(otherUser.uid) || { user: otherUser, netBalance: 0 };
      existing.netBalance += settlement.amount;
      userP2PBalanceMap.set(otherUser.uid, existing);
    } else if (settlement.to.uid === userId) {
      const otherUser = settlement.from;
      const existing = userP2PBalanceMap.get(otherUser.uid) || { user: otherUser, netBalance: 0 };
      existing.netBalance -= settlement.amount;
      userP2PBalanceMap.set(otherUser.uid, existing);
    }
  });

  return Array.from(userP2PBalanceMap.values());
}

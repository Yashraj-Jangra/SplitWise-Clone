import type { Balance, SimplifiedSettlement, UserProfile } from '@/types';
import { getGroupById, getGroupsByUserId } from './group.service';
import { getExpensesByGroupId } from './expense.service';
import { getSettlementsByGroupId } from './settlement.service';

interface CachedBalance {
  expiresAt: number;
  data: Balance[];
}

const balanceCache = new Map<string, CachedBalance>();
const BALANCE_CACHE_TTL_MS = 20_000;

export function invalidateGroupBalanceCache(groupId?: string): void {
  if (groupId) {
    balanceCache.delete(groupId);
  } else {
    balanceCache.clear();
  }
}

export async function getGroupBalances(groupId: string): Promise<Balance[]> {
  const cached = balanceCache.get(groupId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const group = await getGroupById(groupId);
  if (!group) return [];
  
  const [expenses, settlements] = await Promise.all([
    getExpensesByGroupId(groupId),
    getSettlementsByGroupId(groupId)
  ]);

  const memberMap = new Map<string, UserProfile>();
  group.members.forEach(member => {
    memberMap.set(member.uid, member);
  });
  expenses.forEach(expense => {
    expense.payers.forEach(p => {
      if (!memberMap.has(p.user.uid)) memberMap.set(p.user.uid, p.user);
    });
    expense.participants.forEach(p => {
      if (!memberMap.has(p.user.uid)) memberMap.set(p.user.uid, p.user);
    });
  });
  settlements.forEach(settlement => {
    if (!memberMap.has(settlement.paidBy.uid)) memberMap.set(settlement.paidBy.uid, settlement.paidBy);
    if (!memberMap.has(settlement.paidTo.uid)) memberMap.set(settlement.paidTo.uid, settlement.paidTo);
  });

  const memberBalances: Record<string, number> = {};
  memberMap.forEach((_, uid) => {
    memberBalances[uid] = 0;
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

  const result = Array.from(memberMap.values())
    .map(member => {
      const netBalance = parseFloat((memberBalances[member.uid] || 0).toFixed(2));
      return {
        user: member,
        netBalance,
      };
    })
    .filter(b => group.members.some(m => m.uid === b.user.uid) || Math.abs(b.netBalance) > 0.01);

  balanceCache.set(groupId, {
    expiresAt: Date.now() + BALANCE_CACHE_TTL_MS,
    data: result,
  });

  return result;
}

import { simplifyDebts } from '@splitit/core';
export { simplifyDebts };

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
      existing.netBalance -= settlement.amount;
      userP2PBalanceMap.set(otherUser.uid, existing);
    } else if (settlement.to.uid === userId) {
      const otherUser = settlement.from;
      const existing = userP2PBalanceMap.get(otherUser.uid) || { user: otherUser, netBalance: 0 };
      existing.netBalance += settlement.amount;
      userP2PBalanceMap.set(otherUser.uid, existing);
    }
  });

  return Array.from(userP2PBalanceMap.values());
}

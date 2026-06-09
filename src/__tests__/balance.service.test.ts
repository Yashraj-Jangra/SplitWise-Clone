import { describe, it, expect } from 'vitest';
import type { Group, Expense, Settlement, UserProfile, Balance } from '@/types';

// Pure representation of the Firestore net balance aggregation math
export function calculateBalances(
  group: Group,
  expenses: Expense[],
  settlements: Settlement[]
): Balance[] {
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
      netBalance: netBalance,
    };
  });
}

function makeUser(uid: string, name: string): UserProfile {
  return {
    uid,
    firstName: name,
    username: name.toLowerCase(),
    email: `${name.toLowerCase()}@example.com`,
    role: 'user',
  };
}

describe('Group Balance Aggregations', () => {
  const u1 = makeUser('u1', 'Alice');
  const u2 = makeUser('u2', 'Bob');
  const u3 = makeUser('u3', 'Charlie');

  const mockGroup: Group = {
    id: 'g1',
    name: 'Test Group',
    members: [u1, u2, u3],
    createdBy: u1,
    createdAt: new Date().toISOString(),
    totalExpenses: 0,
  };

  it('aggregates zero balances when there are no expenses or settlements', () => {
    const balances = calculateBalances(mockGroup, [], []);

    expect(balances).toEqual([
      { user: u1, netBalance: 0 },
      { user: u2, netBalance: 0 },
      { user: u3, netBalance: 0 },
    ]);
  });

  it('aggregates basic equal split expense correctly', () => {
    // Alice paid $90.00 split equally between Alice, Bob, and Charlie ($30.00 each)
    // Alice paid 90, owes 30 => Net +60
    // Bob paid 0, owes 30 => Net -30
    // Charlie paid 0, owes 30 => Net -30
    const mockExpenses: Expense[] = [
      {
        id: 'e1',
        groupId: 'g1',
        description: 'Dinner',
        amount: 90,
        splitType: 'equally',
        payers: [{ user: u1, amount: 90 }],
        participants: [
          { user: u1, amountOwed: 30 },
          { user: u2, amountOwed: 30 },
          { user: u3, amountOwed: 30 },
        ],
        payerIds: ['u1'],
        participantIds: ['u1', 'u2', 'u3'],
        groupMemberIds: ['u1', 'u2', 'u3'],
        expenseCreator: u1,
        groupCreatorId: u1.uid,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];

    const balances = calculateBalances(mockGroup, mockExpenses, []);

    expect(balances).toEqual([
      { user: u1, netBalance: 60 },
      { user: u2, netBalance: -30 },
      { user: u3, netBalance: -30 },
    ]);
  });

  it('incorporates settlements correctly', () => {
    // Alice paid $90.00 split equally (Alice +60, Bob -30, Charlie -30)
    const mockExpenses: Expense[] = [
      {
        id: 'e1',
        groupId: 'g1',
        description: 'Dinner',
        amount: 90,
        splitType: 'equally',
        payers: [{ user: u1, amount: 90 }],
        participants: [
          { user: u1, amountOwed: 30 },
          { user: u2, amountOwed: 30 },
          { user: u3, amountOwed: 30 },
        ],
        payerIds: ['u1'],
        participantIds: ['u1', 'u2', 'u3'],
        groupMemberIds: ['u1', 'u2', 'u3'],
        expenseCreator: u1,
        groupCreatorId: u1.uid,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];

    // Bob settled with Alice for $30.00
    // Bob paid Alice 30 => Alice net becomes +30, Bob net becomes 0
    const mockSettlements: Settlement[] = [
      {
        id: 's1',
        groupId: 'g1',
        paidBy: u2,
        paidTo: u1,
        amount: 30,
        date: new Date().toISOString(),
        groupMemberIds: ['u1', 'u2', 'u3'],
      },
    ];

    const balances = calculateBalances(mockGroup, mockExpenses, mockSettlements);

    expect(balances).toEqual([
      { user: u1, netBalance: 30 },
      { user: u2, netBalance: 0 },
      { user: u3, netBalance: -30 },
    ]);
  });
});

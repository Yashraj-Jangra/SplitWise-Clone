import { describe, it, expect, vi } from 'vitest';
import type { Balance, UserProfile } from '@/types';


import { simplifyDebts } from '@/lib/firestore.service';

// Helper to create a dummy user profile
function makeUser(uid: string, name: string): UserProfile {
  return {
    uid,
    firstName: name,
    username: name.toLowerCase(),
    email: `${name.toLowerCase()}@example.com`,
    role: 'user',
  };
}

describe('Debt Simplification Algorithm', () => {
  it('handles empty balances', () => {
    const settlements = simplifyDebts([]);
    expect(settlements).toEqual([]);
  });

  it('handles fully settled group with zero balances', () => {
    const balances: Balance[] = [
      { user: makeUser('u1', 'Alice'), netBalance: 0 },
      { user: makeUser('u2', 'Bob'), netBalance: 0 },
    ];
    const settlements = simplifyDebts(balances);
    expect(settlements).toEqual([]);
  });

  it('simplifies a basic one-to-one debt', () => {
    const balances: Balance[] = [
      { user: makeUser('u1', 'Alice'), netBalance: -10 },
      { user: makeUser('u2', 'Bob'), netBalance: 10 },
    ];
    const settlements = simplifyDebts(balances);
    expect(settlements.length).toBe(1);
    expect(settlements[0].from.uid).toBe('u1');
    expect(settlements[0].to.uid).toBe('u2');
    expect(settlements[0].amount).toBe(10);
  });

  it('simplifies a multi-person debt path', () => {
    // Alice owes Bob $10, Bob owes Charlie $10
    // Alice has net balance of -10
    // Bob has net balance of 0 (owes 10 but is owed 10)
    // Charlie has net balance of +10
    // Simplified: Alice pays Charlie $10 directly (Bob is completely bypassed)
    const balances: Balance[] = [
      { user: makeUser('u1', 'Alice'), netBalance: -10 },
      { user: makeUser('u2', 'Bob'), netBalance: 0 },
      { user: makeUser('u3', 'Charlie'), netBalance: 10 },
    ];
    const settlements = simplifyDebts(balances);
    expect(settlements.length).toBe(1);
    expect(settlements[0].from.uid).toBe('u1');
    expect(settlements[0].to.uid).toBe('u3');
    expect(settlements[0].amount).toBe(10);
  });

  it('handles complex multi-party debt simplifications', () => {
    // Alice net: -10
    // Bob net: -20
    // Charlie net: +30
    // Simplified: Alice pays Charlie 10, Bob pays Charlie 20
    const balances: Balance[] = [
      { user: makeUser('u1', 'Alice'), netBalance: -10 },
      { user: makeUser('u2', 'Bob'), netBalance: -20 },
      { user: makeUser('u3', 'Charlie'), netBalance: 30 },
    ];
    const settlements = simplifyDebts(balances);
    expect(settlements.length).toBe(2);
    
    const aliceToCharlie = settlements.find(s => s.from.uid === 'u1' && s.to.uid === 'u3');
    const bobToCharlie = settlements.find(s => s.from.uid === 'u2' && s.to.uid === 'u3');
    
    expect(aliceToCharlie).toBeDefined();
    expect(aliceToCharlie?.amount).toBeCloseTo(10);
    
    expect(bobToCharlie).toBeDefined();
    expect(bobToCharlie?.amount).toBeCloseTo(20);
  });
});

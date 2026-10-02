export interface DebtUser {
  uid: string;
}

export interface NetBalance<U extends DebtUser = DebtUser> {
  user: U;
  netBalance: number;
}

export interface DebtTransfer<U extends DebtUser = DebtUser> {
  from: U;
  to: U;
  amount: number;
}

const EPSILON = 0.01;

/**
 * Greedy minimum-transfer settlement: matches the largest debtor with the
 * largest creditor until everyone is within a penny of zero.
 */
export function simplifyDebts<U extends DebtUser>(balances: NetBalance<U>[]): DebtTransfer<U>[] {
  const debtors = balances
    .filter((b) => b.netBalance < 0)
    .map((b) => ({ user: b.user, amount: Math.abs(b.netBalance) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = balances
    .filter((b) => b.netBalance > 0)
    .map((b) => ({ user: b.user, amount: b.netBalance }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: DebtTransfer<U>[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > EPSILON) {
      transfers.push({ from: debtor.user, to: creditor.user, amount });
      debtor.amount -= amount;
      creditor.amount -= amount;
    }

    if (debtor.amount < EPSILON) i++;
    if (creditor.amount < EPSILON) j++;
  }
  return transfers;
}

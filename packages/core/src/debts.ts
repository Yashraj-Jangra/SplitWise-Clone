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

const EPSILON = 0.005;

/**
 * Greedy minimum-transfer settlement: matches the largest debtor with the
 * largest creditor until everyone is settled to the nearest penny.
 */
export function simplifyDebts<U extends DebtUser>(balances: NetBalance<U>[]): DebtTransfer<U>[] {
  const debtors = balances
    .map((b) => ({
      user: b.user,
      amount: Math.round(Math.abs(b.netBalance) * 100) / 100,
      isDebtor: b.netBalance < -EPSILON,
    }))
    .filter((b) => b.isDebtor && b.amount >= 0.01)
    .sort((a, b) => b.amount - a.amount);

  const creditors = balances
    .map((b) => ({
      user: b.user,
      amount: Math.round(b.netBalance * 100) / 100,
      isCreditor: b.netBalance > EPSILON,
    }))
    .filter((b) => b.isCreditor && b.amount >= 0.01)
    .sort((a, b) => b.amount - a.amount);

  const transfers: DebtTransfer<U>[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);
    const roundedAmount = Math.round(amount * 100) / 100;

    if (roundedAmount >= 0.01) {
      transfers.push({ from: debtor.user, to: creditor.user, amount: roundedAmount });
      debtor.amount = Math.round((debtor.amount - roundedAmount) * 100) / 100;
      creditor.amount = Math.round((creditor.amount - roundedAmount) * 100) / 100;
    }

    if (debtor.amount < EPSILON) i++;
    if (creditor.amount < EPSILON) j++;
  }
  return transfers;
}


import type { User, Group, Expense, Settlement, Balance } from "@/types";
import { CURRENCY_CODE } from "./constants";

// This is now our persistent in-memory "database".
// It starts with one admin user and empty data.
export let mockUsers: User[] = [
  { 
    id: "admin001", 
    name: "Admin User", 
    email: "jangrayash1505@gmail.com", 
    password: "U_r_An_IdIoT_101", 
    avatarUrl: "https://placehold.co/100x100.png?text=AU", 
    role: "admin", 
    createdAt: new Date().toISOString() 
  },
];

export let mockGroups: Group[] = [];
export let mockExpenses: Expense[] = [];
export let mockSettlements: Settlement[] = [];


export function getGroupById(groupId: string): Promise<Group | undefined> {
  return new Promise(resolve => setTimeout(() => resolve(mockGroups.find(g => g.id === groupId)), 100));
}

export function getExpensesByGroupId(groupId: string): Promise<Expense[]> {
  return new Promise(resolve => setTimeout(() => resolve(mockExpenses.filter(e => e.groupId === groupId)), 100));
}

export function getSettlementsByGroupId(groupId: string): Promise<Settlement[]> {
   return new Promise(resolve => setTimeout(() => resolve(mockSettlements.filter(s => s.groupId === groupId)), 100));
}

export async function verifyUserCredentials(email: string, password_sent: string): Promise<User | null> {
  return new Promise(resolve => {
    setTimeout(() => {
        const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (user && user.password === password_sent) {
            // In a real app, never return the password hash
            const { password, ...userWithoutPassword } = user;
            resolve(userWithoutPassword as User);
        } else {
            resolve(null);
        }
    }, 200);
  });
}

export async function createUser(data: Omit<User, 'id'|'avatarUrl'|'createdAt'|'role'>): Promise<User> {
    return new Promise(resolve => {
        setTimeout(() => {
            const newUser: User = {
                id: `user${mockUsers.length + 1}`,
                name: data.name,
                email: data.email,
                password: data.password,
                role: 'user',
                createdAt: new Date().toISOString(),
                avatarUrl: `https://placehold.co/100x100.png?text=${data.name.substring(0, 2).toUpperCase()}`,
            };
            mockUsers.push(newUser);
            const { password, ...userWithoutPassword } = newUser;
            resolve(userWithoutPassword as User);
        }, 200)
    });
}


// --- Admin Data Functions ---
export async function getAllUsers(): Promise<User[]> {
  // Simulate API call
  return new Promise(resolve => setTimeout(() => resolve(mockUsers), 200));
}

export async function getAllGroups(): Promise<Group[]> {
  // Simulate API call
  return new Promise(resolve => setTimeout(() => resolve(mockGroups), 200));
}

export async function getAllExpenses(): Promise<Expense[]> {
  // Simulate API call
  return new Promise(resolve => setTimeout(() => resolve(mockExpenses), 200));
}

export async function getUserById(userId: string): Promise<User | undefined> {
  // Simulate API call
  return new Promise(resolve => setTimeout(() => resolve(mockUsers.find(u => u.id === userId)), 50));
}

export async function updateUser(userId: string, data: Partial<Omit<User, 'id'>>): Promise<User | undefined> {
  return new Promise(resolve => {
    setTimeout(() => {
      const userIndex = mockUsers.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        mockUsers[userIndex] = { ...mockUsers[userIndex], ...data };
        resolve(mockUsers[userIndex]);
      } else {
        resolve(undefined);
      }
    }, 200);
  });
}

export async function updateExpense(expenseId: string, updatedData: Omit<Expense, 'id'>): Promise<Expense | undefined> {
  return new Promise(resolve => {
    setTimeout(() => {
      const expenseIndex = mockExpenses.findIndex(e => e.id === expenseId);
      if (expenseIndex !== -1) {
        const originalExpense = mockExpenses[expenseIndex];
        const group = mockGroups.find(g => g.id === originalExpense.groupId);

        if (group) {
          // Adjust group total expenses
          group.totalExpenses = group.totalExpenses - originalExpense.amount + updatedData.amount;
        }

        mockExpenses[expenseIndex] = { ...updatedData, id: expenseId }; // ensure id is not changed
        resolve(mockExpenses[expenseIndex]);
      } else {
        resolve(undefined);
      }
    }, 200);
  });
}

// A more complex function to calculate balances for a group would exist in a real app
export async function getGroupBalances(groupId: string): Promise<Balance[]> {
  const group = await getGroupById(groupId);
  if (!group) return [];
  const expenses = await getExpensesByGroupId(groupId);
  const settlements = await getSettlementsByGroupId(groupId);

  const memberBalances: Record<string, number> = {};
  group.members.forEach(member => memberBalances[member.id] = 0);

  expenses.forEach(expense => {
    // Add to payer's balance (they are owed this amount initially)
    memberBalances[expense.paidBy.id] += expense.amount;
    // Subtract from each participant's balance (they owe their share)
    expense.participants.forEach(p => {
      memberBalances[p.user.id] -= p.amountOwed;
    });
  });

  settlements.forEach(settlement => {
    memberBalances[settlement.paidBy.id] -= settlement.amount; // Payer's balance decreases
    memberBalances[settlement.paidTo.id] += settlement.amount;   // Payee's balance increases
  });
  
  // This is a simplified net balance. True "who owes whom" is more complex.
  // For this mock, we'll just show net balances and a placeholder for detailed debts.
  return group.members.map(member => {
    const netBalance = parseFloat(memberBalances[member.id].toFixed(2));
    return {
      user: member,
      owes: netBalance < 0 ? [{ to: {id: "group", name: "Group Total", email:"", role: "user"}, amount: Math.abs(netBalance) }] : [],
      owedBy: netBalance > 0 ? [{ from: {id: "group", name: "Group Total", email:"", role: "user"}, amount: netBalance }] : [],
      netBalance: netBalance,
    };
  });
}

export interface SimplifiedSettlement {
  from: User;
  to: User;
  amount: number;
}

/**
 * Simplifies group debts to the minimum number of transactions.
 * @param balances An array of user balances for the group.
 * @returns An array of simplified settlements.
 */
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

        // Only create settlement if amount is meaningful to avoid tiny floating point settlements
        if (amountToSettle > 0.01) { 
            settlements.push({
                from: debtor.user,
                to: creditor.user,
                amount: amountToSettle,
            });

            debtor.amount -= amountToSettle;
            creditor.amount -= amountToSettle;
        }

        // If a debtor's balance is settled, move to the next debtor
        if (debtor.amount < 0.01) {
            i++;
        }
        
        // If a creditor's balance is settled, move to the next creditor
        if (creditor.amount < 0.01) {
            j++;
        }
    }
    return settlements;
}

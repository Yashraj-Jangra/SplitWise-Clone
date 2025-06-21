
import type { User, Group, Expense, Settlement, Balance } from "@/types";
import { CURRENCY_CODE } from "./constants";

// Mock Users
export const mockUsers: User[] = [
  { id: "user1", name: "Alice Wonderland", email: "alice@example.com", avatarUrl: "https://placehold.co/100x100.png?text=AW", role: "user", createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "user2", name: "Bob The Builder", email: "bob@example.com", avatarUrl: "https://placehold.co/100x100.png?text=BB", role: "user", createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "user3", name: "Charlie Brown", email: "charlie@example.com", avatarUrl: "https://placehold.co/100x100.png?text=CB", role: "user", createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "user4", name: "Diana Prince", email: "diana@example.com", avatarUrl: "https://placehold.co/100x100.png?text=DP", role: "user", createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "admin001", name: "Admin User", email: "admin@example.com", avatarUrl: "https://placehold.co/100x100.png?text=AU", role: "admin", createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "user007", name: "Standard User", email: "user@example.com", avatarUrl: "https://placehold.co/100x100.png?text=SU", role: "user", createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
];

// Mock Groups
export const mockGroups: Group[] = [
  {
    id: "group1",
    name: "Weekend Trip to Goa",
    description: "Expenses for our awesome weekend getaway!",
    members: [mockUsers[0], mockUsers[1], mockUsers[2]],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    createdBy: mockUsers[0],
    totalExpenses: 12500,
    coverImageUrl: "https://placehold.co/600x300.png?text=Goa+Trip",
  },
  {
    id: "group2",
    name: "Apartment Utilities",
    description: "Monthly bills and shared expenses for the apartment.",
    members: [mockUsers[0], mockUsers[3]],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    createdBy: mockUsers[3],
    totalExpenses: 4800,
    coverImageUrl: "https://placehold.co/600x300.png?text=Utilities",
  },
  {
    id: "group3",
    name: "Office Lunch Group",
    description: "Daily lunch expenses with colleagues.",
    members: [mockUsers[0], mockUsers[1], mockUsers[2], mockUsers[3]],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    createdBy: mockUsers[1],
    totalExpenses: 7200,
    coverImageUrl: "https://placehold.co/600x300.png?text=Office+Lunch",
  }
];

// Mock Expenses
export const mockExpenses: Expense[] = [
  {
    id: "expense1",
    groupId: "group1",
    description: "Flight Tickets",
    amount: 9000,
    paidBy: mockUsers[0], // Alice paid
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    splitType: "equally",
    participants: [
      { user: mockUsers[0], amountOwed: 3000 },
      { user: mockUsers[1], amountOwed: 3000 },
      { user: mockUsers[2], amountOwed: 3000 },
    ],
    category: "Travel",
    receiptImageUrl: "https://placehold.co/300x200.png?text=Receipt1",
  },
  {
    id: "expense2",
    groupId: "group1",
    description: "Dinner at Beach Shack",
    amount: 3500,
    paidBy: mockUsers[1], // Bob paid
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    splitType: "equally",
    participants: [
      { user: mockUsers[0], amountOwed: 1166.67 },
      { user: mockUsers[1], amountOwed: 1166.67 },
      { user: mockUsers[2], amountOwed: 1166.66 },
    ],
    category: "Food",
  },
  {
    id: "expense3",
    groupId: "group2",
    description: "Electricity Bill",
    amount: 2800,
    paidBy: mockUsers[3], // Diana paid
    date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    splitType: "equally",
    participants: [
      { user: mockUsers[0], amountOwed: 1400 },
      { user: mockUsers[3], amountOwed: 1400 },
    ],
    category: "Utilities",
  },
  {
    id: "expense4",
    groupId: "group2",
    description: "Groceries",
    amount: 2000,
    paidBy: mockUsers[0], // Alice paid
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    splitType: "unequally", // Example of unequal split
    participants: [
      { user: mockUsers[0], amountOwed: 800 }, // Alice consumed less
      { user: mockUsers[3], amountOwed: 1200 }, // Diana consumed more
    ],
    category: "Groceries",
  },
  {
    id: "expense5",
    groupId: "group3",
    description: "Team Lunch - Pizza",
    amount: 1800,
    paidBy: mockUsers[1], // Bob paid
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    splitType: "equally",
    participants: [
      { user: mockUsers[0], amountOwed: 450 },
      { user: mockUsers[1], amountOwed: 450 },
      { user: mockUsers[2], amountOwed: 450 },
      { user: mockUsers[3], amountOwed: 450 },
    ],
    category: "Food",
  },
];

// Mock Settlements
export const mockSettlements: Settlement[] = [
  {
    id: "settle1",
    groupId: "group1",
    paidBy: mockUsers[1], // Bob
    paidTo: mockUsers[0], // Alice
    amount: 3000,
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Settled for flight tickets share.",
  },
  {
    id: "settle2",
    groupId: "group2",
    paidBy: mockUsers[0], // Alice
    paidTo: mockUsers[3], // Diana
    amount: 1400,
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    notes: "Electricity bill share.",
  },
];

// Mock Balances (derived for current user - Alice)
export const mockUserBalances: Balance[] = [
  // Balance for Alice in Group 1 (Weekend Trip to Goa)
  // Alice paid 9000 for flights (owes 3000, paid 9000 -> +6000)
  // Bob paid 3500 for dinner (Alice owes 1166.67)
  // Bob settled 3000 with Alice (Alice received 3000 from Bob)
  // Net for Alice in Group 1: +6000 - 1166.67 (for dinner) + 3000 (settlement from Bob) = 7833.33
  // This structure needs careful calculation based on expenses and settlements.
  // For simplicity, let's mock a summary for Alice.
  {
    user: mockUsers[0], // Alice
    owes: [
      // { to: mockUsers[1], amount: 1166.67 } // For dinner - but Bob settled his flight share
    ],
    owedBy: [
      { from: mockUsers[2], amount: 3000 + 1166.66 }, // Charlie owes for flights and dinner
    ],
    netBalance: 4166.66, // Simplified: What others owe Alice - What Alice owes others
  },
  // Balance for Alice in Group 2 (Apartment Utilities)
  // Diana paid 2800 for electricity (Alice owes 1400)
  // Alice paid 2000 for groceries (Alice owes 800, Diana owes 1200)
  // Alice settled 1400 with Diana for electricity.
  // Alice owes Diana: 1400 (electricity)
  // Diana owes Alice: 1200 (groceries)
  // Net for Alice in Group 2: +1200 (Diana owes for groceries) - 1400 (Alice owes for electricity) = -200 (Alice owes 200)
  // After Alice settles with Diana: Alice owes 0. This means Alice paid 1400 to Diana.
  // Alice overall: -1400 (paid for electricity) -800 (her grocery share) + 1200 (Diana's grocery share) = -1000 for expenses she covered from own pocket for this group.
  // If Alice paid Diana 1400, her net becomes -1000 - 1400 = -2400
  // This is tricky to mock simply, usually calculated on the fly.
  // Let's make it simpler for mock:
  {
    user: mockUsers[0], // Alice
    owes: [
      { to: mockUsers[3], amount: 200 } // Alice owes Diana 200 (simplified)
    ],
    owedBy: [],
    netBalance: -200,
  }
];

export function getGroupById(groupId: string): Promise<Group | undefined> {
  return new Promise(resolve => setTimeout(() => resolve(mockGroups.find(g => g.id === groupId)), 100));
}

export function getExpensesByGroupId(groupId: string): Promise<Expense[]> {
  return new Promise(resolve => setTimeout(() => resolve(mockExpenses.filter(e => e.groupId === groupId)), 100));
}

export function getSettlementsByGroupId(groupId: string): Promise<Settlement[]> {
   return new Promise(resolve => setTimeout(() => resolve(mockSettlements.filter(s => s.groupId === groupId)), 100));
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

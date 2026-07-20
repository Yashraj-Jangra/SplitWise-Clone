import type { UserProfile, Group, Expense, Settlement, Balance, HistoryEvent, SiteSettings, UserNotificationPrefsDocument } from '@/types';

// Helper for making fetch requests — resolves relative URLs on the server
async function fetchApi(url: string, options?: RequestInit) {
  const base = typeof window === 'undefined'
    ? (process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3231')
    : '';
  const fullUrl = url.startsWith('/') ? `${base}${url}` : url;
  const res = await fetch(fullUrl, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP error! status: ${res.status}`);
  }
  return res.json();
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  return fetchApi(`/api/user/profile?userId=${uid}`);
}

export async function getAllUsers(): Promise<UserProfile[]> {
  return fetchApi('/api/users');
}

export async function getAllUsersPaginated(pageSize: number, pageIndex: number): Promise<{ users: UserProfile[]; totalCount: number }> {
  return fetchApi(`/api/admin/users?limit=${pageSize}&page=${pageIndex}`);
}

export async function isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
  const data = await fetchApi(`/api/user/check-username?username=${encodeURIComponent(username)}` + (excludeUserId ? `&excludeId=${excludeUserId}` : ''));
  return data.taken;
}

export async function updateUser(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
  return fetchApi('/api/user/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function hydrateUsers(uids: string[]): Promise<UserProfile[]> {
  if (!uids || uids.length === 0) return [];
  return fetchApi(`/api/user/profile?userIds=${uids.join(',')}`);
}

export async function createGroup(groupData: any): Promise<string> {
  const data = await fetchApi('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(groupData),
  });
  return data.id;
}

export async function getGroupById(groupId: string): Promise<Group | null> {
  return fetchApi(`/api/groups/${groupId}`);
}

export async function getGroupsByUserId(userId: string): Promise<Group[]> {
  return fetchApi(`/api/groups`);
}

export async function getAllGroups(): Promise<Group[]> {
  return fetchApi('/api/groups?all=true');
}

export async function addMembersToGroup(groupId: string, memberIds: string[], actorId: string): Promise<void> {
  return fetchApi(`/api/groups/${groupId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberIds }),
  });
}

export async function removeMemberFromGroup(groupId: string, memberIdToRemove: string, actorId: string): Promise<void> {
  return fetchApi(`/api/groups/${groupId}/members?userId=${memberIdToRemove}`, {
    method: 'DELETE',
  });
}

export async function updateGroup(groupId: string, data: any, actorId: string): Promise<void> {
  return fetchApi(`/api/groups/${groupId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function archiveGroup(groupId: string, actorId: string): Promise<void> {
  return fetchApi(`/api/groups/${groupId}/archive`, {
    method: 'POST',
  });
}

export async function restoreGroup(groupId: string, actorId: string): Promise<void> {
  return fetchApi(`/api/groups/${groupId}/archive`, {
    method: 'DELETE',
  });
}

export async function deleteGroupPermanently(groupId: string): Promise<void> {
  return fetchApi(`/api/groups/${groupId}`, {
    method: 'DELETE',
  });
}

export async function addExpense(expenseData: any, actorId: string): Promise<string> {
  const data = await fetchApi('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expenseData),
  });
  return data.id;
}

export async function updateExpense(expenseId: string, oldAmount: number, expenseData: any, actorId: string): Promise<void> {
  return fetchApi(`/api/expenses/${expenseId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...expenseData, oldAmount }),
  });
}

export async function deleteExpense(expenseId: string, groupId: string, amount: number, actorId: string): Promise<void> {
  return fetchApi(`/api/expenses/${expenseId}?groupId=${groupId}&amount=${amount}`, {
    method: 'DELETE',
  });
}

export async function getExpensesByGroupId(groupId: string): Promise<Expense[]> {
  return fetchApi(`/api/expenses?groupId=${groupId}`);
}

export async function getExpensesByUserId(userId: string): Promise<Expense[]> {
  return fetchApi(`/api/expenses?userId=${userId}`);
}

export async function getAllExpenses(): Promise<Expense[]> {
  return fetchApi('/api/expenses?all=true');
}

export async function addSettlement(settlementData: any, actorId: string): Promise<string> {
  const data = await fetchApi('/api/settlements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settlementData),
  });
  return data.id;
}


export async function getSettlementsByGroupId(groupId: string): Promise<Settlement[]> {
  return fetchApi(`/api/settlements?groupId=${groupId}`);
}

export async function getSettlementsByUserId(userId: string): Promise<Settlement[]> {
  return fetchApi(`/api/settlements?userId=${userId}`);
}

export async function getAllSettlements(): Promise<Settlement[]> {
  return fetchApi('/api/settlements?all=true');
}

export async function updateSettlement(settlementId: string, data: any, actorId: string): Promise<void> {
  return fetchApi(`/api/settlements/${settlementId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteSettlement(settlementId: string, groupId: string, actorId: string): Promise<void> {
  return fetchApi(`/api/settlements/${settlementId}?groupId=${groupId}`, {
    method: 'DELETE',
  });
}

export async function getGroupBalances(groupId: string): Promise<Balance[]> {
  return fetchApi(`/api/groups/${groupId}/balances`);
}

export async function getAllUserBalances(userId: string): Promise<Balance[]> {
  return fetchApi(`/api/expenses?userId=${userId}`); // balances endpoint or calculations
}

export function simplifyDebts(balances: Balance[]) {
  const debtors = balances
    .filter(b => b.netBalance < 0)
    .map(b => ({ user: b.user, amount: Math.abs(b.netBalance) }));

  const creditors = balances
    .filter(b => b.netBalance > 0)
    .map(b => ({ user: b.user, amount: b.netBalance }));

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements: any[] = [];
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

export async function getHistoryByGroupId(groupId: string): Promise<HistoryEvent[]> {
  return fetchApi(`/api/history?groupId=${groupId}`);
}

export async function restoreExpense(historyEventId: string, actorId: string): Promise<string | null> {
  const data = await fetchApi('/api/history/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId: historyEventId, type: 'expense' }),
  });
  return data.id;
}

export async function restoreSettlement(historyEventId: string, actorId: string): Promise<string | null> {
  const data = await fetchApi('/api/history/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId: historyEventId, type: 'settlement' }),
  });
  return data.id;
}

export async function deleteHistoryEvent(historyEventId: string): Promise<void> {
  return fetchApi(`/api/history/${historyEventId}`, {
    method: 'DELETE',
  });
}

export async function getSiteSettings(): Promise<SiteSettings> {
  return fetchApi('/api/public/settings');
}

export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
  return fetchApi('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
}

export async function getUserNotificationPrefs(userId: string): Promise<UserNotificationPrefsDocument> {
  return fetchApi('/api/user/prefs');
}

export async function updateUserNotificationPrefs(userId: string, prefs: Partial<any>): Promise<void> {
  return fetchApi('/api/user/prefs', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  });
}

export async function getAllTickets(): Promise<any[]> {
  return fetchApi('/api/admin/tickets');
}

export async function deleteTicket(ticketId: string): Promise<void> {
  return fetchApi(`/api/admin/tickets?ticketId=${ticketId}`, {
    method: 'DELETE',
  });
}

export async function updateTicket(ticketId: string, data: any): Promise<void> {
  return fetchApi('/api/admin/tickets', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId, ...data }),
  });
}

export async function getAllNotifications(): Promise<any[]> {
  return fetchApi('/api/admin/notifications');
}

export async function deleteNotification(id: string): Promise<void> {
  return fetchApi(`/api/admin/notifications?id=${id}`, {
    method: 'DELETE',
  });
}

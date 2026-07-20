import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ExpenseDocument } from '@/types';

const apiFetch = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

export function useExpenses(groupId: string | undefined) {
  return useQuery({
    queryKey: ['expenses', groupId],
    queryFn: () => apiFetch(`/api/expenses?groupId=${groupId}`),
    enabled: !!groupId,
    staleTime: 30 * 1000,
  });
}

export function useUserExpenses(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-expenses', userId],
    queryFn: () => apiFetch(`/api/expenses?userId=${userId}`),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useExpenseMutations(groupId?: string, userId?: string) {
  const queryClient = useQueryClient();

  const addExpenseMutation = useMutation({
    mutationFn: ({ data }: { data: Omit<ExpenseDocument, 'date' | 'participantIds' | 'payerIds' | 'groupMemberIds' | 'groupCreatorId' | 'expenseCreatorId' | 'masterCategory' | 'createdAt'> & { date: Date }; actorId: string }) =>
      apiFetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-expenses', userId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', userId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; oldAmount: number; data: Omit<ExpenseDocument, 'date' | 'participantIds' | 'payerIds' | 'groupMemberIds' | 'createdAt' | 'masterCategory'> & { date: Date; createdAt: string }; actorId: string }) =>
      apiFetch(`/api/expenses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-expenses', userId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', userId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: ({ id }: { id: string; grpId: string; amount: number; actorId: string }) =>
      apiFetch(`/api/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-expenses', userId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', userId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
    },
  });

  return {
    addExpense: addExpenseMutation,
    updateExpense: updateExpenseMutation,
    deleteExpense: deleteExpenseMutation,
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getExpensesByGroupId, 
  getExpensesByUserId, 
  addExpense, 
  updateExpense, 
  deleteExpense 
} from '@/lib/firestore.service';
import type { ExpenseDocument } from '@/types';

export function useExpenses(groupId: string | undefined) {
  return useQuery({
    queryKey: ['expenses', groupId],
    queryFn: () => getExpensesByGroupId(groupId!),
    enabled: !!groupId,
    staleTime: 30 * 1000,
  });
}

export function useUserExpenses(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-expenses', userId],
    queryFn: () => getExpensesByUserId(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useExpenseMutations(groupId?: string, userId?: string) {
  const queryClient = useQueryClient();

  const addExpenseMutation = useMutation({
    mutationFn: ({ data, actorId }: { data: Omit<ExpenseDocument, 'date' | 'participantIds' | 'payerIds' | 'groupMemberIds' | 'groupCreatorId' | 'expenseCreatorId' | 'masterCategory' | 'createdAt'> & { date: Date }; actorId: string }) => addExpense(data, actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-expenses', userId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', userId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, oldAmount, data, actorId }: { id: string; oldAmount: number; data: Omit<ExpenseDocument, 'date' | 'participantIds' | 'payerIds' | 'groupMemberIds' | 'createdAt' | 'masterCategory'> & { date: Date; createdAt: string }; actorId: string }) => updateExpense(id, oldAmount, data, actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-expenses', userId] });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['groups', userId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: ({ id, grpId, amount, actorId }: { id: string; grpId: string; amount: number; actorId: string }) => deleteExpense(id, grpId, amount, actorId),
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

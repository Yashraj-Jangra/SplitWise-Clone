import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { GroupDocument } from '@/types';

// --- fetch helpers ---
const apiFetch = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

export function useGroups(userId: string | undefined) {
  return useQuery({
    queryKey: ['groups', userId],
    queryFn: () => apiFetch('/api/groups'),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30s stale time
  });
}

export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: () => apiFetch(`/api/groups/${groupId}`),
    enabled: !!groupId,
    staleTime: 30 * 1000,
  });
}

export function useGroupMutations(userId?: string) {
  const queryClient = useQueryClient();

  const createGroupMutation = useMutation({
    mutationFn: (data: Omit<GroupDocument, 'createdAt' | 'totalExpenses' | 'groupCreatorId'>) =>
      apiFetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', userId] });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GroupDocument>; actorId: string }) =>
      apiFetch(`/api/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['groups', userId] });
    },
  });

  const archiveGroupMutation = useMutation({
    mutationFn: ({ id }: { id: string; actorId: string }) =>
      apiFetch(`/api/groups/${id}/archive`, { method: 'POST' }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['groups', userId] });
    },
  });

  const restoreGroupMutation = useMutation({
    mutationFn: ({ id }: { id: string; actorId: string }) =>
      apiFetch(`/api/groups/${id}/archive`, { method: 'DELETE' }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['groups', userId] });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/groups/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', userId] });
    },
  });

  return {
    createGroup: createGroupMutation,
    updateGroup: updateGroupMutation,
    archiveGroup: archiveGroupMutation,
    restoreGroup: restoreGroupMutation,
    deleteGroup: deleteGroupMutation,
  };
}

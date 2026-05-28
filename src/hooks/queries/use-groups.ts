import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getGroupsByUserId, 
  getGroupById, 
  createGroup, 
  updateGroup, 
  archiveGroup, 
  restoreGroup, 
  deleteGroupPermanently 
} from '@/lib/firestore.service';
import type { GroupDocument } from '@/types';

export function useGroups(userId: string | undefined) {
  return useQuery({
    queryKey: ['groups', userId],
    queryFn: () => getGroupsByUserId(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30s stale time
  });
}

export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroupById(groupId!),
    enabled: !!groupId,
    staleTime: 30 * 1000,
  });
}

export function useGroupMutations(userId?: string) {
  const queryClient = useQueryClient();

  const createGroupMutation = useMutation({
    mutationFn: (data: Omit<GroupDocument, 'createdAt' | 'totalExpenses' | 'groupCreatorId'>) => createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', userId] });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data, actorId }: { id: string; data: Partial<GroupDocument>; actorId: string }) => updateGroup(id, data, actorId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['groups', userId] });
    },
  });

  const archiveGroupMutation = useMutation({
    mutationFn: ({ id, actorId }: { id: string; actorId: string }) => archiveGroup(id, actorId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['groups', userId] });
    },
  });

  const restoreGroupMutation = useMutation({
    mutationFn: ({ id, actorId }: { id: string; actorId: string }) => restoreGroup(id, actorId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['groups', userId] });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => deleteGroupPermanently(id),
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

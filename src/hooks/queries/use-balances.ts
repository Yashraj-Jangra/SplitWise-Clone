import { useQuery } from '@tanstack/react-query';
import { getGroupBalances, getAllUserBalances } from '@/lib/firestore.service';

export function useGroupBalances(groupId: string | undefined) {
  return useQuery({
    queryKey: ['balances', groupId],
    queryFn: () => getGroupBalances(groupId!),
    enabled: !!groupId,
    staleTime: 30 * 1000, // 30s stale time
  });
}

export function useAllUserBalances(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-balances', userId],
    queryFn: () => getAllUserBalances(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

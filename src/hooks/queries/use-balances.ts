import { useQuery } from '@tanstack/react-query';

async function fetchGroupBalances(groupId: string) {
  const res = await fetch(`/api/groups/${groupId}/balances`);
  if (!res.ok) throw new Error('Failed to fetch group balances');
  return res.json();
}

async function fetchAllUserBalances(userId: string) {
  const res = await fetch(`/api/user/${userId}/balances`);
  if (!res.ok) throw new Error('Failed to fetch user balances');
  return res.json();
}

export function useGroupBalances(groupId: string | undefined) {
  return useQuery({
    queryKey: ['balances', groupId],
    queryFn: () => fetchGroupBalances(groupId!),
    enabled: !!groupId,
    staleTime: 30 * 1000, // 30s stale time
  });
}

export function useAllUserBalances(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-balances', userId],
    queryFn: () => fetchAllUserBalances(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

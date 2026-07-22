import { getItem, putItem, queryByEntityType, deleteItem } from '@/lib/nosql';
import type { UserProfile } from '@/types';

function mapToUserProfile(u: any): UserProfile {
  const nameParts = (u.name || '').split(' ');
  return {
    uid: u.id || u.uid,
    firstName: u.firstName || nameParts[0] || 'User',
    lastName: u.lastName || nameParts.slice(1).join(' ') || '',
    username: u.username || (u.email ? u.email.split('@')[0] : 'user'),
    email: u.email || '',
    role: (u.role as 'admin' | 'user') || 'user',
    avatarUrl: u.avatarUrl || u.image || undefined,
    countryCode: u.countryCode || undefined,
    mobileNumber: u.mobileNumber || undefined,
    upiId: u.upiId || undefined,
    dob: u.dob ? new Date(u.dob).toISOString() : undefined,
    createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
  };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const user = await getItem<any>(`USER#${uid}`, 'PROFILE');
  if (!user) return null;
  return mapToUserProfile(user);
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const users = await queryByEntityType<any>('USER');
  return users.map(mapToUserProfile).sort((a, b) => 
    new Date(b.createdAt || Date.now()).getTime() - new Date(a.createdAt || Date.now()).getTime()
  );
}

export async function getAllUsersPaginated(
  pageSize: number = 20,
  pageIndex: number = 0
): Promise<{ users: UserProfile[]; totalCount: number }> {
  const allUsers = await getAllUsers();
  const start = pageIndex * pageSize;
  const paginated = allUsers.slice(start, start + pageSize);

  return { users: paginated, totalCount: allUsers.length };
}

export async function isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
  const normalizedUsername = username.toLowerCase();
  const allUsers = await queryByEntityType<any>('USER');

  return allUsers.some(u => {
    if (excludeUserId && (u.id === excludeUserId || u.uid === excludeUserId)) return false;
    return (u.username || '').toLowerCase() === normalizedUsername;
  });
}

export async function updateUser(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
  if (data.username) {
    const taken = await isUsernameTaken(data.username, userId);
    if (taken) {
      throw new Error("Username is already taken.");
    }
  }

  const existing = (await getItem<any>(`USER#${userId}`, 'PROFILE')) || {};

  const updatedData = {
    ...existing,
    id: userId,
    ...(data.firstName !== undefined && { firstName: data.firstName }),
    ...(data.lastName !== undefined && { lastName: data.lastName }),
    ...(data.username !== undefined && { username: data.username.toLowerCase() }),
    ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl, image: data.avatarUrl }),
    ...(data.countryCode !== undefined && { countryCode: data.countryCode }),
    ...(data.mobileNumber !== undefined && { mobileNumber: data.mobileNumber }),
    ...(data.upiId !== undefined && { upiId: data.upiId || null }),
    ...(data.dob !== undefined && { dob: data.dob }),
    ...(data.role !== undefined && { role: data.role }),
    updatedAt: new Date().toISOString(),
  };

  const fname = updatedData.firstName || existing.firstName || 'User';
  const lname = updatedData.lastName || existing.lastName || '';
  updatedData.name = `${fname} ${lname}`.trim();

  await putItem(`USER#${userId}`, 'PROFILE', 'USER', updatedData, `EMAIL#${updatedData.email}`, 'PROFILE');

  const profile = await getUserProfile(userId);
  if (!profile) throw new Error('Failed to fetch updated user profile');
  return profile;
}

export async function hydrateUsers(uids: string[]): Promise<UserProfile[]> {
  if (uids.length === 0) return [];
  const uniqueUids = [...new Set(uids)];

  const profiles = await Promise.all(uniqueUids.map(id => getUserProfile(id)));
  return profiles.filter((p): p is UserProfile => p !== null);
}

export async function deleteUser(userId: string): Promise<void> {
  const user = await getItem<any>(`USER#${userId}`, 'PROFILE');
  if (user && (user.email === 'jangrayash1505@gmail.com' || user.role === 'superadmin')) {
    throw new Error('The main admin user cannot be deleted.');
  }
  await deleteItem(`USER#${userId}`, 'PROFILE');
}

export const updateUserProfile = updateUser;

import { prisma } from '@/lib/db';
import type { UserProfile } from '@/types';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: uid },
  });

  if (!user) return null;

  return {
    uid: user.id,
    firstName: user.firstName || user.name.split(' ')[0] || 'User',
    lastName: user.lastName || user.name.split(' ').slice(1).join(' ') || '',
    username: user.username || user.email.split('@')[0],
    email: user.email,
    role: (user.role as 'admin' | 'user') || 'user',
    avatarUrl: user.avatarUrl || user.image || undefined,
    countryCode: user.countryCode || undefined,
    mobileNumber: user.mobileNumber || undefined,
    dob: user.dob ? user.dob.toISOString() : undefined,
    createdAt: user.createdAt.toISOString(),
  } as UserProfile;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return users.map(user => ({
    uid: user.id,
    firstName: user.firstName || user.name.split(' ')[0] || 'User',
    lastName: user.lastName || user.name.split(' ').slice(1).join(' ') || '',
    username: user.username || user.email.split('@')[0],
    email: user.email,
    role: (user.role as 'admin' | 'user') || 'user',
    avatarUrl: user.avatarUrl || user.image || undefined,
    countryCode: user.countryCode || undefined,
    mobileNumber: user.mobileNumber || undefined,
    dob: user.dob ? user.dob.toISOString() : undefined,
    createdAt: user.createdAt.toISOString(),
  } as UserProfile));
}

export async function getAllUsersPaginated(
  pageSize: number = 20,
  pageIndex: number = 0 // Offset-based pagination replaces Firestore cursors
): Promise<{ users: UserProfile[]; totalCount: number }> {
  const [users, totalCount] = await prisma.$transaction([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      skip: pageIndex * pageSize,
      take: pageSize,
    }),
    prisma.user.count(),
  ]);

  const mappedUsers = users.map(user => ({
    uid: user.id,
    firstName: user.firstName || user.name.split(' ')[0] || 'User',
    lastName: user.lastName || user.name.split(' ').slice(1).join(' ') || '',
    username: user.username || user.email.split('@')[0],
    email: user.email,
    role: (user.role as 'admin' | 'user') || 'user',
    avatarUrl: user.avatarUrl || user.image || undefined,
    countryCode: user.countryCode || undefined,
    mobileNumber: user.mobileNumber || undefined,
    dob: user.dob ? user.dob.toISOString() : undefined,
    createdAt: user.createdAt.toISOString(),
  } as UserProfile));

  return { users: mappedUsers, totalCount };
}

export async function isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
  const normalizedUsername = username.toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      username: normalizedUsername,
      NOT: excludeUserId ? { id: excludeUserId } : undefined,
    },
  });

  return !!user;
}

export async function updateUser(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
  if (data.username) {
    const taken = await isUsernameTaken(data.username, userId);
    if (taken) {
      throw new Error("Username is already taken.");
    }
  }

  const updateData: any = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.username !== undefined) updateData.username = data.username.toLowerCase();
  if (data.avatarUrl !== undefined) {
    updateData.avatarUrl = data.avatarUrl;
    updateData.image = data.avatarUrl;
  }
  if (data.countryCode !== undefined) updateData.countryCode = data.countryCode;
  if (data.mobileNumber !== undefined) updateData.mobileNumber = data.mobileNumber;
  if (data.dob !== undefined) updateData.dob = data.dob ? new Date(data.dob) : null;
  if (data.role !== undefined) updateData.role = data.role;

  // Sync the composite 'name' field in Better Auth User model
  if (data.firstName !== undefined || data.lastName !== undefined) {
    const currentProfile = await getUserProfile(userId);
    const fname = data.firstName !== undefined ? data.firstName : currentProfile?.firstName || '';
    const lname = data.lastName !== undefined ? data.lastName : currentProfile?.lastName || '';
    updateData.name = `${fname} ${lname}`.trim();
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  const profile = await getUserProfile(updatedUser.id);
  if (!profile) throw new Error("Failed to fetch updated user profile");
  return profile;
}

export async function hydrateUsers(uids: string[]): Promise<UserProfile[]> {
  if (uids.length === 0) return [];
  const uniqueUids = [...new Set(uids)];

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueUids } },
  });

  return users.map(user => ({
    uid: user.id,
    firstName: user.firstName || user.name.split(' ')[0] || 'User',
    lastName: user.lastName || user.name.split(' ').slice(1).join(' ') || '',
    username: user.username || user.email.split('@')[0],
    email: user.email,
    role: (user.role as 'admin' | 'user') || 'user',
    avatarUrl: user.avatarUrl || user.image || undefined,
    countryCode: user.countryCode || undefined,
    mobileNumber: user.mobileNumber || undefined,
    dob: user.dob ? user.dob.toISOString() : undefined,
    createdAt: user.createdAt.toISOString(),
  } as UserProfile));
}

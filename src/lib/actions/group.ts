
'use server';

import { auth } from '@/lib/firebase';
import { archiveGroup, getGroupById, getGroupBalances, getUserProfile, hardDeleteGroup } from '@/lib/mock-data';
import type { Balance } from '@/types';

export async function archiveGroupAction(groupId: string, creatorId: string): Promise<{success: boolean; error?: string}> {
    const user = auth.currentUser;
    if (!user || user.uid !== creatorId) {
        return { success: false, error: "Unauthorized. Only the group creator can archive the group." };
    }

    try {
        const balances: Balance[] = await getGroupBalances(groupId);
        const isSettled = balances.every(b => Math.abs(b.netBalance) < 0.01);

        if (!isSettled) {
            return { success: false, error: "Cannot archive group. All debts must be settled first." };
        }
        
        await archiveGroup(groupId);
        return { success: true };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, error: errorMessage };
    }
}


export async function hardDeleteGroupAction(groupId: string): Promise<{success: boolean; error?: string}> {
    const user = auth.currentUser;
    if (!user) {
        return { success: false, error: "You must be logged in." };
    }
    
    try {
        const userProfile = await getUserProfile(user.uid);
        if (userProfile?.role !== 'admin') {
            return { success: false, error: "Unauthorized. Only admins can permanently delete groups." };
        }

        await hardDeleteGroup(groupId);
        return { success: true };

    } catch (error) {
         const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return { success: false, error: errorMessage };
    }
}

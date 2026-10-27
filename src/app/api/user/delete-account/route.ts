import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { deleteItem, queryByEntityType } from '@/lib/nosql';
import { getGroupsByUserId, removeMemberFromGroup } from '@/lib/services/group.service';
import { getGroupBalances } from '@/lib/services/balance.service';

export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uid = session.user.id;

    // Check all user's groups for unsettled balances or active group ownership
    const userGroups = await getGroupsByUserId(uid);
    for (const group of userGroups) {
      if (group.archivedAt) continue;

      // 1. Outstanding balance check
      const balances = await getGroupBalances(group.id);
      const memberBal = balances.find((b: any) => (b.user?.uid || b.userId) === uid);
      if (memberBal && Math.abs(memberBal.netBalance) >= 0.01) {
        const formatted = Math.abs(memberBal.netBalance).toFixed(2);
        const direction = memberBal.netBalance > 0 ? "are owed" : "owe";
        return NextResponse.json(
          { error: `Cannot delete account: You have an unsettled balance in group "${group.name}" (you ${direction} ₹${formatted}). Please settle all balances first.` },
          { status: 400 }
        );
      }

      // 2. Creator check: Cannot delete account if you are creator of an active group with other members
      if (group.createdBy.uid === uid && group.members.length > 1) {
        return NextResponse.json(
          { error: `Cannot delete account: You are the creator of active group "${group.name}". Please archive or delete the group first.` },
          { status: 400 }
        );
      }
    }

    // Clean up membership from groups where user is a regular member
    for (const group of userGroups) {
      if (group.createdBy.uid !== uid) {
        try {
          await removeMemberFromGroup(group.id, uid, uid);
        } catch {
          // Continue if already removed or archived
        }
      }
    }

    // Delete User Profile
    await deleteItem(`USER#${uid}`, 'PROFILE');

    // Clean up Sessions and Accounts for this user
    const sessions = await queryByEntityType<any>('SESSION');
    for (const s of sessions) {
      if (s.userId === uid) {
        await deleteItem(`USER#${uid}`, `SESSION#${s.id}`);
      }
    }

    const accounts = await queryByEntityType<any>('ACCOUNT');
    for (const a of accounts) {
      if (a.userId === uid) {
        await deleteItem(`USER#${uid}`, `ACCOUNT#${a.providerId}#${a.accountId}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/user/delete-account error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

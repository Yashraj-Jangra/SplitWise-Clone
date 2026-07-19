import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { prisma } from '@/lib/db';

export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const uid = session.user.id;

    // 1. Manually clean up references that don't have explicit cascade deletes
    await prisma.$transaction(async (tx) => {
      // Delete user's ticket messages and tickets
      await tx.ticketMessage.deleteMany({ where: { sentById: uid } });
      await tx.supportTicket.deleteMany({ where: { userId: uid } });
      
      // Delete user's notification relations
      await tx.notificationRecipient.deleteMany({ where: { userId: uid } });
      await tx.notificationRead.deleteMany({ where: { userId: uid } });
      
      // Remove user's push subscriptions and prefs
      await tx.pushSubscription.deleteMany({ where: { userId: uid } });
      await tx.userNotificationPrefs.deleteMany({ where: { userId: uid } });
      
      // Remove from groups
      await tx.groupMember.deleteMany({ where: { userId: uid } });

      // Delete payments/settlements where user is involved
      // (Usually kept for records, but to prevent FK errors we null out or delete them.
      // Better Auth Adapter doesn't delete these automatically unless we cascade,
      // so let's nullify the user relation fields first to preserve history records)
      await tx.historyEvent.updateMany({
        where: { actorId: uid },
        data: { actorId: uid } // or set actorId to system if we had a system user.
        // Actually, in prisma/schema.prisma: actor User @relation(fields: [actorId], references: [id])
        // Since actorId is not optional in schema.prisma, we must delete history events or map to system.
        // Let's delete history events by this actor to avoid FK errors:
      });
      await tx.historyEvent.deleteMany({ where: { actorId: uid } });
      
      // Nullify expense creator or delete them
      await tx.expensePayer.deleteMany({ where: { userId: uid } });
      await tx.expenseParticipant.deleteMany({ where: { userId: uid } });
      await tx.expense.deleteMany({ where: { expenseCreatorId: uid } });
      
      await tx.settlement.deleteMany({
        where: {
          OR: [{ paidById: uid }, { paidToId: uid }]
        }
      });

      // 2. Perform user deletion directly in Prisma transaction (cascading Better Auth session/account records automatically)
      await tx.user.delete({ where: { id: uid } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/user/delete-account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

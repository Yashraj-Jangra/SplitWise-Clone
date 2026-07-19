import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
        }
        
        if (session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: User is not an admin.' }, { status: 403 });
        }

        const { oldUid, newUid } = await request.json();
        if (!oldUid || !newUid) {
            return NextResponse.json({ error: 'Bad Request: oldUid and newUid are required.' }, { status: 400 });
        }

        const oldUser = await prisma.user.findUnique({ where: { id: oldUid } });
        const newUser = await prisma.user.findUnique({ where: { id: newUid } });

        if (!newUser) {
            return NextResponse.json({ error: `New user with UID ${newUid} does not exist.` }, { status: 404 });
        }

        const summary: string[] = [];

        await prisma.$transaction(async (tx) => {
            if (oldUser) {
                // Merge old user details to new user if missing
                await tx.user.update({
                  where: { id: newUid },
                  data: {
                    firstName: newUser.firstName || oldUser.firstName,
                    lastName: newUser.lastName || oldUser.lastName,
                    username: newUser.username || oldUser.username,
                    avatarUrl: newUser.avatarUrl || oldUser.avatarUrl,
                    countryCode: newUser.countryCode || oldUser.countryCode,
                    mobileNumber: newUser.mobileNumber || oldUser.mobileNumber,
                    dob: newUser.dob || oldUser.dob,
                  }
                });
                summary.push(`Merged profile metadata from user ${oldUid} to user ${newUid}.`);
            }

            // 1. Update session/account/verifications
            await tx.session.updateMany({ where: { userId: oldUid }, data: { userId: newUid } });
            await tx.account.updateMany({ where: { userId: oldUid }, data: { userId: newUid } });
            summary.push(`Updated Better Auth sessions and accounts.`);

            // 2. Groups where oldUid is creator
            await tx.group.updateMany({ where: { createdById: oldUid }, data: { createdById: newUid } });

            // 3. Group memberships (GroupMember)
            // Delete memberships for newUid if they already exist, to avoid duplicates on update
            const oldMemberships = await tx.groupMember.findMany({ where: { userId: oldUid } });
            for (const membership of oldMemberships) {
                const newExists = await tx.groupMember.findUnique({
                    where: { groupId_userId: { groupId: membership.groupId, userId: newUid } }
                });
                if (newExists) {
                    await tx.groupMember.delete({
                        where: { groupId_userId: { groupId: membership.groupId, userId: oldUid } }
                    });
                } else {
                    await tx.groupMember.update({
                        where: { groupId_userId: { groupId: membership.groupId, userId: oldUid } },
                        data: { userId: newUid }
                    });
                }
            }
            summary.push(`Merged group memberships.`);

            // 4. Expenses created by oldUid
            await tx.expense.updateMany({ where: { expenseCreatorId: oldUid }, data: { expenseCreatorId: newUid } });
            await tx.expense.updateMany({ where: { groupCreatorId: oldUid }, data: { groupCreatorId: newUid } });

            // 5. Expense Payers
            const payers = await tx.expensePayer.findMany({ where: { userId: oldUid } });
            for (const payer of payers) {
                const newExists = await tx.expensePayer.findUnique({
                    where: { expenseId_userId: { expenseId: payer.expenseId, userId: newUid } }
                });
                if (newExists) {
                    // Combine amounts if both paid
                    await tx.expensePayer.update({
                        where: { id: newExists.id },
                        data: { amount: newExists.amount + payer.amount }
                    });
                    await tx.expensePayer.delete({ where: { id: payer.id } });
                } else {
                    await tx.expensePayer.update({
                        where: { id: payer.id },
                        data: { userId: newUid }
                    });
                }
            }

            // 6. Expense Participants
            const participants = await tx.expenseParticipant.findMany({ where: { userId: oldUid } });
            for (const p of participants) {
                const newExists = await tx.expenseParticipant.findUnique({
                    where: { expenseId_userId: { expenseId: p.expenseId, userId: newUid } }
                });
                if (newExists) {
                    await tx.expenseParticipant.update({
                        where: { id: newExists.id },
                        data: { amountOwed: newExists.amountOwed + p.amountOwed }
                    });
                    await tx.expenseParticipant.delete({ where: { id: p.id } });
                } else {
                    await tx.expenseParticipant.update({
                        where: { id: p.id },
                        data: { userId: newUid }
                    });
                }
            }
            summary.push(`Merged expense payers and participants.`);

            // 7. Settlements
            await tx.settlement.updateMany({ where: { paidById: oldUid }, data: { paidById: newUid } });
            await tx.settlement.updateMany({ where: { paidToId: oldUid }, data: { paidToId: newUid } });

            // 8. History events
            await tx.historyEvent.updateMany({ where: { actorId: oldUid }, data: { actorId: newUid } });

            // 9. Support tickets and messages
            await tx.supportTicket.updateMany({ where: { userId: oldUid }, data: { userId: newUid } });
            await tx.supportTicket.updateMany({ where: { assignedToId: oldUid }, data: { assignedToId: newUid } });
            await tx.ticketMessage.updateMany({ where: { sentById: oldUid }, data: { sentById: newUid } });

            // 10. Push subscriptions & prefs
            await tx.pushSubscription.updateMany({ where: { userId: oldUid }, data: { userId: newUid } });
            
            // Delete old prefs, keep new one
            await tx.userNotificationPrefs.deleteMany({ where: { userId: oldUid } });

            // 11. Notifications recipient & read records
            const oldRecipients = await tx.notificationRecipient.findMany({ where: { userId: oldUid } });
            for (const rec of oldRecipients) {
                const exists = await tx.notificationRecipient.findUnique({
                    where: { notificationId_userId: { notificationId: rec.notificationId, userId: newUid } }
                });
                if (exists) {
                    await tx.notificationRecipient.delete({
                        where: { notificationId_userId: { notificationId: rec.notificationId, userId: oldUid } }
                    });
                } else {
                    await tx.notificationRecipient.update({
                        where: { notificationId_userId: { notificationId: rec.notificationId, userId: oldUid } },
                        data: { userId: newUid }
                    });
                }
            }

            const oldReads = await tx.notificationRead.findMany({ where: { userId: oldUid } });
            for (const r of oldReads) {
                const exists = await tx.notificationRead.findUnique({
                    where: { notificationId_userId: { notificationId: r.notificationId, userId: newUid } }
                });
                if (exists) {
                    await tx.notificationRead.delete({
                        where: { notificationId_userId: { notificationId: r.notificationId, userId: oldUid } }
                    });
                } else {
                    await tx.notificationRead.update({
                        where: { notificationId_userId: { notificationId: r.notificationId, userId: oldUid } },
                        data: { userId: newUid }
                    });
                }
            }

            // 12. Delete old user doc
            if (oldUser) {
                await tx.user.delete({ where: { id: oldUid } });
                summary.push(`Deleted old user account ${oldUid}.`);
            }
        });

        return NextResponse.json({
            success: true,
            message: `Successfully processed UID replacement.`,
            summary: summary,
        });

    } catch (error) {
        console.error('API Error - /api/admin/data-updater:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
        return NextResponse.json({ success: false, error: `Operation failed: ${errorMessage}`, summary: [] }, { status: 500 });
    }
}

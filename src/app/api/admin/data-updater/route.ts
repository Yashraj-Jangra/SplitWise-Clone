import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.server';
import { getUserProfile, updateUserProfile } from '@/lib/services/user.service';
import { deleteItem } from '@/lib/nosql';

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

        const oldUser = await getUserProfile(oldUid);
        const newUser = await getUserProfile(newUid);

        if (!newUser) {
            return NextResponse.json({ error: `New user with UID ${newUid} does not exist.` }, { status: 404 });
        }

        const summary: string[] = [];

        if (oldUser) {
            await updateUserProfile(newUid, {
                firstName: newUser.firstName || oldUser.firstName,
                lastName: newUser.lastName || oldUser.lastName,
                username: newUser.username || oldUser.username,
                avatarUrl: newUser.avatarUrl || oldUser.avatarUrl,
                countryCode: newUser.countryCode || oldUser.countryCode,
                mobileNumber: newUser.mobileNumber || oldUser.mobileNumber,
                dob: newUser.dob || oldUser.dob,
            });
            summary.push(`Merged profile metadata from user ${oldUid} to user ${newUid}.`);
            await deleteItem(`USER#${oldUid}`, 'PROFILE');
            summary.push(`Deleted old user account ${oldUid}.`);
        }

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

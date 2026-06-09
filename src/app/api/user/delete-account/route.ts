import { NextResponse } from 'next/server';
import { firebaseAdmin } from '@/lib/firebase-admin';

export async function DELETE(request: Request) {
    try {
        const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let uid: string;
        try {
            const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
            uid = decodedToken.uid;
        } catch {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const db = firebaseAdmin.firestore();
        const BATCH_SIZE = 499;

        async function chunkedBatchDelete(refs: FirebaseFirestore.DocumentReference[]) {
            for (let i = 0; i < refs.length; i += BATCH_SIZE) {
                const chunk = refs.slice(i, i + BATCH_SIZE);
                const batch = db.batch();
                chunk.forEach(ref => batch.delete(ref));
                await batch.commit();
            }
        }

        // 1. Remove user from group member lists (but don't delete groups they created)
        const groupsSnap = await db.collection('groups')
            .where('memberIds', 'array-contains', uid)
            .get();

        const groupBatch = db.batch();
        groupsSnap.docs.forEach(groupDoc => {
            const memberIds: string[] = groupDoc.data().memberIds || [];
            const updatedMembers = memberIds.filter((id: string) => id !== uid);
            groupBatch.update(groupDoc.ref, { memberIds: updatedMembers });
        });
        await groupBatch.commit();

        // 2. Delete notification prefs
        const prefsRef = db.collection('user_notification_prefs').doc(uid);
        await prefsRef.delete().catch(() => {}); // ignore if not found

        // 3. Delete push subscription devices
        const devicesSnap = await db.collection(`push_subscriptions/${uid}/devices`).get();
        await chunkedBatchDelete(devicesSnap.docs.map(d => d.ref));

        // 4. Delete notifications where this user is sole recipient
        // (We can't easily remove just their UID from shared ones, so we leave those — they won't see them after deletion)
        // But we can delete their prefs doc and their push subs.

        // 5. Delete user Firestore profile
        const userDocRef = db.collection('users').doc(uid);
        await userDocRef.delete();

        // 6. Delete the Firebase Auth account (must be last — once gone, the token is invalidated)
        await firebaseAdmin.auth().deleteUser(uid);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/user/delete-account error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

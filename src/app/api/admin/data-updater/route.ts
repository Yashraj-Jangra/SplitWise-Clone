
import { NextResponse } from 'next/server';
import { firebaseAdmin } from '@/lib/firebase-admin';
import type { CollectionReference } from 'firebase-admin/firestore';

// WARNING: This is a powerful and destructive API. Ensure it is properly secured.

// Define collections and the fields within them that might contain a UID.
const COLLECTIONS_AND_FIELDS: { [key: string]: string[] } = {
    'groups': ['memberIds', 'createdById'],
    'expenses': ['payerIds', 'participantIds', 'expenseCreatorId', 'groupMemberIds'],
    'settlements': ['paidById', 'paidToId', 'groupMemberIds'],
    'history': ['actorId', 'data.paidById', 'data.paidToId', 'groupMemberIds'], 
};

export async function POST(request: Request) {
    try {
        const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized: No token provided.' }, { status: 401 });
        }
        
        const adminAuth = firebaseAdmin.auth();
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        
        if (decodedToken.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: User is not an admin.' }, { status: 403 });
        }

        const { oldUid, newUid } = await request.json();
        if (!oldUid || !newUid) {
            return NextResponse.json({ error: 'Bad Request: oldUid and newUid are required.' }, { status: 400 });
        }

        const db = firebaseAdmin.firestore();
        const batch = db.batch();
        let changesCount = 0;
        const summary: string[] = [];

        // --- Core User Document Update ---
        const oldUserDocRef = db.collection('users').doc(oldUid);
        const newUserDocRef = db.collection('users').doc(newUid);

        const [oldUserSnap, newUserSnap] = await Promise.all([oldUserDocRef.get(), newUserDocRef.get()]);

        if (!newUserSnap.exists) {
            return NextResponse.json({ error: `New user with UID ${newUid} does not exist in Firestore.` }, { status: 404 });
        }
        
        if (oldUserSnap.exists) {
            const oldUserData = oldUserSnap.data()!;
            const newUserData = newUserSnap.data()!;
            
            // Merge profile data, preferring new user's core data
            const mergedData = {
                ...oldUserData,
                ...newUserData,
                uid: newUid,
                email: newUserData.email, 
                createdAt: newUserData.createdAt || oldUserData.createdAt,
                role: newUserData.role || oldUserData.role,
            };

            batch.set(newUserDocRef, mergedData, { merge: true });
            changesCount++;
            summary.push(`Merged data from users/${oldUid} into users/${newUid}`);
        }
        
        // --- Update Collections ---
        for (const collectionName of Object.keys(COLLECTIONS_AND_FIELDS)) {
            const collectionRef = db.collection(collectionName) as CollectionReference;

            // Check array fields (e.g., memberIds)
            const arrayFields = ['memberIds', 'payerIds', 'participantIds', 'groupMemberIds'];
            for (const field of arrayFields) {
                if (COLLECTIONS_AND_FIELDS[collectionName].includes(field)) {
                    const querySnapshot = await collectionRef.where(field, 'array-contains', oldUid).get();
                    querySnapshot.forEach(doc => {
                        batch.update(doc.ref, {
                            [field]: firebaseAdmin.firestore.FieldValue.arrayRemove(oldUid)
                        });
                        batch.update(doc.ref, {
                            [field]: firebaseAdmin.firestore.FieldValue.arrayUnion(newUid)
                        });
                        changesCount++;
                        summary.push(`Updated array field '${field}' in ${collectionName}/${doc.id}`);
                    });
                }
            }
            
            // Check direct string fields (e.g., createdById)
            const stringFields = ['createdById', 'expenseCreatorId', 'paidById', 'paidToId', 'actorId'];
            for (const field of stringFields) {
                 if (COLLECTIONS_AND_FIELDS[collectionName].includes(field)) {
                    const querySnapshot = await collectionRef.where(field, '==', oldUid).get();
                    querySnapshot.forEach(doc => {
                        batch.update(doc.ref, { [field]: newUid });
                        changesCount++;
                        summary.push(`Updated field '${field}' in ${collectionName}/${doc.id}`);
                    });
                 }
            }
        }
        
        // --- CORRECTLY handle complex nested fields ---

        // Expenses: payers and participants arrays of objects
        const expensesSnap = await db.collection('expenses').get();
        expensesSnap.forEach(doc => {
            const expense = doc.data();
            let updated = false;
            
            const newPayers = expense.payers.map((payer: any) => {
                if (payer.userId === oldUid) {
                    updated = true;
                    return { ...payer, userId: newUid };
                }
                return payer;
            });
            
            const newParticipants = expense.participants.map((p: any) => {
                if (p.userId === oldUid) {
                    updated = true;
                    return { ...p, userId: newUid };
                }
                return p;
            });
            
            if (updated) {
                batch.update(doc.ref, { payers: newPayers, participants: newParticipants });
                changesCount++;
                 summary.push(`Updated nested user ID in expense document: expenses/${doc.id}`);
            }
        });

        // --- Finally, delete the old user document AFTER all other operations are staged
        if(oldUserSnap.exists) {
            batch.delete(oldUserDocRef);
            changesCount++;
            summary.push(`Deleted user document: users/${oldUid}`);
        }

        // --- Commit changes ---
        if (changesCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            message: `Successfully processed UID replacement. ${changesCount} modifications were made.`,
            summary: summary,
        });

    } catch (error) {
        console.error('API Error - /api/admin/data-updater:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown server error occurred.';
        return NextResponse.json({ success: false, error: `Operation failed: ${errorMessage}`, summary: [] }, { status: 500 });
    }
}

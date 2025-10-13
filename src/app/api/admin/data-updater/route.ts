
import { NextResponse } from 'next/server';
import { firebaseAdmin } from '@/lib/firebase-admin';
import { CollectionReference } from 'firebase-admin/firestore';

// WARNING: This is a powerful and destructive API. Ensure it is properly secured.

// Define collections and the fields within them that might contain a UID.
const COLLECTIONS_AND_FIELDS: { [key: string]: string[] } = {
    'groups': ['memberIds', 'createdById'],
    'expenses': ['payerIds', 'participantIds', 'expenseCreatorId'],
    'settlements': ['paidById', 'paidToId'],
    'history': ['actorId', 'data.paidById', 'data.paidToId'], // Simple paths for now
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
            
            // Create a merged profile, giving precedence to the new user's core data
            // but filling in missing details from the old one.
            const mergedData = {
                ...oldUserData,
                ...newUserData, // New user data overwrites old, where fields conflict
                uid: newUid, // Ensure UID is the new one
                email: newUserData.email, // Explicitly keep new user's email
                createdAt: newUserData.createdAt || oldUserData.createdAt, // Keep whichever exists, preferring new
                role: newUserData.role || oldUserData.role, // Keep whichever exists, preferring new
            };

            // Don't copy over fields that should be unique to the new user
            delete mergedData.uid;

            batch.set(newUserDocRef, mergedData, { merge: true });
            changesCount++;
            summary.push(`Merged data from users/${oldUid} into users/${newUid}`);
        }
        
        // --- Update Collections ---
        for (const collectionName of Object.keys(COLLECTIONS_AND_FIELDS)) {
            const collectionRef = db.collection(collectionName) as CollectionReference;

            // Check array fields
            const arrayFields = ['memberIds', 'payerIds', 'participantIds'];
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
                        changesCount += 1; // Considered as one logical change
                        summary.push(`Updated array field '${field}' in ${collectionName}/${doc.id}`);
                    });
                }
            }
            
            // Check direct string fields
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
        
        // --- Complex Field Updates (nested in maps) ---
        // This requires more specific logic for each case.
        // Example for expense payers/participants (which are arrays of objects)
        const expensesRef = db.collection('expenses');
        const expensesSnap = await expensesRef.get();
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
        return NextResponse.json({ error: `Operation failed: ${errorMessage}` }, { status: 500 });
    }
}

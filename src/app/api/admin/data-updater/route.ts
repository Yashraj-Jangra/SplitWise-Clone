
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
        // Get new user's data and delete old user's doc
        const oldUserDocRef = db.collection('users').doc(oldUid);
        const newUserDocRef = db.collection('users').doc(newUid);
        const newUserSnap = await newUserDocRef.get();
        if (!newUserSnap.exists) {
            return NextResponse.json({ error: `New user with UID ${newUid} does not exist in Firestore.` }, { status: 404 });
        }
        batch.delete(oldUserDocRef);
        changesCount++;
        summary.push(`Deleted user document: users/${oldUid}`);


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

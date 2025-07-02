

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  documentId,
  orderBy,
  setDoc,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import type {
  UserProfile,
  Group,
  GroupDocument,
  Expense,
  ExpenseDocument,
  Settlement,
  SettlementDocument,
  Balance,
  ExpenseParticipant,
  ExpensePayer,
  HistoryEvent,
  HistoryEventDocument,
  SiteSettings,
  SimplifiedSettlement,
  PolicyPage,
  TeamMember,
} from '@/types';
import { getFullName } from './utils';
import { CURRENCY_SYMBOL } from './constants';
import { format } from 'date-fns';

// --- User Functions ---

export async function isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
    const normalizedUsername = username.toLowerCase();
    const q = query(collection(db, 'users'), where('username', '==', normalizedUsername));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return false;
    }
    
    // If we are checking for an update, we need to see if the found username belongs to a different user
    if (excludeUserId) {
        return querySnapshot.docs.some(doc => doc.id !== excludeUserId);
    }
    
    return !querySnapshot.empty;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return { 
        ...data, 
        uid: docSnap.id, 
        createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
        dob: data.dob ? (data.dob as Timestamp)?.toDate().toISOString() : undefined
    } as UserProfile;
  }
  return null;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const usersCol = collection(db, 'users');
  const userSnapshot = await getDocs(usersCol);
  return userSnapshot.docs.map(doc => {
      const data = doc.data();
      return { 
          ...data,
          uid: doc.id, 
          createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
          dob: data.dob ? (data.dob as Timestamp)?.toDate().toISOString() : undefined
      } as UserProfile
  });
}

export async function updateUser(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
    if (data.username) {
        const taken = await isUsernameTaken(data.username, userId);
        if (taken) {
            throw new Error("Username is already taken.");
        }
    }
    
    const userDocRef = doc(db, "users", userId);
    const updateData: { [key: string]: any } = { ...data };

    if (data.dob) {
        updateData.dob = Timestamp.fromDate(new Date(data.dob));
    }

    // Firestore doesn't like `undefined` values.
    const cleanUpdateData = Object.fromEntries(Object.entries(updateData).filter(([_, v]) => v !== undefined));

    await updateDoc(userDocRef, cleanUpdateData);
    const updatedUser = await getUserProfile(userId);
    if (!updatedUser) throw new Error("Failed to fetch updated user");
    return updatedUser;
}

// --- Hydration / Joining Functions ---

async function hydrateUsers(uids: string[]): Promise<UserProfile[]> {
    if (uids.length === 0) return [];
    
    const uniqueUids = [...new Set(uids)];
    if (uniqueUids.length === 0) return [];
    
    const chunks: string[][] = [];
    for (let i = 0; i < uniqueUids.length; i += 30) {
        chunks.push(uniqueUids.slice(i, i + 30));
    }

    const userPromises = chunks.map(async (chunk) => {
         const usersQuery = query(collection(db, 'users'), where(documentId(), 'in', chunk));
         const querySnapshot = await getDocs(usersQuery);
         return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                ...data, 
                uid: doc.id,
                createdAt: (data.createdAt as Timestamp)?.toDate().toISOString(),
                dob: data.dob ? (data.dob as Timestamp)?.toDate().toISOString() : undefined
            } as UserProfile
         });
    });

    const results = await Promise.all(userPromises);
    return results.flat();
}

// --- Group Functions ---

export async function createGroup(groupData: Omit<GroupDocument, 'createdAt' | 'totalExpenses' | 'groupCreatorId'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'groups'), {
        ...groupData,
        groupCreatorId: groupData.createdById,
        totalExpenses: 0,
        createdAt: Timestamp.now(),
    });
    return docRef.id;
}

export async function getGroupById(groupId: string): Promise<Group | null> {
    const groupDocRef = doc(db, "groups", groupId);
    const groupSnap = await getDoc(groupDocRef);

    if (!groupSnap.exists()) return null;

    const groupData = groupSnap.data() as GroupDocument;
    
    const [members, createdBy] = await Promise.all([
        hydrateUsers(groupData.memberIds),
        getUserProfile(groupData.createdById)
    ]);

    if (!createdBy) throw new Error("Created by user not found for group");

    return {
        ...groupData,
        id: groupSnap.id,
        createdAt: (groupData.createdAt as Timestamp).toDate().toISOString(),
        members,
        createdBy,
    };
}

export async function getGroupsByUserId(userId: string): Promise<Group[]> {
    const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', userId));
    const querySnapshot = await getDocs(q);

    const groups: Group[] = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
            const groupData = docSnap.data() as GroupDocument;
             const [members, createdBy] = await Promise.all([
                hydrateUsers(groupData.memberIds),
                getUserProfile(groupData.createdById)
            ]);
            if (!createdBy) return null; // Should not happen
            return {
                ...groupData,
                id: docSnap.id,
                createdAt: (groupData.createdAt as Timestamp).toDate().toISOString(),
                members,
                createdBy
            }
        })
    );
    return groups.filter((g): g is Group => g !== null).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAllGroups(): Promise<Group[]> {
    const groupsCol = collection(db, 'groups');
    const groupSnapshot = await getDocs(groupsCol);
    
    const allUserIds = new Set<string>();
    const groupDocs = groupSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupDocument & {id: string}));
    groupDocs.forEach(g => {
        allUserIds.add(g.createdById);
        g.memberIds.forEach(mid => allUserIds.add(mid));
    });
    const allUsers = await hydrateUsers(Array.from(allUserIds));
    const userMap = new Map(allUsers.map(u => [u.uid, u]));

    const groups: Group[] = groupDocs.map((groupData) => {
            const createdBy = userMap.get(groupData.createdById);
            if (!createdBy) return null;
            const members = groupData.memberIds.map(id => userMap.get(id)).filter(u => u) as UserProfile[];

            return {
                ...groupData,
                id: groupData.id,
                createdAt: (groupData.createdAt as Timestamp).toDate().toISOString(),
                members,
                createdBy
            }
        });
    return groups.filter((g): g is Group => g !== null);
}

export async function addMembersToGroup(groupId: string, memberIds: string[], actorId: string): Promise<void> {
    const groupDocRef = doc(db, 'groups', groupId);
    await updateDoc(groupDocRef, {
        memberIds: arrayUnion(...memberIds)
    });
    
    const [actor, newMembers] = await Promise.all([
        getUserProfile(actorId),
        hydrateUsers(memberIds)
    ]);
    const actorName = getFullName(actor?.firstName, actor?.lastName);
    const newMemberNames = newMembers.map(m => getFullName(m.firstName, m.lastName)).join(', ');
    const description = `${actorName} added ${newMemberNames} to the group.`;
    await logHistoryEvent(groupId, 'member_added', actorId, description, { memberIds });
}

export async function archiveGroup(groupId: string): Promise<void> {
    const groupDocRef = doc(db, 'groups', groupId);
    await updateDoc(groupDocRef, {
        memberIds: []
    });
}

export async function updateGroup(groupId: string, data: Partial<GroupDocument>, actorId: string): Promise<void> {
    const groupDocRef = doc(db, 'groups', groupId);
    
    const groupSnap = await getDoc(groupDocRef);
    if (!groupSnap.exists()) {
        throw new Error("Group not found.");
    }
    const oldData = groupSnap.data() as GroupDocument;

    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    await updateDoc(groupDocRef, cleanData);

    // Now, check for changes and log history
    const actor = await getUserProfile(actorId);
    const actorName = getFullName(actor?.firstName, actor?.lastName);

    const changes: { field: string; from: any; to: any }[] = [];
    
    if (data.name && data.name !== oldData.name) {
        changes.push({ field: 'Name', from: `"${oldData.name}"`, to: `"${data.name}"` });
    }
    if (data.description !== undefined && data.description !== (oldData.description || '')) {
         changes.push({ field: 'Description', from: `"${oldData.description || ''}"`, to: `"${data.description || ''}"` });
    }
    if (data.coverImageUrl && data.coverImageUrl !== oldData.coverImageUrl) {
        // Just log that it changed, not the URLs, to keep the log clean.
        changes.push({ field: 'Cover Image', from: 'updated', to: '' });
    }

    if (changes.length > 0) {
        const changeSummary = changes.map(c => c.field.toLowerCase()).join(', ');
        const description = `${actorName} updated the group ${changeSummary}.`;
        await logHistoryEvent(groupId, 'group_updated', actorId, description, { changes });
    }
}


// --- Expense Functions ---

export async function addExpense(expenseData: Omit<ExpenseDocument, 'date' | 'participantIds' | 'payerIds' | 'groupMemberIds' | 'groupCreatorId' | 'expenseCreatorId'> & { date: Date }, actorId: string): Promise<string> {
    const groupDocRef = doc(db, 'groups', expenseData.groupId);
    const groupSnap = await getDoc(groupDocRef);

    if(!groupSnap.exists()){
        throw new Error("Group not found to add expense.");
    }
    const groupData = groupSnap.data() as GroupDocument;
    
    const participantIds = expenseData.participants.map(p => p.userId);
    const payerIds = expenseData.payers.map(p => p.userId);
    const docRef = await addDoc(collection(db, 'expenses'), {
        ...expenseData,
        participantIds,
        payerIds,
        groupMemberIds: groupData.memberIds,
        groupCreatorId: groupData.createdById,
        expenseCreatorId: actorId,
        date: Timestamp.fromDate(expenseData.date),
    });

    const currentTotal = groupSnap.data().totalExpenses || 0;
    await updateDoc(groupDocRef, {
        totalExpenses: currentTotal + expenseData.amount
    });
    
    const actor = await getUserProfile(actorId);
    const actorName = getFullName(actor?.firstName, actor?.lastName);
    const description = `${actorName} added expense "${expenseData.description}" for ${CURRENCY_SYMBOL}${expenseData.amount.toFixed(2)}.`;
    await logHistoryEvent(expenseData.groupId, 'expense_created', actorId, description, { expenseId: docRef.id });


    return docRef.id;
}


export async function updateExpense(expenseId: string, oldAmount: number, expenseData: Omit<ExpenseDocument, 'date' | 'participantIds' | 'payerIds' | 'groupMemberIds'> & { date: Date }, actorId: string): Promise<void> {
    const expenseDocRef = doc(db, 'expenses', expenseId);
    const expenseSnap = await getDoc(expenseDocRef);
    const oldData = expenseSnap.exists() ? expenseSnap.data() as ExpenseDocument : null;

    const groupDocRef = doc(db, 'groups', expenseData.groupId);
    const groupSnap = await getDoc(groupDocRef);
    if(!groupSnap.exists()){
        throw new Error("Group not found to update expense.");
    }
    const groupData = groupSnap.data() as GroupDocument;

    const participantIds = expenseData.participants.map(p => p.userId);
    const payerIds = expenseData.payers.map(p => p.userId);
    await updateDoc(expenseDocRef, {
        ...expenseData,
        participantIds,
        payerIds,
        groupMemberIds: groupData.memberIds,
        groupCreatorId: groupData.createdById, 
        expenseCreatorId: oldData?.expenseCreatorId || actorId, 
        date: Timestamp.fromDate(expenseData.date)
    });

    const currentTotal = groupSnap.data().totalExpenses || 0;
    const newTotal = currentTotal - oldAmount + expenseData.amount;
    await updateDoc(groupDocRef, {
        totalExpenses: newTotal
    });

    const actor = await getUserProfile(actorId);
    const actorName = getFullName(actor?.firstName, actor?.lastName);
    
    const changes: { field: string; from: any; to: any }[] = [];
    const changeSummaries: string[] = [];

    if (oldData) {
        const oldDate = (oldData.date as Timestamp).toDate();

        if (oldData.description !== expenseData.description) {
            changes.push({ field: 'Description', from: `"${oldData.description}"`, to: `"${expenseData.description}"` });
            changeSummaries.push('description');
        }
        if (oldData.amount !== expenseData.amount) {
            changes.push({ field: 'Amount', from: `${CURRENCY_SYMBOL}${oldData.amount.toFixed(2)}`, to: `${CURRENCY_SYMBOL}${expenseData.amount.toFixed(2)}` });
            changeSummaries.push('amount');
        }
        if (oldDate.toISOString().split('T')[0] !== expenseData.date.toISOString().split('T')[0]) {
            changes.push({ field: 'Date', from: format(oldDate, 'PPP'), to: format(expenseData.date, 'PPP') });
            changeSummaries.push('date');
        }
        if ((oldData.category || 'Other') !== (expenseData.category || 'Other')) {
            changes.push({ field: 'Category', from: `"${oldData.category || 'Other'}"`, to: `"${expenseData.category || 'Other'}"` });
            changeSummaries.push('category');
        }
        if (oldData.splitType !== expenseData.splitType) {
             changes.push({ field: 'Split Method', from: `"${oldData.splitType}"`, to: `"${expenseData.splitType}"` });
             changeSummaries.push('split method');
        }

        const oldPayersStr = JSON.stringify(oldData.payers.sort((a,b) => a.userId.localeCompare(b.userId)));
        const newPayersStr = JSON.stringify(expenseData.payers.sort((a,b) => a.userId.localeCompare(b.userId)));
        if (oldPayersStr !== newPayersStr) {
            changes.push({ field: 'Payers', from: 'List of payers was updated.', to: '' });
            changeSummaries.push('payers');
        }
        
        const oldParticipantsStr = JSON.stringify(oldData.participants.sort((a,b) => a.userId.localeCompare(b.userId)));
        const newParticipantsStr = JSON.stringify(expenseData.participants.sort((a,b) => a.userId.localeCompare(b.userId)));
        if (oldParticipantsStr !== newParticipantsStr) {
            changes.push({ field: 'Split', from: 'Participant split was updated.', to: '' });
            changeSummaries.push('participant split');
        }
    }

    let description: string;
    if (changeSummaries.length > 0) {
        const uniqueSummaries = [...new Set(changeSummaries)];
        const summaryText = uniqueSummaries.length > 2
            ? `${uniqueSummaries.slice(0, 2).join(', ')} and other details`
            : uniqueSummaries.join(' and ');
        description = `${actorName} updated the ${summaryText} for expense "${oldData?.description}".`;
    } else {
        description = `${actorName} re-saved expense "${oldData?.description}" with no changes.`;
    }
    
    await logHistoryEvent(expenseData.groupId, 'expense_updated', actorId, description, {
        expenseId,
        changes,
        before: oldData,
        after: { ...expenseData, date: Timestamp.fromDate(expenseData.date) }
    });
}

export async function deleteExpense(expenseId: string, groupId: string, amount: number, actorId: string): Promise<void> {
    const expenseDocRef = doc(db, 'expenses', expenseId);
    const expenseSnap = await getDoc(expenseDocRef);

    if (!expenseSnap.exists()) return;
    const deletedExpenseData = expenseSnap.data();

    const batch = writeBatch(db);

    const groupDocRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupDocRef);
    if (groupSnap.exists()) {
        const currentTotal = groupSnap.data().totalExpenses || 0;
        const newTotal = currentTotal - amount;
        batch.update(groupDocRef, { totalExpenses: newTotal < 0 ? 0 : newTotal });
    }

    batch.delete(expenseDocRef);

    await batch.commit();

    const actor = await getUserProfile(actorId);
    const actorName = getFullName(actor?.firstName, actor?.lastName);
    const description = `${actorName} deleted expense "${deletedExpenseData.description}" (was ${CURRENCY_SYMBOL}${amount.toFixed(2)}).`;

    // Ensure payerIds exists for restoration
    if (!deletedExpenseData.payerIds && deletedExpenseData.payers) {
        deletedExpenseData.payerIds = deletedExpenseData.payers.map((p: ExpensePayer) => p.user.uid);
    }
    
    await logHistoryEvent(groupId, 'expense_deleted', actorId, description, { ...deletedExpenseData, expenseId: expenseId });
}


export async function getExpensesByGroupId(groupId: string): Promise<Expense[]> {
    const user = auth.currentUser;
    if (!user) return []; // Cannot fetch without a logged-in user for security rule compliance.

    const q = query(
        collection(db, 'expenses'), 
        where('groupId', '==', groupId), 
        where('groupMemberIds', 'array-contains', user.uid)
    );
    const querySnapshot = await getDocs(q);

    const expenses: Expense[] = await Promise.all(
        querySnapshot.docs.map(async (docSnap) => {
            const expenseData = docSnap.data() as ExpenseDocument;
            const userIds = [
                ...(expenseData.payers || []).map(p => p.userId), 
                ...(expenseData.participants || []).map(p => p.userId)
            ];
            const uniqueUserIds = [...new Set(userIds)];
            const users = await hydrateUsers(uniqueUserIds);
            const userMap = new Map(users.map(u => [u.uid, u]));
            
            const payers = (expenseData.payers || []).map(p => {
                const user = userMap.get(p.userId);
                return user ? { ...p, user } : null;
            }).filter((p): p is ExpensePayer => p !== null);
            
            const participants = (expenseData.participants || []).map(p => {
                const user = userMap.get(p.userId);
                return user ? { ...p, user } : null;
            }).filter((p): p is ExpenseParticipant => p !== null);

            return {
                ...expenseData,
                id: docSnap.id,
                date: (expenseData.date as Timestamp).toDate().toISOString(),
                payers,
                participants
            }
        })
    );
     return expenses.filter((e): e is Expense => e !== null);
}

export async function getExpensesByUserId(userId: string): Promise<Expense[]> {
  const expensesRef = collection(db, 'expenses');
  
  // This is a secure query, as security rules can check if `userId` is in `groupMemberIds`.
  const memberQuery = query(expensesRef, where('groupMemberIds', 'array-contains', userId));
  
  const memberSnapshot = await getDocs(memberQuery);
  
  const expenseMap = new Map<string, ExpenseDocument>();

  // Now, we filter client-side. The permission error happens during the `getDocs` call,
  // so by the time we get here, we have a set of documents we are allowed to read.
  memberSnapshot.docs.forEach(doc => {
      const expenseData = doc.data() as ExpenseDocument;
      // We only want expenses where the user was actually a payer or participant.
      const isParticipant = expenseData.participantIds?.includes(userId);
      const isPayer = expenseData.payerIds?.includes(userId);
      if (isParticipant || isPayer) {
          expenseMap.set(doc.id, expenseData);
      }
  });

  const expenses: Expense[] = await Promise.all(
    Array.from(expenseMap.entries()).map(async ([id, expenseData]) => {
        const userIds = [
            ...(expenseData.payers || []).map(p => p.userId), 
            ...(expenseData.participants || []).map(p => p.userId)
        ];
        const uniqueUserIds = [...new Set(userIds)];
        const users = await hydrateUsers(uniqueUserIds);
        const userMap = new Map(users.map(u => [u.uid, u]));

        const payers = (expenseData.payers || []).map(p => {
                const user = userMap.get(p.userId);
                return user ? { ...p, user } : null;
            }).filter((p): p is ExpensePayer => p !== null);
        
        const participants = (expenseData.participants || []).map((p) => {
            const user = userMap.get(p.userId);
            return user ? { ...p, user } : null;
        }).filter((p): p is ExpenseParticipant => p !== null);

        return {
            ...expenseData,
            id: id,
            date: (expenseData.date as Timestamp).toDate().toISOString(),
            payers,
            participants
        }
    })
  );
  return expenses.filter((e): e is Expense => e !== null);
}

export async function getAllExpenses(): Promise<Expense[]> {
  const expensesCol = collection(db, 'expenses');
  const expenseSnapshot = await getDocs(expensesCol);

  const allUserIds = new Set<string>();
  const expenseDocs = expenseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExpenseDocument & {id: string}));
  
  expenseDocs.forEach(expense => {
    (expense.payers || []).forEach(p => allUserIds.add(p.userId));
    (expense.participants || []).forEach(p => allUserIds.add(p.userId));
  });

  const allUsers = await hydrateUsers(Array.from(allUserIds));
  const userMap = new Map(allUsers.map(u => [u.uid, u]));

  const expenses: Expense[] = expenseDocs.map((expenseData) => {
      const payers = (expenseData.payers || []).map(p => {
          const user = userMap.get(p.userId);
          return user ? { ...p, user } : null;
      }).filter((p): p is ExpensePayer => p !== null);

      const participants = (expenseData.participants || []).map(p => {
          const user = userMap.get(p.userId);
          return user ? { ...p, user } : null;
      }).filter((p): p is ExpenseParticipant => p !== null);

      return {
          ...expenseData,
          id: expenseData.id,
          date: (expenseData.date as Timestamp).toDate().toISOString(),
          payers,
          participants
      }
  }).filter((e): e is Expense => e !== null);
  
  return expenses;
}


// --- Settlement Functions ---

export async function addSettlement(settlementData: Omit<SettlementDocument, 'date' | 'groupMemberIds'> & { date: Date }, actorId: string): Promise<string> {
    const groupDocRef = doc(db, 'groups', settlementData.groupId);
    const groupSnap = await getDoc(groupDocRef);
    if (!groupSnap.exists()) {
        throw new Error("Group not found to add settlement.");
    }
    const groupData = groupSnap.data() as GroupDocument;
    
    const docRef = await addDoc(collection(db, 'settlements'), {
        ...settlementData,
        groupMemberIds: groupData.memberIds,
        date: Timestamp.fromDate(settlementData.date),
    });
    
    const [actor, paidBy, paidTo] = await Promise.all([
        getUserProfile(actorId),
        getUserProfile(settlementData.paidById),
        getUserProfile(settlementData.paidToId),
    ]);
    const actorName = getFullName(actor?.firstName, actor?.lastName);
    const paidByName = getFullName(paidBy?.firstName, paidBy?.lastName);
    const paidToName = getFullName(paidTo?.firstName, paidTo?.lastName);

    const description = `${actorName} recorded a settlement: ${paidByName} paid ${paidToName} ${CURRENCY_SYMBOL}${settlementData.amount.toFixed(2)}.`;
    await logHistoryEvent(settlementData.groupId, 'settlement_created', actorId, description, { settlementId: docRef.id });

    return docRef.id;
}


export async function getSettlementsByGroupId(groupId: string): Promise<Settlement[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const q = query(
        collection(db, 'settlements'), 
        where('groupId', '==', groupId), 
        where('groupMemberIds', 'array-contains', user.uid)
    );
    const querySnapshot = await getDocs(q);
    
    const userIds = new Set<string>();
    querySnapshot.docs.forEach(doc => {
        const data = doc.data() as SettlementDocument;
        userIds.add(data.paidById);
        userIds.add(data.paidToId);
    });
    const users = await hydrateUsers(Array.from(userIds));
    const userMap = new Map(users.map(u => [u.uid, u]));

    const settlements: Settlement[] = querySnapshot.docs.map((docSnap) => {
            const settlementData = docSnap.data() as SettlementDocument;
            const paidBy = userMap.get(settlementData.paidById);
            const paidTo = userMap.get(settlementData.paidToId);

            if (!paidBy || !paidTo) return null;
            return {
                ...settlementData,
                id: docSnap.id,
                date: (settlementData.date as Timestamp).toDate().toISOString(),
                paidBy,
                paidTo
            };
        }).filter((s): s is Settlement => s !== null);

    return settlements;
}

export async function getSettlementsByUserId(userId: string): Promise<Settlement[]> {
    const settlementsRef = collection(db, 'settlements');
    const memberQuery = query(settlementsRef, where('groupMemberIds', 'array-contains', userId)); 

    const memberSnapshot = await getDocs(memberQuery);
    
    const settlementMap = new Map<string, SettlementDocument>();
    memberSnapshot.docs.forEach(doc => settlementMap.set(doc.id, doc.data() as SettlementDocument));

    const allUserIds = new Set<string>();
    settlementMap.forEach(s => {
        allUserIds.add(s.paidById);
        allUserIds.add(s.paidToId);
    });

    const allUsers = await hydrateUsers(Array.from(allUserIds));
    const userMap = new Map(allUsers.map(u => [u.uid, u]));

    const settlements: Settlement[] = Array.from(settlementMap.entries()).map(([id, settlementData]) => {
        // Filter out settlements not directly involving the user
        if (settlementData.paidById !== userId && settlementData.paidToId !== userId) {
            return null;
        }
        
        const paidBy = userMap.get(settlementData.paidById);
        const paidTo = userMap.get(settlementData.paidToId);
        if (!paidBy || !paidTo) return null;

        return {
            ...settlementData,
            id: id,
            date: (settlementData.date as Timestamp).toDate().toISOString(),
            paidBy,
            paidTo,
        };
    }).filter((s): s is Settlement => s !== null);

    return settlements;
}

export async function getAllSettlements(): Promise<Settlement[]> {
    const settlementsCol = collection(db, 'settlements');
    const settlementSnapshot = await getDocs(settlementsCol);
    
    const allUserIds = new Set<string>();
    const settlementDocs = settlementSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SettlementDocument & {id: string}));
    settlementDocs.forEach(s => {
        allUserIds.add(s.paidById);
        allUserIds.add(s.paidToId);
    });

    const allUsers = await hydrateUsers(Array.from(allUserIds));
    const userMap = new Map(allUsers.map(u => [u.uid, u]));

    const settlements: Settlement[] = settlementDocs.map((settlementData) => {
            const paidBy = userMap.get(settlementData.paidById);
            const paidTo = userMap.get(settlementData.paidToId);
            if (!paidBy || !paidTo) return null;

            return {
                ...settlementData,
                id: settlementData.id,
                date: (settlementData.date as Timestamp).toDate().toISOString(),
                paidBy,
                paidTo,
            };
        }).filter((s): s is Settlement => s !== null);

    return settlements;
}

// --- Balance Calculation ---

export async function getGroupBalances(groupId: string): Promise<Balance[]> {
  const group = await getGroupById(groupId);
  if (!group) return [];
  const expenses = await getExpensesByGroupId(groupId);
  const settlements = await getSettlementsByGroupId(groupId);

  const memberBalances: Record<string, number> = {};
  group.members.forEach(member => memberBalances[member.uid] = 0);

  expenses.forEach(expense => {
    expense.payers.forEach(payer => {
        if(memberBalances[payer.user.uid] !== undefined) {
            memberBalances[payer.user.uid] += payer.amount;
        }
    });
    expense.participants.forEach(p => {
      if(memberBalances[p.user.uid] !== undefined) {
        memberBalances[p.user.uid] -= p.amountOwed;
      }
    });
  });

  settlements.forEach(settlement => {
     if(memberBalances[settlement.paidBy.uid] !== undefined) {
        memberBalances[settlement.paidBy.uid] += settlement.amount;
    }
    if(memberBalances[settlement.paidTo.uid] !== undefined) {
        memberBalances[settlement.paidTo.uid] -= settlement.amount;
    }
  });
  
  return group.members.map(member => {
    const netBalance = parseFloat((memberBalances[member.uid] || 0).toFixed(2));
    return {
      user: member,
      netBalance: netBalance,
    };
  });
}


export function simplifyDebts(balances: Balance[]): SimplifiedSettlement[] {
    const debtors = balances
        .filter(b => b.netBalance < 0)
        .map(b => ({ user: b.user, amount: Math.abs(b.netBalance) }));

    const creditors = balances
        .filter(b => b.netBalance > 0)
        .map(b => ({ user: b.user, amount: b.netBalance }));
    
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const settlements: SimplifiedSettlement[] = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];
        const amountToSettle = Math.min(debtor.amount, creditor.amount);

        if (amountToSettle > 0.01) { 
            settlements.push({
                from: debtor.user,
                to: creditor.user,
                amount: amountToSettle,
            });

            debtor.amount -= amountToSettle;
            creditor.amount -= amountToSettle;
        }

        if (debtor.amount < 0.01) i++;
        if (creditor.amount < 0.01) j++;
    }
    return settlements;
}

// --- History/Audit Log Functions ---
async function logHistoryEvent(groupId: string, eventType: string, actorId: string, description: string, data?: any) {
  try {
    const groupDocRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupDocRef);
    const groupMemberIds = groupSnap.exists() ? (groupSnap.data() as GroupDocument).memberIds : [];
    
    await addDoc(collection(db, 'history'), {
      groupId,
      eventType,
      actorId,
      description,
      data: data || null,
      timestamp: Timestamp.now(),
      restored: false,
      groupMemberIds: groupMemberIds,
    });
  } catch (error) {
    console.error("Failed to log history event:", error);
  }
}

export async function getHistoryByGroupId(groupId: string): Promise<HistoryEvent[]> {
  const user = auth.currentUser;
  if (!user) return [];
  
  const q = query(
    collection(db, 'history'), 
    where('groupId', '==', groupId), 
    where('groupMemberIds', 'array-contains', user.uid),
    orderBy('timestamp', 'desc')
  );
  const querySnapshot = await getDocs(q);

  const historyDocs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryEventDocument & { id: string }));
  
  const actorIds = [...new Set(historyDocs.map(h => h.actorId))];
  const actors = await hydrateUsers(actorIds);
  const actorMap = new Map(actors.map(u => [u.uid, u]));

  const historyEvents: HistoryEvent[] = historyDocs.map(doc => {
    const actor = actorMap.get(doc.actorId);
    if (!actor) return null; // Should not happen if data is clean
    return {
      ...doc,
      timestamp: (doc.timestamp as Timestamp).toDate().toISOString(),
      actor,
    };
  }).filter((h): h is HistoryEvent => h !== null);

  return historyEvents;
}

export async function getHistoryForExpense(expenseId: string, groupId: string): Promise<HistoryEvent[]> {
    const user = auth.currentUser;
    if (!user) return [];

    const q = query(
        collection(db, 'history'), 
        where('groupId', '==', groupId),
        where('groupMemberIds', 'array-contains', user.uid),
        where('data.expenseId', '==', expenseId),
        orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(q);

    const historyDocs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HistoryEventDocument & { id: string }));
    
    const actorIds = [...new Set(historyDocs.map(h => h.actorId))];
    const actors = await hydrateUsers(actorIds);
    const actorMap = new Map(actors.map(u => [u.uid, u]));

    const historyEvents: HistoryEvent[] = historyDocs.map(doc => {
        const actor = actorMap.get(doc.actorId);
        if (!actor) return null;
        return {
        ...doc,
        timestamp: (doc.timestamp as Timestamp).toDate().toISOString(),
        actor,
        };
    }).filter((h): h is HistoryEvent => h !== null);

    return historyEvents;
}


export async function restoreExpense(historyEventId: string, actorId: string): Promise<string | null> {
    const historyDocRef = doc(db, 'history', historyEventId);
    const historySnap = await getDoc(historyDocRef);
    
    if (!historySnap.exists()) {
        throw new Error("History event not found.");
    }
    
    const historyData = historySnap.data() as HistoryEventDocument;
    if (historyData.eventType !== 'expense_deleted' || !historyData.data) {
        throw new Error("This history event cannot be restored.");
    }
    
    const expenseToRestore = historyData.data;
    // Convert Firestore Timestamps back to JS Dates for addExpense function
    if (expenseToRestore.date && expenseToRestore.date instanceof Timestamp) {
        expenseToRestore.date = expenseToRestore.date.toDate();
    }
    
    // The data for a deleted expense is the full ExpenseDocument. We need to pass this to addExpense.
    const newExpenseId = await addExpense(expenseToRestore, actorId);

    if (newExpenseId) {
        await updateDoc(historyDocRef, { restored: true });
        
        const actor = await getUserProfile(actorId);
        const restoreDescription = `${getFullName(actor?.firstName, actor?.lastName)} restored expense "${expenseToRestore.description}" for ${CURRENCY_SYMBOL}${(expenseToRestore.amount || 0).toFixed(2)}.`;
        await logHistoryEvent(expenseToRestore.groupId, 'expense_restored', actorId, restoreDescription, { restoredFromHistoryId: historyEventId, newExpenseId });

        return newExpenseId;
    }
    
    return null;
}

export async function deleteHistoryEvent(historyEventId: string): Promise<void> {
    const historyDocRef = doc(db, 'history', historyEventId);
    await deleteDoc(historyDocRef);
}


// --- Site Settings ---
const SETTINGS_COLLECTION = 'settings';
const GENERAL_SETTINGS_DOC = 'general';

const DEFAULT_APP_NAME = 'SettleEase';
const FALLBACK_GROUP_COVER_IMAGES = [
    'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2029&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1604079628040-94301bb21b91?q=80&w=1974&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1579546929662-7112e7508432?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1511207538754-e8555f2bc187?q=80&w=1974&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?q=80&w=1974&auto=format&fit=crop',
];
const FALLBACK_LANDING_IMAGES = [
    'https://images.unsplash.com/photo-1518655048521-f130df041f66?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop',
];

const DEFAULT_LANDING_PAGE_SETTINGS = {
    headline: 'SettleEase',
    subheadline: 'The quantum leap in managing shared expenses. Track, split, and settle your group costs with futuristic ease.',
    ctaButtonText: 'Enter the Grid',
};

const DEFAULT_AUTH_PAGE_SETTINGS = {
    imageUrl: 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b?q=80&w=2070&auto=format&fit=crop',
    loginTitle: 'Welcome Back',
    loginSubtitle: 'Enter your credentials to access your account.',
    signupTitle: 'Create an Account',
    signupSubtitle: 'Join {appName} to simplify your group expenses.',
    forgotPasswordTitle: 'Forgot Password',
    forgotPasswordSubtitle: 'Enter your email to receive a reset link.',
    loginEmailPlaceholder: 'elon@x.com',
    loginPasswordPlaceholder: 'it\'s a secret...',
    signupFirstNamePlaceholder: 'Bartholomew',
    signupLastNamePlaceholder: 'Cubbins',
    signupUsernamePlaceholder: 'the_real_slim_shady',
    signupEmailPlaceholder: 'also.elon@x.com',
    signupPasswordPlaceholder: 'at_least_6_characters',
}

const DEFAULT_ABOUT_SETTINGS = {
    title: 'About SettleEase',
    subtitle: 'Simplifying shared expenses for everyone, everywhere.',
    mainContent: 'Welcome to SettleEase, the ultimate solution for managing group expenses without the hassle. Born from the common frustration of tracking who paid for what during trips, shared housing, and group events, SettleEase was designed to be intuitive, powerful, and transparent.',
    team: [
        {
            id: 'tm-1',
            name: 'Yashraj Jangra',
            title: 'Full-Stack Developer & Project Lead',
            bio: 'Yashraj is a passionate developer who built SettleEase to solve a real-world problem. He specializes in creating modern, user-friendly web applications with a focus on clean code and great user experience.',
            avatarUrl: 'https://github.com/Yashraj-Jangra.png',
            githubUrl: 'https://github.com/Yashraj-Jangra',
            linkedinUrl: 'https://www.linkedin.com/in/yashraj-jangra-24016a213/',
            portfolioUrl: 'https://yashraj-jangra.netlify.app/',
        }
    ]
};

const DEFAULT_PRIVACY_POLICY: PolicyPage = {
    title: 'Privacy Policy',
    sections: [
        { id: 'pp_intro', title: '1. Introduction', content: 'Welcome to SettleEase ("we", "our", "us"). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.' },
        { id: 'pp_collect', title: '2. Information We Collect', content: 'We may collect information about you in a variety of ways. The information we may collect on the Site includes: Personally identifiable information, such as your name, shipping address, email address, and telephone number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us when you register with the Application.'},
        { id: 'pp_use', title: '3. Use of Your Information', content: 'Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Application to: Create and manage your account, Email you regarding your account or order, Enable user-to-user communications, and Manage purchases, orders, payments, and other transactions related to the Application.'},
        { id: 'pp_security', title: '4. Security of Your Information', content: 'We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.'},
        { id: 'pp_contact', title: '5. Contact Us', content: 'If you have questions or comments about this Privacy Policy, please contact us at: [email protected]'},
    ]
};

const DEFAULT_TERMS_AND_CONDITIONS: PolicyPage = {
    title: 'Terms of Service',
    sections: [
        { id: 'tc_acceptance', title: '1. Acceptance of Terms', content: 'By accessing or using the SettleEase application ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, then you may not access the Service.' },
        { id: 'tc_accounts', title: '2. User Accounts', content: 'When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.' },
        { id: 'tc_conduct', title: '3. User Conduct', content: 'You agree not to use the Service to: Violate any local, state, national, or international law; Transmit any material that is abusive, harassing, tortious, defamatory, vulgar, pornographic, obscene, libelous, invasive of another\'s privacy, hateful, or racially, ethnically, or otherwise objectionable; Impersonate any person or entity, or falsely state or otherwise misrepresent your affiliation with a person or entity.' },
        { id: 'tc_liability', title: '4. Limitation of Liability', content: 'In no event shall SettleEase, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.' },
        { id: 'tc_law', title: '5. Governing Law', content: 'These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which the company is based, without regard to its conflict of law provisions.' },
    ]
};


export async function getSiteSettings(): Promise<SiteSettings> {
    const docRef = doc(db, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        
        const privacyPolicy = data.privacyPolicy && Array.isArray(data.privacyPolicy.sections)
            ? data.privacyPolicy
            : DEFAULT_PRIVACY_POLICY;
            
        const termsAndConditions = data.termsAndConditions && Array.isArray(data.termsAndConditions.sections)
            ? data.termsAndConditions
            : DEFAULT_TERMS_AND_CONDITIONS;
        
        const about = {
            ...DEFAULT_ABOUT_SETTINGS,
            ...(data.about || {}),
        };
        if (!about.team || !Array.isArray(about.team) || about.team.length === 0) {
            about.team = DEFAULT_ABOUT_SETTINGS.team;
        }

        return {
            appName: data.appName || DEFAULT_APP_NAME,
            logoUrl: data.logoUrl || '',
            coverImages: data.coverImages?.length > 0 ? data.coverImages : FALLBACK_GROUP_COVER_IMAGES,
            landingImages: data.landingImages?.length > 0 ? data.landingImages : FALLBACK_LANDING_IMAGES,
            landingPage: { ...DEFAULT_LANDING_PAGE_SETTINGS, ...(data.landingPage || {}) },
            authPage: { ...DEFAULT_AUTH_PAGE_SETTINGS, ...(data.authPage || {}) },
            about,
            privacyPolicy,
            termsAndConditions,
            stats: data.stats || { users: 0, groups: 0, expenses: 0 },
        };
    } else {
        const defaultSettings = {
            appName: DEFAULT_APP_NAME,
            logoUrl: '',
            coverImages: FALLBACK_GROUP_COVER_IMAGES,
            landingImages: FALLBACK_LANDING_IMAGES,
            landingPage: DEFAULT_LANDING_PAGE_SETTINGS,
            authPage: DEFAULT_AUTH_PAGE_SETTINGS,
            about: DEFAULT_ABOUT_SETTINGS,
            privacyPolicy: DEFAULT_PRIVACY_POLICY,
            termsAndConditions: DEFAULT_TERMS_AND_CONDITIONS,
            stats: { users: 0, groups: 0, expenses: 0 },
        };
        await setDoc(docRef, defaultSettings);
        return defaultSettings;
    }
}

export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<void> {
    const docRef = doc(db, SETTINGS_COLLECTION, GENERAL_SETTINGS_DOC);
    const cleanSettings = Object.fromEntries(Object.entries(settings).filter(([_, v]) => v !== undefined));
    await setDoc(docRef, cleanSettings, { merge: true });
}

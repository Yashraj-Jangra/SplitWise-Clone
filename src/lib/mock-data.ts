
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
} from 'firebase/firestore';
import { db } from './firebase';
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
} from '@/types';
import { getFullName } from './utils';
import { CURRENCY_SYMBOL } from './constants';

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

export async function createGroup(groupData: Omit<GroupDocument, 'createdAt' | 'totalExpenses'>): Promise<string> {
    const docRef = await addDoc(collection(db, 'groups'), {
        ...groupData,
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
    return groups.filter((g): g is Group => g !== null);
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

export async function addMembersToGroup(groupId: string, memberIds: string[]): Promise<void> {
    const groupDocRef = doc(db, 'groups', groupId);
    await updateDoc(groupDocRef, {
        memberIds: arrayUnion(...memberIds)
    });
}


// --- Expense Functions ---

export async function addExpense(expenseData: Omit<ExpenseDocument, 'date' | 'participantIds'> & { date: Date }, actorId: string): Promise<string> {
    const participantIds = expenseData.participants.map(p => p.userId);
    const docRef = await addDoc(collection(db, 'expenses'), {
        ...expenseData,
        participantIds,
        date: Timestamp.fromDate(expenseData.date),
    });

    const groupDocRef = doc(db, 'groups', expenseData.groupId);
    const groupSnap = await getDoc(groupDocRef);
    if(groupSnap.exists()){
        const currentTotal = groupSnap.data().totalExpenses || 0;
        await updateDoc(groupDocRef, {
            totalExpenses: currentTotal + expenseData.amount
        });
    }
    
    const actor = await getUserProfile(actorId);
    const actorName = getFullName(actor?.firstName, actor?.lastName);
    const description = `${actorName} added expense "${expenseData.description}" for ${CURRENCY_SYMBOL}${expenseData.amount.toFixed(2)}.`;
    await logHistoryEvent(expenseData.groupId, 'expense_created', actorId, description, { expenseId: docRef.id });


    return docRef.id;
}


export async function updateExpense(expenseId: string, oldAmount: number, expenseData: Omit<ExpenseDocument, 'date' | 'participantIds'> & { date: Date }, actorId: string): Promise<void> {
    const expenseDocRef = doc(db, 'expenses', expenseId);
    const expenseSnap = await getDoc(expenseDocRef);
    const oldData = expenseSnap.exists() ? expenseSnap.data() : null;

    const participantIds = expenseData.participants.map(p => p.userId);
    await updateDoc(expenseDocRef, {
        ...expenseData,
        participantIds,
        date: Timestamp.fromDate(expenseData.date)
    });

    const groupDocRef = doc(db, 'groups', expenseData.groupId);
    const groupSnap = await getDoc(groupDocRef);
    if(groupSnap.exists()){
        const currentTotal = groupSnap.data().totalExpenses || 0;
        const newTotal = currentTotal - oldAmount + expenseData.amount;
        await updateDoc(groupDocRef, {
            totalExpenses: newTotal
        });
    }

    const actor = await getUserProfile(actorId);
    const actorName = getFullName(actor?.firstName, actor?.lastName);
    const description = `${actorName} updated expense "${expenseData.description}" (amount from ${CURRENCY_SYMBOL}${oldAmount.toFixed(2)} to ${CURRENCY_SYMBOL}${expenseData.amount.toFixed(2)}).`;
    await logHistoryEvent(expenseData.groupId, 'expense_updated', actorId, description, { expenseId, before: oldData, after: expenseData });

}

export async function deleteExpense(expenseId: string, groupId: string, amount: number, actorId: string): Promise<void> {
    const expenseDocRef = doc(db, 'expenses', expenseId);
    const groupDocRef = doc(db, 'groups', groupId);
    const expenseSnap = await getDoc(expenseDocRef);

    if (!expenseSnap.exists()) return;
    const deletedExpenseData = expenseSnap.data();

    const batch = writeBatch(db);

    if (groupDocRef) {
        const groupSnap = await getDoc(groupDocRef);
        if (groupSnap.exists()) {
            const currentTotal = groupSnap.data().totalExpenses || 0;
            const newTotal = currentTotal - amount;
            batch.update(groupDocRef, { totalExpenses: newTotal < 0 ? 0 : newTotal });
        }
    }

    batch.delete(expenseDocRef);

    await batch.commit();

    const actor = await getUserProfile(actorId);
    const actorName = getFullName(actor?.firstName, actor?.lastName);
    const description = `${actorName} deleted expense "${deletedExpenseData.description}" (was ${CURRENCY_SYMBOL}${amount.toFixed(2)}).`;
    await logHistoryEvent(groupId, 'expense_deleted', actorId, { ...deletedExpenseData, expenseId: expenseId });
}


export async function getExpensesByGroupId(groupId: string): Promise<Expense[]> {
    const q = query(collection(db, 'expenses'), where('groupId', '==', groupId));
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
            
            if (payers.length === 0) return null;

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
  const memberQuery = query(expensesRef, where('participantIds', 'array-contains', userId)); 
  
  const memberSnapshot = await getDocs(memberQuery);
  
  const expenseMap = new Map<string, ExpenseDocument>();
  memberSnapshot.docs.forEach(doc => expenseMap.set(doc.id, doc.data() as ExpenseDocument));

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
        
        if (payers.length === 0) return null;
        
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

      if (payers.length === 0) return null;

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

export async function addSettlement(settlementData: Omit<SettlementDocument, 'date'> & { date: Date }): Promise<string> {
    const docRef = await addDoc(collection(db, 'settlements'), {
        ...settlementData,
        date: Timestamp.fromDate(settlementData.date),
    });
    return docRef.id;
}


export async function getSettlementsByGroupId(groupId: string): Promise<Settlement[]> {
    const q = query(collection(db, 'settlements'), where('groupId', '==', groupId));
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
    const paidByQuery = query(collection(db, 'settlements'), where('paidById', '==', userId));
    const paidToQuery = query(collection(db, 'settlements'), where('paidToId', '==', userId));

    const [paidBySnapshot, paidToSnapshot] = await Promise.all([
        getDocs(paidByQuery),
        getDocs(paidToQuery)
    ]);

    const settlementMap = new Map<string, SettlementDocument>();
    paidBySnapshot.docs.forEach(doc => settlementMap.set(doc.id, doc.data() as SettlementDocument));
    paidToSnapshot.docs.forEach(doc => settlementMap.set(doc.id, doc.data() as SettlementDocument));

    const allUserIds = new Set<string>();
    settlementMap.forEach(s => {
        allUserIds.add(s.paidById);
        allUserIds.add(s.paidToId);
    });

    const allUsers = await hydrateUsers(Array.from(allUserIds));
    const userMap = new Map(allUsers.map(u => [u.uid, u]));

    const settlements: Settlement[] = Array.from(settlementMap.entries()).map(([id, settlementData]) => {
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

export interface SimplifiedSettlement {
  from: UserProfile;
  to: UserProfile;
  amount: number;
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
    await addDoc(collection(db, 'history'), {
      groupId,
      eventType,
      actorId,
      description,
      data: data || null,
      timestamp: Timestamp.now(),
      restored: false,
    });
  } catch (error) {
    console.error("Failed to log history event:", error);
  }
}

export async function getHistoryByGroupId(groupId: string): Promise<HistoryEvent[]> {
  const q = query(collection(db, 'history'), where('groupId', '==', groupId), orderBy('timestamp', 'desc'));
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

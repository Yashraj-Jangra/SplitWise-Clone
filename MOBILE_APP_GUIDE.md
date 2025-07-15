# SettleEase Mobile App Development Guide

This document serves as a technical guide for creating a native mobile application (iOS, Android, Flutter, React Native, etc.) that uses the same Firebase backend as the SettleEase web application.

## 1. Firebase Project Integration

The existing Firebase project contains all the necessary backend services (Authentication, Firestore Database, Security Rules). To connect your mobile app, you must register it with this project.

**Steps:**

1.  **Open the Firebase Console:** Navigate to your SettleEase project.
2.  **Add a New App:** In the Project Overview, click "Add app" and select the appropriate platform (iOS or Android).
3.  **Follow Setup Instructions:**
    *   **iOS:** Provide your app's bundle ID. Download the `GoogleService-Info.plist` file and add it to your Xcode project.
    *   **Android:** Provide your app's package name. Download the `google-services.json` file and place it in your Android project's `app` directory.
4.  **Add Firebase SDKs:** Follow the console instructions to add the necessary Firebase SDKs to your mobile project's dependencies (e.g., via Cocoapods, Swift Package Manager, or Gradle). You will primarily need:
    *   `FirebaseAuth`
    *   `FirebaseFirestore`

## 2. Authentication

The web app uses Firebase Authentication for user management. Your mobile app will use the native Firebase Auth SDKs to interact with the same user pool.

### Core Flows:

*   **Sign Up:** Use `createUserWithEmailAndPassword` from the Firebase Auth SDK. After a successful authentication call, you **must** create a corresponding user document in the `users` collection in Firestore.
*   **Login:** Use `signInWithEmailAndPassword` or the Google Sign-In flow (`signInWithCredential` after getting a token from the native Google Sign-In SDK).
*   **Session Management:** The Firebase Auth SDK handles session persistence automatically. You should set up an auth state listener (`onAuthStateChanged`) to respond to login/logout events and navigate the user accordingly.

### User Profile Document (`/users/{userId}`)

Upon successful sign-up, create a document in the `/users` collection with the `userId` from Firebase Auth as the document ID.

**Schema:**

```json
{
  "uid": "string",
  "firstName": "string",
  "lastName": "string",
  "username": "string",
  "email": "string",
  "role": "user' | 'admin'",
  "avatarUrl": "string" // (optional)
  "createdAt": "Timestamp"
}
```

**Important:** The logic in `src/contexts/auth-context.tsx` is the reference implementation for how user profiles are created and managed after authentication events.

## 3. Firestore Database & Data Model

Your mobile app will interact directly with the Firestore database. The native Firestore SDKs provide real-time data synchronization with `onSnapshot` listeners, which is highly recommended for a responsive mobile experience.

### Key Collections:

#### `/groups/{groupId}`
Stores information about each expense-sharing group.
*   **`name`**: `string` - The group's name.
*   **`description`**: `string` - A brief description.
*   **`memberIds`**: `string[]` - An array of user UIDs who are part of the group. **This is crucial for security rules.**
*   **`createdById`**: `string` - The UID of the user who created the group.
*   **`totalExpenses`**: `number` - A running total of all expense amounts in the group.
*   **`createdAt`**: `Timestamp`

#### `/expenses/{expenseId}`
Stores individual expense records.
*   **`groupId`**: `string` - The ID of the group this expense belongs to.
*   **`description`**: `string`
*   **`amount`**: `number` - The total amount of the expense.
*   **`date`**: `Timestamp`
*   **`category`**: `string`
*   **`splitType`**: `"equally" | "unequally" | ...`
*   **`payers`**: `object[]` - An array of objects: `{ userId: string, amount: number }`.
*   **`participants`**: `object[]` - An array of objects: `{ userId: string, amountOwed: number }`.
*   **`groupMemberIds`**: `string[]` - A copy of the group's `memberIds` at the time of creation. Used for security rules.

#### `/settlements/{settlementId}`
Stores payment records between users to settle debts.
*   **`groupId`**: `string`
*   **`paidById`**: `string` - UID of the user who paid.
*   **`paidToId`**: `string` - UID of the user who received money.
*   **`amount`**: `number`
*   **`date`**: `Timestamp`
*   **`groupMemberIds`**: `string[]` - For security rules.

#### `/history/{historyId}`
An audit trail of all actions performed within a group.
*   **`groupId`**: `string`
*   **`eventType`**: `string` (e.g., `expense_created`, `member_added`).
*   **`actorId`**: `string` - The UID of the user who performed the action.
*   **`description`**: `string` - A human-readable log of the event.
*   **`data`**: `object` - Optional data payload (e.g., details of a deleted item for restoration).
*   **`timestamp`**: `Timestamp`

## 4. Core Business Logic to Replicate

The web app contains client-side logic that you will need to replicate in your mobile app. The source of truth for this logic is the `src/lib/mock-data.ts` file.

### Key Functions to Re-implement:

*   **`getGroupBalances(groupId)`**: This function calculates the net balance for each member in a group.
    1.  Fetch all expenses and settlements for the given `groupId`.
    2.  Initialize a balance map for all members to `0`.
    3.  Iterate through expenses:
        *   Add `payer.amount` to the payer's balance.
        *   Subtract `participant.amountOwed` from each participant's balance.
    4.  Iterate through settlements:
        *   Add `settlement.amount` to the payer's balance.
        *   Subtract `settlement.amount` from the recipient's balance.
    5.  Return an array of `{ user, netBalance }`.

*   **`simplifyDebts(balances)`**: This function takes the output from `getGroupBalances` and calculates the minimum number of transactions required to settle all debts.
    1.  Separate users into two arrays: `debtors` (negative balance) and `creditors` (positive balance).
    2.  Use a greedy algorithm to match the largest debtor with the largest creditor, creating a settlement for the minimum of their two amounts.
    3.  Adjust their balances and repeat until all balances are zero.
    4.  The implementation in `src/lib/mock-data.ts` is a direct reference.

## 5. UI/UX Considerations

*   **Real-time Updates:** Use Firestore's `onSnapshot` listeners to update the UI in real-time as data changes in the backend. This is crucial for a modern, collaborative app.
*   **Offline Support:** Enable Firestore's offline persistence. This is a simple flag in the SDK configuration and dramatically improves the user experience by caching data and syncing changes when the network returns.
*   **Data Hydration:** The web app "hydrates" documents by fetching related user profiles to display names and avatars. Your mobile app will need to do the same. It is efficient to fetch all required user profiles for a screen in a single batched request. The `hydrateUsers` function in `mock-data.ts` shows how this is done.

# Firebase → Self-Hosted Migration Plan (Final)

## Confirmed Choices

| Decision | Choice |
|---|---|
| **Auth** | Better Auth + Google OAuth (own Google Cloud Client ID/Secret) |
| **Database** | PostgreSQL 16 + Prisma ORM |
| **File Storage** | MinIO (S3-compatible, self-hosted) — all images currently URLs, no existing uploads to migrate |
| **Push Notifications** | VAPID Web Push with SSE for real-time in-app + background push |
| **Email** | SMTP (your server) via Nodemailer — no change to email logic |
| **Branch** | `dev` |
| **Downtime** | Short downtime acceptable for cutover |
| **Password migration** | Users reset passwords on first login (all data preserved) |
| **VPS** | Ubuntu Linux, 8GB RAM, 2-core ARM64 |

---

## Complete Firebase Dependency Map

Every file that imports Firebase and what replaces it:

| File | Firebase Import | Replacement |
|---|---|---|
| `src/lib/firebase.ts` | Firebase App, Auth, Firestore, Storage init | **DELETE** — replaced by `src/lib/db.ts` + `src/lib/auth.server.ts` |
| `src/lib/firebase-admin.ts` | firebase-admin SDK, getSiteSettingsAdmin | **DELETE** — replaced by `src/lib/db.ts` (Prisma) + `src/lib/settings.service.ts` |
| `src/lib/firestore.service.ts` | All Firestore CRUD | **DELETE** — replaced by `src/lib/services/*.service.ts` |
| `src/lib/push-service.ts` | FCM messaging, Firestore push_subscriptions | **DELETE** — replaced by `src/lib/vapid-push.ts` |
| `src/lib/notification-service.ts` | `getAuth(app)` for ID token in fetch call | Rewrite to use Better Auth session token |
| `src/lib/mock-data.ts` | Re-exports firestore.service.ts | **DELETE** |
| `src/lib/auth.ts` | Deprecated stub | **DELETE** |
| `src/lib/storage.ts` | Deprecated stub | **DELETE** — replaced by `src/lib/minio.ts` |
| `src/contexts/auth-context.tsx` | All firebase/auth imports, FirebaseUser | Rewrite using Better Auth client |
| `src/contexts/notification-context.tsx` | Firestore `onSnapshot`, Firestore CRUD | Rewrite using SSE stream + REST API |
| `src/types/index.ts` | `import { Timestamp } from 'firebase/firestore'` | Remove — use `Date` / ISO strings |
| `src/app/api/auth/session/route.ts` | Firebase `verifyIdToken` | Better Auth `auth.api.getSession()` |
| `src/app/api/set-admin-claim/route.ts` | `firebaseAdmin.auth()` verify + claims | Better Auth session + Prisma role update |
| `src/app/api/user/delete-account/route.ts` | `firebaseAdmin.auth().deleteUser()` + Firestore | Better Auth account deletion + Prisma cascade |
| `src/app/api/notifications/send/route.ts` | `firebaseAdmin.firestore()` + `firebaseAdmin.messaging()` | Prisma + `web-push` npm package |
| `src/app/api/send-password-reset/route.ts` | `getAuth().generatePasswordResetLink()` + Firestore | Better Auth password reset flow + Prisma |
| `src/app/api/send-test-email/route.ts` | `firebaseAdmin.auth().getUser()` | Prisma user lookup |
| `src/app/api/admin/broadcast-email/route.ts` | `firebaseAdmin.auth().listUsers()` | Prisma `user.findMany()` |
| `src/app/api/admin/data-updater/route.ts` | Firestore batch + `firebaseAdmin.auth()` | Prisma transaction |
| `src/app/api/admin/notify-new-ticket/route.ts` | `firebaseAdmin.firestore()` + `Timestamp` | Prisma |
| `src/app/api/admin/notify-ticket-reply/route.ts` | Firebase admin | Prisma |
| `src/app/api/public/settings/route.ts` | `getSiteSettingsAdmin()` (Firestore) | Prisma settings service |
| `src/hooks/queries/use-expenses.ts` | `@/lib/firestore.service` imports | `@/lib/services/expense.service` |
| `src/hooks/queries/use-groups.ts` | `@/lib/firestore.service` imports | `@/lib/services/group.service` |
| `src/hooks/queries/use-balances.ts` | `@/lib/firestore.service` imports | `@/lib/services/balance.service` |
| `src/hooks/queries/use-settings.ts` | `@/lib/firestore.service` imports | `@/lib/services/settings.service` |
| `src/middleware.ts` | Cookie name `__session` (Firebase convention) | Keep `__session` cookie name — Better Auth compatible |
| `src/firebase/error-emitter.ts` | Firebase error types | Keep — rename to `src/lib/error-emitter.ts` |
| `src/firebase/errors.ts` | `FirestorePermissionError` | Rename to `src/lib/db-errors.ts`, generalize |
| `public/firebase-messaging-sw.js` | Firebase Messaging service worker | Replace with VAPID push SW |
| `firebase.json` | Firebase project config | **DELETE** |
| `firestore.indexes.json` | Firestore composite indexes | **DELETE** |
| `firestore.rules` | Firestore security rules | **DELETE** |
| `storage.rules` | Firebase Storage security | **DELETE** |
| `apphosting.yaml` | Firebase App Hosting | **DELETE** |
| `service-account.json` | Firebase service account key | **DELETE** |

---

## Phase 0 — Create `dev` Branch & Initial Setup

```bash
git checkout -b dev
```

Install new packages, remove Firebase packages.

### Packages to Remove
```
firebase  firebase-admin  @firebase/auth
```

### Packages to Add
```
better-auth
@prisma/client
prisma (dev)
@aws-sdk/client-s3
@aws-sdk/lib-storage
web-push
@types/web-push (dev)
```

### [MODIFY] [package.json](file:///d:/Projects/SplitWise-Clone/package.json)
- Remove: `firebase`, `firebase-admin`, `@firebase/auth`
- Add the above new packages

---

## Phase 1 — Infrastructure: Docker Compose

### [MODIFY] [docker-compose.yml](file:///d:/Projects/SplitWise-Clone/docker-compose.yml)
Replace all Firebase build args with new services:

```yaml
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
        - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
    ports:
      - "3235:3231"   # Map unique host port 3235 to container port 3231
    volumes:
      - ./.env:/app/.env
    environment:
      - PORT=3231
      - NODE_ENV=production
    depends_on:
      - postgres
      - minio
    restart: always

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: splitwise
      POSTGRES_USER: splitwise
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "${TAILSCALE_IP}:5439:5432"   # Map unique host port 5439 strictly to VPS Tailscale IP
    restart: always

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    ports:
      - "${TAILSCALE_IP}:9099:9001"   # Map unique host port 9099 strictly to VPS Tailscale IP
      # MinIO API port (9000) is NOT exposed to any external interface. Next.js acts as an internal proxy.
    restart: always

volumes:
  postgres_data:
  minio_data:
```

### [MODIFY] [Dockerfile](file:///d:/Projects/SplitWise-Clone/Dockerfile)
- Remove all `NEXT_PUBLIC_FIREBASE_*` ARG/ENV lines
- Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_APP_URL` as build-time ARGs
- Add `prisma generate` after `npm ci` in builder stage
- Add startup script that runs `prisma migrate deploy` then `npm start`

---

## Phase 2 — Environment Variables

### [MODIFY] `.env`

**REMOVE all of these:**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
FIREBASE_SERVICE_ACCOUNT_B64=
FIREBASE_SERVICE_ACCOUNT=
```

**ADD all of these:**
```env
# Database
DATABASE_URL=postgresql://splitwise:yourpassword@localhost:5432/splitwise
# (Docker: postgresql://splitwise:yourpassword@postgres:5432/splitwise)

# Better Auth
BETTER_AUTH_SECRET=your_64_char_random_secret_here
BETTER_AUTH_URL=http://localhost:3231

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# MinIO / Object Storage
MINIO_ENDPOINT=http://minio:9000 # Internal Docker network URL
MINIO_ACCESS_KEY=your_minio_access_key
MINIO_SECRET_KEY=your_minio_secret_key
MINIO_BUCKET=splitwise

# VAPID Web Push (generate with: npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:admin@yourdomain.com

# PostgreSQL & MinIO bind configuration
TAILSCALE_IP=100.x.y.z           # Your VPS Tailscale IP
POSTGRES_PASSWORD=yourpassword
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=yourminiopassword

# App (already exists, keep)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
ADMIN_EMAIL=your_admin_email@domain.com
```

---

## Phase 3 — Prisma Schema & Database

### [NEW] `prisma/schema.prisma`

Complete schema mapping all Firestore collections to relational tables:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── AUTH (Better Auth managed tables) ──────────────────
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  role          String    @default("user")  // "admin" | "user"

  // Profile fields (merged from Firestore `users` collection)
  firstName     String?
  lastName      String?
  username      String?   @unique
  avatarUrl     String?
  countryCode   String?
  mobileNumber  String?
  dob           DateTime?

  // Relations
  sessions        Session[]
  accounts        Account[]
  verifications   Verification[]
  groupsCreated   Group[]        @relation("GroupCreator")
  groupMemberships GroupMember[]
  expensesCreated  Expense[]     @relation("ExpenseCreator")
  expensePayers    ExpensePayer[]
  expenseParticipants ExpenseParticipant[]
  settlementsPaid  Settlement[]  @relation("SettlementPaidBy")
  settlementsReceived Settlement[] @relation("SettlementPaidTo")
  historyEvents    HistoryEvent[]
  tickets          SupportTicket[]
  ticketMessages   TicketMessage[]
  notificationPrefs UserNotificationPrefs?
  pushSubscriptions PushSubscription[]
  notificationsCreated Notification[]    @relation("NotificationCreator")
  notificationReads NotificationRead[]
}

model Session {
  id        String   @id
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Account {
  id                    String    @id @default(cuid())
  userId                String
  accountId             String
  providerId            String
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([providerId, accountId])
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  user       User?    @relation(fields: [identifier], references: [email])
}

// ── GROUPS ─────────────────────────────────────────────
model Group {
  id            String    @id @default(cuid())
  name          String
  description   String?
  coverImageUrl String?
  currency      String?
  totalExpenses Float     @default(0)
  createdById   String
  archivedAt    DateTime?
  createdAt     DateTime  @default(now())

  createdBy    User          @relation("GroupCreator", fields: [createdById], references: [id])
  members      GroupMember[]
  expenses     Expense[]
  settlements  Settlement[]
  historyEvents HistoryEvent[]
}

model GroupMember {
  groupId   String
  userId    String
  joinedAt  DateTime @default(now())
  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([groupId, userId])
}

// ── EXPENSES ───────────────────────────────────────────
model Expense {
  id               String    @id @default(cuid())
  groupId          String
  description      String
  amount           Float
  splitType        String    // "equally"|"unequally"|"by_shares"|"by_percentage"
  category         String?
  masterCategory   String?
  notes            String?
  receiptImageUrl  String?
  expenseCreatorId String
  groupCreatorId   String
  date             DateTime
  createdAt        DateTime  @default(now())

  group           Group               @relation(fields: [groupId], references: [id], onDelete: Cascade)
  expenseCreator  User                @relation("ExpenseCreator", fields: [expenseCreatorId], references: [id])
  payers          ExpensePayer[]
  participants    ExpenseParticipant[]
  historyEvents   HistoryEvent[]      @relation("ExpenseHistory")
}

model ExpensePayer {
  id        String  @id @default(cuid())
  expenseId String
  userId    String
  amount    Float
  expense   Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id])
  @@unique([expenseId, userId])
}

model ExpenseParticipant {
  id          String  @id @default(cuid())
  expenseId   String
  userId      String
  amountOwed  Float
  share       Float?
  expense     Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user        User    @relation(fields: [userId], references: [id])
  @@unique([expenseId, userId])
}

// ── SETTLEMENTS ────────────────────────────────────────
model Settlement {
  id        String   @id @default(cuid())
  groupId   String
  paidById  String
  paidToId  String
  amount    Float
  date      DateTime
  notes     String?
  createdAt DateTime @default(now())

  group   Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  paidBy  User  @relation("SettlementPaidBy", fields: [paidById], references: [id])
  paidTo  User  @relation("SettlementPaidTo", fields: [paidToId], references: [id])
}

// ── HISTORY / AUDIT LOG ────────────────────────────────
model HistoryEvent {
  id          String   @id @default(cuid())
  groupId     String
  eventType   String
  actorId     String
  description String
  data        Json?
  restored    Boolean  @default(false)
  expenseId   String?
  timestamp   DateTime @default(now())

  group   Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  actor   User     @relation(fields: [actorId], references: [id])
  expense Expense? @relation("ExpenseHistory", fields: [expenseId], references: [id], onDelete: SetNull)
}

// ── SETTINGS ───────────────────────────────────────────
model Settings {
  id      String @id @default("general")  // Single-row table
  data    Json   // Stores the full SiteSettings object as JSONB
  updatedAt DateTime @updatedAt
}

// ── SUPPORT TICKETS ────────────────────────────────────
model SupportTicket {
  id         String   @id @default(cuid())
  userId     String
  userName   String
  userEmail  String
  subject    String
  category   String
  status     String   @default("open")
  assignedToId String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user       User            @relation(fields: [userId], references: [id])
  messages   TicketMessage[]
}

model TicketMessage {
  id       String   @id @default(cuid())
  ticketId String
  sentById String
  message  String
  sentAt   DateTime @default(now())
  ticket   SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  sentBy   User          @relation(fields: [sentById], references: [id])
}

// ── NOTIFICATIONS ──────────────────────────────────────
model Notification {
  id            String   @id @default(cuid())
  type          String
  title         String
  body          String
  actorId       String?
  groupId       String?
  expenseId     String?
  settlementId  String?
  target        String   @default("specific_users")
  channels      String[] // ["in_app", "push", "email"]
  imageUrl      String?
  createdAt     DateTime @default(now())
  createdBy     String?

  actor     User?              @relation("NotificationCreator", fields: [actorId], references: [id])
  recipients NotificationRecipient[]
  reads      NotificationRead[]
}

// Recipients join table (replaces Firestore `recipientIds` array)
model NotificationRecipient {
  notificationId String
  userId         String
  notification   Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)
  @@id([notificationId, userId])
}

// Replaces Firestore `readBy` array
model NotificationRead {
  notificationId String
  userId         String
  readAt         DateTime @default(now())
  notification   Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([notificationId, userId])
}

// ── PUSH SUBSCRIPTIONS ─────────────────────────────────
// Stores VAPID PushSubscription objects (replaces FCM tokens)
model PushSubscription {
  id           String   @id @default(cuid())
  userId       String
  deviceId     String   @unique  // localStorage-persisted UUID
  endpoint     String   @unique  // Browser push endpoint URL
  p256dh       String            // Public key for encryption
  auth         String            // Auth secret
  deviceName   String?
  createdAt    DateTime @default(now())
  lastSeen     DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ── USER NOTIFICATION PREFS ────────────────────────────
model UserNotificationPrefs {
  userId       String  @id
  inAppEnabled Boolean @default(true)
  pushEnabled  Boolean @default(true)
  emailEnabled Boolean @default(true)
  events       Json    // Record<NotificationEventType, {inApp, push, email}>
  updatedAt    DateTime @updatedAt
  user         User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## Phase 4 — Auth: Better Auth Setup

### [NEW] `src/lib/auth.server.ts`
Server-side Better Auth instance:
```typescript
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './db';

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      // Use your SMTP/nodemailer here
      await sendPasswordResetEmail(user.email, user.name, url);
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    cookieName: '__session',   // matches existing middleware!
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'user' },
      firstName: { type: 'string', required: false },
      lastName: { type: 'string', required: false },
      username: { type: 'string', required: false },
      avatarUrl: { type: 'string', required: false },
    },
  },
});
```

### [NEW] `src/lib/auth.client.ts`
Client-side Better Auth instance:
```typescript
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

### [NEW] `src/app/api/auth/[...all]/route.ts`
Better Auth catch-all route (replaces the session management routes):
```typescript
import { auth } from '@/lib/auth.server';
import { toNextJsHandler } from 'better-auth/next-js';
export const { GET, POST } = toNextJsHandler(auth);
```

### [MODIFY] [middleware.ts](file:///d:/Projects/SplitWise-Clone/src/middleware.ts)
No change needed — Better Auth uses `__session` cookie by default, matching the existing check.

### [MODIFY] [auth-context.tsx](file:///d:/Projects/SplitWise-Clone/src/contexts/auth-context.tsx)
Complete rewrite:
- Remove all `firebase/auth` imports
- Use `useSession()` from `auth.client.ts` for current user state
- Replace `onAuthStateChanged` → `useSession()` which is reactive
- Replace `signInWithEmailAndPassword` → `authClient.signIn.email()`
- Replace `createUserWithEmailAndPassword` → `authClient.signUp.email()` with additional profile fields
- Replace `signInWithPopup(GoogleAuthProvider)` → `authClient.signIn.social({ provider: 'google' })`
- Replace `signOut(auth)` → `authClient.signOut()`
- Replace `sendPasswordResetEmail` → `authClient.forgetPassword()`
- Replace `deleteUser` → call `DELETE /api/user/delete-account`
- `isAdmin` — derived from `session.user.role === 'admin'`
- `hasPassword` — derived from accounts list (Better Auth exposes linked providers)
- `isGoogleLinked` — derived from accounts list
- Remove `FirebaseUser` type → use Better Auth `User` type
- Remove Firebase error handling UI at bottom (replace with generic config error)

---

## Phase 5 — Database Service Layer

### [NEW] `src/lib/db.ts`
Prisma client singleton (matches current Firebase Admin proxy pattern):
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### [NEW] `src/lib/services/user.service.ts`
Replaces user functions from `firestore.service.ts`:
- `getUserProfile(uid)` → `prisma.user.findUnique({ where: { id: uid } })`
- `getAllUsers()` → `prisma.user.findMany()`
- `getAllUsersPaginated()` → `prisma.user.findMany({ skip, take, orderBy })`
- `updateUser(uid, data)` → `prisma.user.update()`
- `isUsernameTaken(username, excludeId?)` → `prisma.user.findFirst({ where: { username } })`
- `hydrateUsers(uids)` → `prisma.user.findMany({ where: { id: { in: uids } } })`

### [NEW] `src/lib/services/group.service.ts`
- `createGroup()` → `prisma.group.create()` + `prisma.groupMember.create()` for creator
- `getGroupById()` → `prisma.group.findUnique({ include: { members: { include: { user: true } }, createdBy: true } })`
- `getGroupsByUserId()` → `prisma.group.findMany({ where: { members: { some: { userId } }, archivedAt: null } })`
- `getAllGroups()` → `prisma.group.findMany()`
- `addMembersToGroup()` → `prisma.groupMember.createMany()`
- `removeMemberFromGroup()` → `prisma.groupMember.delete()`
- `updateGroup()` → `prisma.group.update()`
- `archiveGroup()` → `prisma.group.update({ archivedAt: new Date() })`
- `restoreGroup()` → `prisma.group.update({ archivedAt: null })`
- `deleteGroupPermanently()` → `prisma.group.delete()` (cascade handles all children)

### [NEW] `src/lib/services/expense.service.ts`
- `addExpense()` → `prisma.$transaction([prisma.expense.create(), prisma.expensePayer.createMany(), prisma.expenseParticipant.createMany(), prisma.group.update({ totalExpenses: { increment } })])`
- `updateExpense()` → transaction: delete old payers/participants, recreate, update expense + group total
- `deleteExpense()` → `prisma.$transaction([prisma.expense.delete(), prisma.group.update({ totalExpenses: { decrement } })])`
- `getExpensesByGroupId()` → `prisma.expense.findMany({ where: { groupId }, include: { payers: { include: { user } }, participants: { include: { user } }, expenseCreator: true } })`
- `getExpensesByUserId()` → query where user is in payers OR participants
- `getAllExpenses()` → admin only

### [NEW] `src/lib/services/settlement.service.ts`
- `addSettlement()` → `prisma.settlement.create()`
- `getSettlementsByGroupId()` → `prisma.settlement.findMany({ where: { groupId }, include: { paidBy: true, paidTo: true } })`
- `getSettlementsByUserId()` → where paidById OR paidToId = userId
- `updateSettlement()` → `prisma.settlement.update()`
- `deleteSettlement()` → `prisma.settlement.delete()`

### [NEW] `src/lib/services/balance.service.ts`
- `getGroupBalances()` — pure calculation, no DB change needed (same algorithm, uses expense/settlement services)
- `simplifyDebts()` — pure function, no change
- `getAllUserBalances()` — same algorithm

### [NEW] `src/lib/services/history.service.ts`
- `logHistoryEvent()` → `prisma.historyEvent.create()`
- `getHistoryByGroupId()` → `prisma.historyEvent.findMany({ where: { groupId, group: { members: { some: { userId } } } }, orderBy: { timestamp: 'desc' } })`
- `getHistoryForExpense()` → `prisma.historyEvent.findMany({ where: { expenseId } })`
- `restoreExpense()` / `restoreSettlement()` — same logic, calls new service functions
- `deleteHistoryEvent()` → `prisma.historyEvent.delete()`

### [NEW] `src/lib/services/settings.service.ts`
- `getSiteSettings()` → `prisma.settings.findUnique({ where: { id: 'general' } })` — fallback to defaults if not found
- `updateSiteSettings()` → `prisma.settings.upsert()`
- Works both client and server side (no more admin SDK needed)

### [NEW] `src/lib/services/ticket.service.ts`
- `getTicketsByUserId()` → `prisma.supportTicket.findMany({ where: { userId }, include: { messages: { include: { sentBy: true } } } })`
- `getAllTickets()` → `prisma.supportTicket.findMany({ include: { messages, user, assignedTo } })`
- `updateTicket()` → `prisma.supportTicket.update()`
- `deleteTicket()` → `prisma.supportTicket.delete()`

### [NEW] `src/lib/services/notification.service.ts`
- `createNotification()` → `prisma.$transaction([prisma.notification.create(), prisma.notificationRecipient.createMany()])`
- `getNotificationsForUser(userId)` → `prisma.notification.findMany({ where: { recipients: { some: { userId } } }, include: { reads: { where: { userId } }, actor: true }, orderBy: { createdAt: 'desc' }, take: 50 })`
- `markNotificationRead(notificationId, userId)` → `prisma.notificationRead.upsert()`
- `markAllRead(userId)` → `prisma.notificationRead.createMany({ skipDuplicates: true })`
- `getAllNotifications()` → admin only
- `deleteNotification()` → `prisma.notification.delete()`
- `getUserNotificationPrefs()` → `prisma.userNotificationPrefs.upsert()` (create defaults if missing)
- `updateUserNotificationPrefs()` → `prisma.userNotificationPrefs.update()`

### [MODIFY] `src/lib/mock-data.ts`
**DELETE** — replace all imports of `@/lib/mock-data` with direct service imports.

### [MODIFY] `src/hooks/queries/use-expenses.ts`
- Change import from `@/lib/firestore.service` → `@/lib/services/expense.service`

### [MODIFY] `src/hooks/queries/use-groups.ts`
- Same pattern

### [MODIFY] `src/hooks/queries/use-balances.ts`
- Same pattern

### [MODIFY] `src/hooks/queries/use-settings.ts`
- Same pattern

---

## Phase 6 — API Routes Rewrite

### [MODIFY] `src/app/api/auth/session/route.ts`
> [!NOTE]
> With Better Auth's catch-all route at `/api/auth/[...all]`, this specific session route may be retired entirely. Better Auth handles session creation/deletion via its own endpoints. The `__session` cookie is set automatically by Better Auth on `signIn`. The old POST/DELETE endpoints called from `auth-context.tsx` are replaced by the Better Auth client's built-in session management.

### [MODIFY] `src/app/api/set-admin-claim/route.ts`
Replace Firebase token verification with Better Auth session, replace Firestore writes with Prisma:
```typescript
import { auth } from '@/lib/auth.server';
import { prisma } from '@/lib/db';

// Verify caller via Better Auth session (from cookie)
const session = await auth.api.getSession({ headers: request.headers });
// ... same authorization logic
await prisma.user.update({ where: { id: uid }, data: { role: 'admin' } });
// (No more "custom claims" — role is simply a DB column)
```

### [MODIFY] `src/app/api/user/delete-account/route.ts`
```typescript
import { auth } from '@/lib/auth.server';
import { prisma } from '@/lib/db';

// Verify session
const session = await auth.api.getSession({ headers: request.headers });
// Delete user via Better Auth (handles session cleanup)
await auth.api.deleteUser({ headers: request.headers });
// prisma.user.delete() cascades to all related data automatically
```

### [MODIFY] `src/app/api/notifications/send/route.ts`
Replace all Firebase with Prisma + web-push:
```typescript
import { prisma } from '@/lib/db';
import { sendVapidPush } from '@/lib/vapid-push';
import { auth } from '@/lib/auth.server';

// Auth: session instead of verifyIdToken
const session = await auth.api.getSession({ headers: request.headers });

// In-app notification: prisma.notification.create()
// Push: sendVapidPush() using VAPID subscriptions from push_subscriptions table
// Email: no change — still uses nodemailer/SMTP
// User email lookup: prisma.user.findMany({ where: { id: { in: recipientIds } } })
```

### [MODIFY] `src/app/api/send-password-reset/route.ts`
```typescript
// Replace firebase generatePasswordResetLink with Better Auth flow
await auth.api.forgetPassword({ body: { email }, headers: request.headers });
// Better Auth calls sendResetPassword callback defined in auth.server.ts
// That callback uses nodemailer via your SMTP — same as before
```

### [MODIFY] `src/app/api/send-test-email/route.ts`
- Replace `firebaseAdmin.auth().getUser(uid)` → `prisma.user.findUnique({ where: { id: uid } })`
- Replace session verification with Better Auth

### [MODIFY] `src/app/api/admin/broadcast-email/route.ts`
- Replace `firebaseAdmin.auth().listUsers()` → `prisma.user.findMany({ select: { email: true, name: true } })`
- Replace token verification → Better Auth session + role check

### [MODIFY] `src/app/api/admin/data-updater/route.ts`
- Replace all Firestore batch operations with Prisma transactions
- Replace `firebaseAdmin.auth()` verification with Better Auth session
- Array field operations: `prisma.groupMember.deleteMany({ where: { userId: oldUid } })` then recreate

### [MODIFY] `src/app/api/admin/notify-new-ticket/route.ts`
### [MODIFY] `src/app/api/admin/notify-ticket-reply/route.ts`
- Replace `firebaseAdmin.firestore()` and `Timestamp` imports with Prisma and `new Date()`
- `getAdminUserProfile(uid)` → `prisma.user.findUnique()`
- `getTicketById(id)` → `prisma.supportTicket.findUnique({ include: { messages, user } })`

### [MODIFY] `src/app/api/public/settings/route.ts`
- Replace `getSiteSettingsAdmin()` (Firestore) → `import { getSiteSettings } from '@/lib/services/settings.service'`

---

## Phase 7 — Notifications: SSE + VAPID Push

### [NEW] `src/lib/vapid-push.ts`
```typescript
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendVapidPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<void> {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.p256dh, auth: subscription.auth },
  };
  await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
}
```

### [NEW] `src/app/api/notifications/stream/route.ts`
SSE endpoint for real-time in-app notifications:
```typescript
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session.user.id;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Poll PostgreSQL every 5 seconds for new notifications
      // OR use pg LISTEN/NOTIFY for true push from DB
      const interval = setInterval(async () => {
        const newNotifs = await prisma.notification.findMany({
          where: {
            recipients: { some: { userId } },
            createdAt: { gt: lastCheck },
          },
          include: { reads: { where: { userId } }, actor: true },
        });
        if (newNotifs.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(newNotifs)}\n\n`));
        }
        lastCheck = new Date();
      }, 5000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### [NEW] `src/app/api/push/subscribe/route.ts`
Save VAPID push subscription to DB:
```typescript
// Body: { deviceId, endpoint, p256dh, auth, deviceName }
await prisma.pushSubscription.upsert({
  where: { deviceId },
  create: { userId, deviceId, endpoint, p256dh, auth, deviceName },
  update: { endpoint, p256dh, auth, lastSeen: new Date() },
});
```

### [NEW] `src/app/api/push/unsubscribe/route.ts`
Remove push subscription from DB.

### [MODIFY] [notification-context.tsx](file:///d:/Projects/SplitWise-Clone/src/contexts/notification-context.tsx)
Complete rewrite:
- Remove all Firestore imports (`collection`, `query`, `where`, `onSnapshot`, etc.)
- Remove `import { db } from '@/lib/firebase'`
- Replace `onSnapshot` with `EventSource` connecting to `/api/notifications/stream`
- Initial load: fetch `/api/notifications?limit=50` via React Query
- `markRead` → `PATCH /api/notifications/[id]/read`
- `markAllRead` → `POST /api/notifications/mark-all-read`
- Background push via service worker (separate from SSE)

### [NEW] `src/app/api/notifications/route.ts`
GET handler to fetch notifications for current user (initial load + fallback).

### [NEW] `src/app/api/notifications/[id]/read/route.ts`
PATCH handler to mark a single notification as read.

### [NEW] `src/app/api/notifications/mark-all-read/route.ts`
POST handler to mark all notifications as read.

### [MODIFY] `public/firebase-messaging-sw.js` → `public/sw-push.js`
Rewrite service worker to handle native VAPID push events:
```javascript
self.addEventListener('push', (event) => {
  const payload = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Notification', {
      body: payload.body,
      icon: '/icons/icon-192x192.png',
      data: payload.data || {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
```

### [MODIFY] `src/lib/notification-service.ts`
Remove `getAuth(app)` and Firebase token — replace with Better Auth session token fetching:
```typescript
// Instead of: const token = await user.getIdToken();
// Use: const session = await authClient.getSession();
//      headers['Authorization'] = `Bearer ${session?.session?.token}`;
```

---

## Phase 8 — MinIO File Storage & Next.js reverse proxy

### [NEW] `src/lib/minio.ts`
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT!,
  region: 'us-east-1',          // MinIO ignores region but SDK requires it
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
  forcePathStyle: true,          // Required for MinIO
});

export const BUCKET = process.env.MINIO_BUCKET || 'splitwise';

export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
  // Returns a relative URL proxied through our App instead of a direct MinIO domain/port URL
  return `/api/storage/${key}`;
}
```

### [NEW] `src/app/api/storage/[...key]/route.ts`
Next.js API route that acts as a secure reverse proxy to stream files directly from MinIO:
```typescript
import { NextResponse } from 'next/server';
import { s3, BUCKET } from '@/lib/minio';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(request: Request, { params }: { params: { key: string[] } }) {
  try {
    const key = params.key.join('/');
    const response = await s3.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));

    if (!response.Body) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    const headers = new Headers();
    if (response.ContentType) {
      headers.set('Content-Type', response.ContentType);
    }
    if (response.ContentLength) {
      headers.set('Content-Length', response.ContentLength.toString());
    }
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    // Stream the body directly to the client
    return new Response(response.Body as any, {
      headers,
    });
  } catch (error) {
    console.error('Error proxying file from MinIO:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
```

### [NEW] `src/app/api/upload/avatar/route.ts`
Accept multipart upload, save to MinIO, return relative URL (`/api/storage/...`). Updates user's `avatarUrl` in DB.

### [NEW] `src/app/api/upload/receipt/route.ts`
Accept multipart upload for expense receipts, save to MinIO, return relative URL.

### [MODIFY] `next.config.ts`
- Remove Firebase Storage domains from `remotePatterns`
- Add local domains to `remotePatterns` if needed (relative paths will work without remote patterns, but NEXT_PUBLIC_APP_URL should be added for safety)

---

## Phase 9 — Types Cleanup

### [MODIFY] [src/types/index.ts](file:///d:/Projects/SplitWise-Clone/src/types/index.ts)
- Remove `import { Timestamp } from 'firebase/firestore'` (line 4)
- Replace `createdAt: Timestamp` in all Document types with `createdAt: Date`
- Replace `Timestamp` with `Date` throughout all `*Document` interfaces
- Add `UserNotificationPrefsDocument.updatedAt: Date`
- Remove Firestore-specific comment "Firestore Document Types" — rename to "Database Document Types"
- `PushSubscriptionDocument`: change `fcmToken` → `endpoint`, add `p256dh`, `auth` fields

### [MODIFY] `src/firebase/error-emitter.ts` → `src/lib/error-emitter.ts`
Move to `src/lib/`, update all imports.

### [MODIFY] `src/firebase/errors.ts` → `src/lib/db-errors.ts`
Rename `FirestorePermissionError` → `DatabaseError`, generalize for PostgreSQL errors.
Update all imports throughout the codebase.

---

## Phase 10 — Data Migration Scripts

### [NEW] `scripts/export-firebase.ts`
Uses Firebase Admin SDK (last use before deletion) to export all data:

```typescript
// Run: npx tsx scripts/export-firebase.ts
// Exports each collection to scripts/exports/*.json
const collections = [
  'users', 'groups', 'expenses', 'settlements',
  'history', 'tickets', 'notifications_v2',
  'user_notification_prefs', 'push_subscriptions',
];
// Also exports settings/general and settings/expenseCategories docs
```

### [NEW] `scripts/import-to-postgres.ts`
Reads exported JSON files, transforms, imports to PostgreSQL via Prisma:

```typescript
// Run AFTER Prisma migration: npx tsx scripts/import-to-postgres.ts

// Transform rules:
// - Firestore Timestamp objects → new Date(ts._seconds * 1000)
// - Firestore auto-IDs preserved as string PKs (they are cuid-compatible)
// - users: map to User + Account tables (email/password provider)
// - groups: Group + GroupMember rows from memberIds array
// - expenses: Expense + ExpensePayer[] + ExpenseParticipant[] from nested arrays
// - settlements: direct 1:1
// - history: direct 1:1 (data field stored as Json)
// - notifications_v2: Notification + NotificationRecipient[] + NotificationRead[] from arrays
// - user_notification_prefs: direct 1:1 (events as Json)
// - settings: merge general + expenseCategories into single Settings.data Json
// - push_subscriptions: SKIP (FCM tokens are invalid after migration, users re-subscribe)
// - tickets: SupportTicket + TicketMessage[] from messages array
```

> [!WARNING]
> FCM push tokens in `push_subscriptions` **cannot be migrated** — they are tied to Firebase's FCM project. Users will be re-prompted to grant push notification permission on next login, which generates a new VAPID subscription.

### [NEW] `scripts/verify-migration.ts`
Row count comparison script — prints counts from Firebase export vs PostgreSQL rows.

---

## Phase 11 — Deletions (After All Tests Pass)

### Files to DELETE
```
src/lib/firebase.ts
src/lib/firebase-admin.ts
src/lib/firestore.service.ts
src/lib/push-service.ts
src/lib/mock-data.ts
src/lib/auth.ts
src/lib/storage.ts
src/firebase/error-emitter.ts   (moved to src/lib/)
src/firebase/errors.ts          (moved to src/lib/)
src/firebase/                   (directory — remove if empty)
firebase.json
firestore.indexes.json
firestore.rules
storage.rules
apphosting.yaml
service-account.json
public/firebase-messaging-sw.js
```

---

## Implementation Order (Dependency-safe Sequence)

```
Phase 0   → Create dev branch, install/remove packages
Phase 1   → Update docker-compose.yml + Dockerfile
Phase 2   → Update .env (add new vars, remove Firebase vars)
Phase 3   → Write prisma/schema.prisma, run `npx prisma migrate dev`
Phase 4   → Implement Better Auth (auth.server.ts, auth.client.ts, catch-all route)
Phase 4.5 → Rewrite auth-context.tsx
Phase 5   → Write all service files (user, group, expense, settlement, balance, history, settings, ticket, notification)
Phase 5.5 → Update types/index.ts (remove Timestamp, firebase imports)
Phase 6   → Rewrite all API routes (remove firebase-admin imports)
Phase 7   → SSE stream + VAPID push + new push service worker
Phase 8   → MinIO setup + upload API routes + next.config.ts update
Phase 9   → Move error-emitter/errors.ts, update all remaining imports
Phase 10  → Run export script on live Firebase, run import script into PostgreSQL, verify
Phase 11  → Delete all Firebase files, run final typecheck
Phase 11+ → Commit, push, deploy to VPS with docker compose
```

---

## Verification Plan

### Automated
```bash
# Type-check the full project
npm run typecheck

# Validate Prisma schema
npx prisma validate

# Run existing tests
npm run test

# Test DB migration dry-run
npx prisma migrate dev --name init_local_stack
```

### Manual Local Verification
1. `docker compose up` → postgres, minio, web all start
2. MinIO console at `http://localhost:9001` — create `splitwise` bucket
3. App at `http://localhost:3231` — loads without errors
4. Sign up with email → verify email → login works
5. Google OAuth login → redirect works, session created
6. Create group → check PostgreSQL: `SELECT * FROM "Group";`
7. Add expense → check `Expense`, `ExpensePayer`, `ExpenseParticipant` tables
8. Record settlement → check `Settlement` table
9. Notification arrives in UI within 5 seconds (SSE stream)
10. Background tab → notification shows as browser push notification
11. Admin role → set `role = 'admin'` via Prisma Studio, verify admin dashboard loads
12. Upload avatar → file appears in MinIO `splitwise` bucket
13. Delete account → all related rows cascade-deleted in PostgreSQL

### Data Migration Verification
```bash
# Run export from Firebase
npx tsx scripts/export-firebase.ts

# Check export files
ls -la scripts/exports/

# Run import
npx tsx scripts/import-to-postgres.ts

# Verify counts
npx tsx scripts/verify-migration.ts
```

### VPS Deploy Verification
```bash
# On VPS:
docker compose pull
docker compose up -d
docker compose logs web --follow
# Expect: "Ready - started server on 0.0.0.0:3231"
# No Firebase SDK errors
```

---

## Git Commit Strategy (per phase)

```
✨ add postgres, minio to docker-compose
🔧 set up prisma schema for all collections
✨ add better-auth with google oauth and email/password
♻️ rewrite auth-context to use better-auth client
✨ add prisma-based service layer (user, group, expense, settlement)
✨ add balance, history, settings, ticket, notification services
♻️ rewrite all api routes to use prisma + better-auth
✨ add sse notification stream and vapid push
🗑️ remove firebase client and admin sdk
✨ add minio storage client and upload routes
🔧 update types: remove firestore timestamp imports
📝 add firebase export and postgres import migration scripts
🗑️ delete all firebase config files
```

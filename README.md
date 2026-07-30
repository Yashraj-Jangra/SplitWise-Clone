# Welcome to SplitIt - A Full-Stack SplitWise Clone

**SplitIt** is a full-stack expense-splitting web application designed to simplify shared finances for roommates, trips, vacations, and group events. 

Built on **Next.js App Router**, **Oracle Autonomous Database**, **Better Auth**, and **Tailwind CSS**, it features smart debt simplification, real-time balances, interactive spending graphs, transactional email templates, and native OS push notifications.

> **Note**: Check out the [live production version](https://split.cvweb.tech) for the latest features and live demonstration.

---

## Table of Contents

- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture & Performance Highlights](#architecture--performance-highlights)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Project Structure](#project-structure)

---

## Key Features

### 💸 Core Financial Engines
- **Flexible Expense Splitting**: Split costs multiple ways to mirror real-life scenarios:
  - **Equally**: Costs split evenly among participants.
  - **Unequally**: Specify precise currency amounts owed per person.
  - **By Shares**: Split proportionally by weights/shares.
  - **By Percentage**: Split by percentages (e.g. 60/40 splits).
- **Multiple Payers**: Supports multiple members contributing different amounts to a single expense.
- **Smart Debt Simplification**: Computes the minimum number of individual transactions needed to settle all debts within a group.
- **Real-Time Balances**: Aggregates obligations immediately on save to show who owes you and who you owe across all groups.
- **Dynamic Multi-Currency Support**: Configure custom group-specific currencies (₹, $, €, £, ¥, etc.) with locale-aware decimal formatting.

### 📱 Premium User Experience (UX)
- **Personal Dashboard**: High-density neutral theme showing net credit/debit balances, active obligations, and recent activities.
- **Interactive Spending Analytics**: View categorized spending breakdowns, trends over time, and budget performance charts.
- **Native Push Notifications**: Category-specific OS push notifications (using VAPID protocol) with action buttons (e.g. "Settle Now", "View Expense").
- **Notification Preferences**: Granular settings interface enabling users to toggle email, in-app, or push channels individually per event type.
- **Global Command Search**: Quick search interface (`Ctrl+K` / `⌘K`) to query groups, expenses, and members instantly.

### 🛡️ Admin Panel & Controls
- **Big Picture Statistics**: Get site-wide metrics on total registered users, groups, transactions, and ticket volumes.
- **Data Migration & Merge Tools**: Cleanly merge duplicate credentials and migrate database profiles.
- **Content Management**: Update branding parameters, site name, logos, landing page layouts, and legal documents.
- **System Configs**: Configure dynamic color themes, custom expense categories, and SMTP mail servers.
- **Support System**: Manage client-reported issues with an integrated ticket-handling system.
- **Global Broadcasts**: Dispatch bulk in-app announcements or global email broadcasts to all users.

---

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Actions, API Routes)
- **Database**: [Oracle Autonomous Database](https://www.oracle.com/autonomous-database/) (relational tables structured in a NoSQL key-document mapping layer)
- **Authentication**: [Better Auth](https://www.better-auth.com/) (session-based credentials and Google OAuth with automatic account linking)
- **Push System**: Native **VAPID Web Push** (implemented via `web-push` and client service worker)
- **Styling**: **Tailwind CSS** (curated solid neutral design tokens)
- **Forms & Validation**: **React Hook Form** with **Zod** schema validations
- **Charts**: **Recharts** (highly interactive SVGs)
- **Email Delivery**: **Nodemailer** with custom compiler templates supporting responsive buttons and UPI bridges

---

## Architecture & Performance Highlights

- **Oracle NoSQL In-Memory Read Cache**: To minimize read latency from the database, we built an in-memory cache layer in the database utility. It caches item reads with a 15-second TTL and automatically flushes on write actions.
- **No Loopback HTTP Calls**: Decoupled notification dispatch into clean local services. Both in-app routines and background API routes trigger email/push dispatches directly through server modules, eliminating loops and headers mismatches.
- **Clickable UPI Email Actions**: Generated an HTTP bridge route (`/api/pay-upi`) allowing email clients to trigger deep-link `upi://` payment actions on mobile devices without client-side parsing filters stripping custom URI schemes.
- **Cursor-Based Pagination**: Admin tables cursor-paginate records 10 at a time, ensuring fast load times regardless of user base size.
- **Choreographed Record Highlighting**: Built dynamic transition routes that scroll target records into view, expand details, and trigger CSS highlighting keyframes upon navigating from notification badges.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or later recommended)
- Access to an Oracle Autonomous Database instance (with connection credentials and client wallet ZIP file)
- A Google Cloud Developer Console application (for Google OAuth and/or Gmail API integration)

### Local Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Yashraj-Jangra/SplitIt-SplitWise_Clone.git
   cd SplitWise-Clone
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Establish your local environment variables**:
   Create a `.env.local` file in the root directory. Copy and configure the parameters from [Environment Configuration](#environment-configuration).

4. **Add your Oracle Wallet**:
   Unpack your database wallet ZIP folder into a directory in the workspace (e.g. `./wallet`) and ensure `tnsnames.ora` points to your Oracle Autonomous Database instance.

5. **Run the local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3231` in your browser.

---

## Environment Configuration

Configure the following variables in your `.env.local` file:

```env
# ─── APPLICATION SETTINGS ──────────────────────────────────────────────────
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3231
BETTER_AUTH_URL=http://localhost:3231

# ─── DATABASE CONFIGURATION (ORACLE AUTONOMOUS) ─────────────────────────────
# ORA_WALLET_DIR points to the folder containing your Oracle Instant Client wallet
ORA_WALLET_DIR=./wallet
ORA_DB_USER=ADMIN
ORA_DB_PASSWORD=your_db_password_here
ORA_CONNECT_STRING=your_db_service_name_high

# ─── AUTHENTICATION (BETTER AUTH) ───────────────────────────────────────────
BETTER_AUTH_SECRET=your_better_auth_secret_32_character_string
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# ─── PUSH NOTIFICATIONS (VAPID WEB PUSH) ────────────────────────────────────
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:admin@yourdomain.com

# ─── STORAGE SERVICES (OCI OBJECT STORAGE) ──────────────────────────────────
OCI_REGION=ap-mumbai-1
OCI_NAMESPACE=your_oci_namespace
OCI_S3_ACCESS_KEY=your_oci_s3_compat_access_key
OCI_S3_SECRET_KEY=your_oci_s3_compat_secret_key
OCI_STORAGE_BUCKET=splitit-storage

# ─── BOOTSTRAP ADMINISTRATOR ───────────────────────────────────────────────
# The email address promoted to admin on first registration
ADMIN_EMAIL=admin@yourdomain.com
INTERNAL_API_SECRET=your_shared_background_cron_key_secret
```

---

## Project Structure

```
/
├── public/
│   ├── icons/          # Core PWAs assets and favicons
│   ├── notif-icons/    # Custom SVGs for category push notifications
│   ├── screenshots/    # Application demo screenshots
│   └── sw-push.js      # VAPID push listener service worker
├── src/
│   ├── app/            # Next.js App Router (Layouts, Pages, API Routes)
│   ├── components/     # UI, Auth, Dashboard, and Shared components
│   ├── contexts/       # Auth, Theme, Settings and Notification state providers
│   ├── hooks/          # Custom hooks (data queries, long press, pull-to-refresh)
│   ├── lib/            # Auth configs, Nosql DB wrappers, and API services
│   └── types/          # TypeScript definitions
├── tsconfig.json       # TypeScript configuration
├── vitest.config.ts    # Test suite config
└── README.md           # You are here!
```
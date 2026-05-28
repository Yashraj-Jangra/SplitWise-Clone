# Welcome to SplitIt - A Full-Stack SplitWise Clone

Ever been on a group trip where someone says "let's split everything equally" and then you spend the next three months chasing people for money? Yeah, that's what this is for. **SplitIt** is a full-stack expense-splitting app that takes the drama out of shared finances.

Built with Next.js, Firebase, and Tailwind CSS, it's a clean, feature-rich way to track who owes what—and make sure everyone actually pays up. Whether you're splitting rent, planning a vacation, or just tired of spreadsheet chaos, SplitIt has you covered.

> **Note**: This is a public repo and may run a few versions behind the original production site. Check out the [live production version](https://split.cvweb.tech) for the latest features.

![SplitIt Dashboard Screenshot](/public/screenshots/dashboard.png)
_Your financial overview at a glance—see what you've spent and who owes you._

## Table of Contents

- [Key Features](#key-features)
- [Live Demo & Screenshots](#live-demo--screenshots)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Core Concepts](#core-concepts)
- [Project Structure](#project-structure)

## Key Features

SplitIt is loaded with features, from the core money-splitting stuff to a full admin panel.

### Core Functionality

-   🔐 **Secure Authentication**: Sign up with email or just use Google OAuth. Your data is safe—it's all protected by Firebase.
-   👨‍👩‍👧‍👦 **Groups**: Create a group for any occasion (road trip, roommates, etc.), invite people via email, manage members.
-   💸 **Flexible Expense Splitting**: The bread and butter of this app. Split expenses in multiple ways:
    -   **Equally**: Everyone pays the same amount.
    -   **Unequally**: Manually set how much each person owes.
    -   **By Shares**: Good for when someone stays longer or gets more. Assign shares and split proportionally.
    -   **By Percentage**: Allocate costs based on percentages (e.g., one person pays 60%, another 40%).
-   🤝 **Multiple Payers**: One expense can be paid by multiple people, because real life is messy.
-   📊 **Real-time Balances**: See exactly who owes whom in each group and your overall net balance across all groups.
-   💡 **Smart Debt Simplification**: Our algorithm figures out the minimum number of payments needed to clear all debts. Less transactions, more time for actual fun.
-   🗄️ **Archive Groups**: Once everyone pays up, archive a group to keep it as a record.

### User Experience

-   🏠 **Personal Dashboard**: See your net balance, who owes you, and who you owe at a glance.
-   📈 **Spending Analytics**: Check out your spending patterns with charts. Filter by date range to see trends.
-   📱 **Mobile-Friendly**: Works great on phones, tablets, and desktops. Split bills on the go.
-   🎨 **Custom Themes**: Pick from different color themes to personalize how the app looks.
-   🔍 **Global Search**: Hit `Ctrl+K` (or `⌘K` on Mac) to search for groups, expenses, or people instantly.
-   🔔 **Notifications**: Get announcements and alerts right inside the app.

### Admin Panel

A dedicated dashboard for admins to keep things running smoothly.

-   📈 **Site-Wide Statistics**: Get the big picture—how many users, groups, and total expenses in the system.
-   🛠️ **User & Group Management**: Need to fix something? Edit users, manage groups, or handle user data migrations.
-   ⚙️ **Customization Central**:
    -   **Branding**: Change the app name, logos, and make it your own.
    -   **Theming**: Create custom color themes that users can switch between.
    -   **Content Management**: Update landing page content, about page, and legal pages.
    -   **Expense Categories**: Manage the master list of categories so expenses are organized.
    -   **Mail Configuration**: Connect your own SMTP server so transactional emails actually get sent.
-   📢 **Broadcast System**: Send in-app announcements or email everyone at once.
-   🎟️ **Ticket System**: Keep track of user support requests and issues.

## Live Demo & Screenshots

### Core Features in Action

![Group Dashboard](/public/screenshots/group-activity.png)
_Group activity view—see everything happening in your shared expense groups._

![Group Analytics](/public/screenshots/group-analytics.png)
_Get insights into group spending patterns with interactive charts and breakdowns._

![Add Expense Form](/public/screenshots/expense-form.png)
_Adding an expense? Choose from equal splits, percentage-based splits, or custom amounts._

### Admin Panel

Got admin access? The admin panel is where the magic happens—manage users, customize settings, and configure everything about your SplitIt instance.

![Admin Site Settings](/public/screenshots/admin-site-settings.png)
_Customize branding, manage themes, and control what appears across your app._

![Admin Mail Configuration](/public/screenshots/admin-mail-config.png)
_Set up your SMTP server so the app can send actual emails (password resets, notifications, etc.)._

![Admin Theme Customization](/public/screenshots/admin-theme-customization.png)
_Create and manage custom color themes that users can pick from._

![Admin Ticket System](/public/screenshots/admin-ticket-system.png)
_Handle user support requests and keep track of issues reported by users._

## Tech Stack

Built with a modern, scalable stack:

-   **Framework**: [Next.js](https://nextjs.org/) (with App Router)
-   **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
-   **Charts**: [Recharts](https://recharts.org/)
-   **AI (Optional)**: [Genkit](https://firebase.google.com/docs/genkit)

## Getting Started

Here’s the quick setup to get SplitIt running locally.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later recommended)
-   A [Firebase](https://firebase.google.com/) account (the free "Spark" plan is sufficient)
-   [Firebase CLI](https://firebase.google.com/docs/cli) installed and authenticated (`npm install -g firebase-tools` and `firebase login`)

### Firebase Project Setup

1.  **Create a Firebase Project**:
    -   Go to the [Firebase Console](https://console.firebase.google.com/).
    -   Click "Add project" and follow the on-screen instructions.

2.  **Register a Web App**:
    -   In your project's dashboard, click the web icon (`</>`) to add a new web app.
    -   Give it a nickname (e.g., "SplitIt Web") and register the app.
    -   After registration, Firebase will show you a configuration object. Copy these credentials.

3.  **Enable Authentication Methods**:
    -   In the Firebase Console, go to **Build > Authentication** > **Sign-in method**.
    -   Enable both **Email/Password** and **Google** providers.

4.  **Set up Firestore Database**:
    -   Go to **Build > Firestore Database** > **Create database**.
    -   Start in **production mode**. This is crucial for security rules to work correctly.
    -   Choose a location for your database.

### Local Installation & Setup

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Yashraj-Jangra/SplitIt-SplitWise_Clone.git
    cd SplitWise-Clone
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Create Environment File**:
    -   Create a file named `.env` in the root of your project.
    -   Add your Firebase **client-side** configuration (safe to expose):
    ```env
    # --- Firebase Client SDK (public) ---
    NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123...
    NEXT_PUBLIC_FIREBASE_APP_ID=1:123...:web:...

    # --- Firebase Admin SDK (server-only, never expose to client) ---
    # Go to: Firebase Console > Project Settings > Service Accounts > Generate new private key
    # Paste the entire JSON as a single-line string:
    FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'

    # --- Bootstrap Admin ---
    # The email address that gets admin privileges on first signup.
    # Additional admins can be promoted from the Admin Panel after this.
    ADMIN_EMAIL=your-admin-email@example.com
    ```

4.  **Generate Firebase Service Account Key** (required for server-side API routes):
    -   In Firebase Console, go to **Project Settings > Service Accounts**.
    -   Click **Generate new private key** and download the JSON file.
    -   Copy the entire JSON content (minified to one line) into `FIREBASE_SERVICE_ACCOUNT` in your `.env`.
    -   **Never commit this key to version control.**

5.  **Connect to Your Firebase Project**:
    ```bash
    npx firebase-tools use --add
    ```

6.  **Deploy Firestore Security Rules**:
    ```bash
    npx firebase-tools deploy --only firestore:rules
    ```

7.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3231`.

## Core Concepts

-   **Groups**: Think of this as a container for shared activities. It has members, expenses, and eventually settlements. Everything revolves around groups.
-   **Expenses**: A single cost that someone paid for. The cool part? You can split it between people in tons of different ways.
-   **Settlements**: When person A pays person B to clear a debt. Our debt simplification algorithm figures out the most efficient way to settle everyone's debts.

## Project Structure

This project uses the Next.js App Router and a feature-based folder structure.

```
/
├── src/
│   ├── app/            # Next.js App Router: layouts, pages, and loading states
│   │   ├── (app)/      # Authenticated application routes (dashboard, groups)
│   │   ├── (admin)/    # Admin panel routes
│   │   ├── (auth)/     # Authentication pages (login, signup)
│   │   ├── api/        # API routes for server-side logic
│   │   └── ...
│   ├── components/
│   │   ├── auth/       # Authentication-related forms and components
│   │   ├── dashboard/  # Dashboard-specific components and cards
│   │   ├── expenses/   # Expense forms, list items, and dialogs
│   │   ├── groups/     # Group management components
│   │   ├── layout/     # Core layout components (App shell, sidebar, header)
│   │   └── ui/         # Reusable UI components from ShadCN
│   ├── contexts/       # React context providers for global state
│   ├── firebase/       # Firebase configuration and custom error handling
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Core libraries, utilities, and data fetching logic
│   └── types/          # TypeScript type definitions
├── firebase.json       # Firebase deployment configuration
├── firestore.rules     # Firestore security rules
└── README.md           # You are here!
```
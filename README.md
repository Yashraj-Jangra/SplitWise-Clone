
# {AppName} - Effortless Group Expense Management

{AppName} is a modern, full-stack web application designed to simplify expense tracking and settlement within groups. Built with Next.js, Firebase, and ShadCN UI, it provides a seamless and intuitive user experience for managing shared costs, whether for trips, household bills, or any group activity.

[![{AppName} Dashboard Screenshot](https://placehold.co/800x450.png)](https://placehold.co)
*A placeholder for the app's dashboard screenshot.*

## Table of Contents

- [Features](#features)
  - [Core Functionality](#core-functionality)
  - [User Experience](#user-experience)
  - [Admin Panel](#admin-panel)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Firebase Project Setup](#firebase-project-setup)
  - [Local Installation](#local-installation)
- [Running the Application](#running-the-application)
- [Deploying Firebase Rules](#deploying-firebase-rules)
- [Core Concepts](#core-concepts)
  - [Groups](#groups)
  - [Expenses](#expenses)
  - [Settlements](#settlements)

## Features

### Core Functionality

- **Secure User Authentication**: Sign-up and login with Email/Password and Google OAuth.
- **Group Management**: Create shared expense groups, invite members by email, and manage group settings.
- **Advanced Expense Tracking**: Add detailed expenses with complex splits (equally, unequally, by shares, or by percentage).
- **Multi-Payer Support**: An expense can be paid by one or more members.
- **Real-time Balances**: Instantly see who owes whom within each group and across all groups.
- **Smart Settlements**: A "Simplify Debts" algorithm calculates the most efficient payment path to clear all debts in a group.
- **Group Archiving**: Group creators can archive a group once all debts are settled, making it read-only.
- **Activity & Audit Trail**: A detailed history log tracks every action within a group, from expense creation to member additions.

### User Experience

- **Personal Dashboard**: A centralized view of your overall net balance, outstanding debts, and recent spending trends.
- **Financial Analysis**: Visualize personal spending patterns with interactive charts and date-range filters.
- **Responsive Design**: A beautiful and functional interface on both desktop and mobile devices.
- **Theming**: Users can choose from several pre-configured themes to personalize their experience.
-   **Global Search**: Instantly find any group, expense, or user with a powerful global search (`⌘K` / `Ctrl+K`).
-   **Notifications**: Receive site-wide announcements and critical alerts from administrators.

### Admin Panel

A dedicated dashboard for administrators to manage the entire application.

- **Site-Wide Statistics**: View key metrics like total users, groups, and expenses.
- **User & Group Management**: View, edit, and manage all users and groups in the system.
- **Advanced Data Tools**: A powerful UID replacement tool to migrate user data if necessary.
- **Broadcast System**: Send in-app announcements or broadcast emails to all registered users.
- **Site Settings Customization**:
    - **Branding**: Change the application name and logos.
    - **Theming**: Create, edit, and delete themes. Set the default theme and control which themes are user-selectable.
    - **Content Management**: Customize the content for the landing page, about page, legal pages (privacy/terms), and 404 page.
    - **Expense Categories**: Manage the master and sub-categories for expenses, including keywords for auto-categorization.
    - **Mail Configuration**: Configure custom SMTP servers for sending transactional emails.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (with App Router)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **AI (Optional)**: [Genkit](https://firebase.google.com/docs/genkit)

## Project Structure

A brief overview of the key directories in this project.

```
/
├── public/             # Static assets (not present by default, but can be added)
├── src/
│   ├── app/            # Next.js App Router: pages, layouts, and API routes
│   │   ├── (app)/      # Authenticated application routes (dashboard, groups, etc.)
│   │   ├── (admin)/    # Admin panel routes
│   │   ├── (auth)/     # Authentication pages (login, signup)
│   │   ├── (info)/     # Informational pages (about, privacy)
│   │   ├── api/        # API routes for server-side logic
│   │   ├── layout.tsx  # Root layout of the application
│   │   └── page.tsx    # Root page, handles initial routing
│   ├── components/
│   │   ├── analysis/   # Components for the financial analysis page
│   │   ├── auth/       # Authentication-related forms
│   │   ├── dashboard/  # Dashboard-specific components and cards
│   │   ├── expenses/   # Expense forms, list items, and dialogs
│   │   ├── groups/     # Group management components
│   │   ├── layout/     # Core layout components (App shell, sidebar, header)
│   │   ├── settlements/# Settlement forms and list items
│   │   └── ui/         # Reusable UI components from ShadCN
│   ├── contexts/       # React context providers (Auth, Site Settings, Theme)
│   ├── firebase/       # Firebase configuration and error handling logic
│   ├── hooks/          # Custom React hooks (e.g., useIsMobile)
│   ├── lib/            # Core libraries, utilities, and data fetching logic (mock-data.ts)
│   ├── themes/         # Theme color definitions
│   └── types/          # TypeScript type definitions for the application
├── firebase.json       # Firebase deployment configuration for rules and indexes
├── firestore.rules     # Firestore security rules
├── next.config.ts      # Next.js configuration file
├── tailwind.config.ts  # Tailwind CSS configuration file
└── README.md           # You are here
```

## Getting Started

Follow these instructions to get a local copy of {AppName} up and running on your machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [npm](https://www.npmjs.com/get-npm) or [yarn](https://yarnpkg.com/)
- A [Firebase](https://firebase.google.com/) account (free "Spark" plan is sufficient)
- [Firebase CLI](https://firebase.google.com/docs/cli) installed and authenticated (`npm install -g firebase-tools` and `firebase login`)

### Firebase Project Setup

1.  **Create a Firebase Project**:
    - Go to the [Firebase Console](https://console.firebase.google.com/).
    - Click "Add project" and follow the on-screen instructions.

2.  **Register a Web App**:
    - In your project's dashboard, click the web icon (`</>`) to add a new web app.
    - Give it a nickname (e.g., "{AppName} Web") and click "Register app".
    - You will be shown your Firebase configuration credentials. Copy these, as you'll need them for the `.env` file.

3.  **Enable Authentication Methods**:
    - In the Firebase Console, go to **Build > Authentication** > **Sign-in method**.
    - Enable both **Email/Password** and **Google** providers.

4.  **Set up Firestore Database**:
    - Go to **Build > Firestore Database** > **Create database**.
    - Start in **production mode**. This is important for the security rules to work correctly.
    - Choose a location for your database.

### Local Installation

1.  **Clone the Repository** (or use your existing project directory):
    ```bash
    git clone https://github.com/your-username/settleease.git
    cd settleease
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Create Environment File**:
    - Create a file named `.env` in the root of your project.
    - Copy your Firebase web app configuration from the setup step into this file:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123...
    NEXT_PUBLIC_FIREBASE_APP_ID=1:123...:web:...
    ```

4.  **Connect to your Firebase Project**:
    - In your terminal, run the following command and select the Firebase project you created.
    ```bash
    firebase use --add
    ```

## Running the Application

-   **Start the development server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3231`.

-   **(Optional) Start the Genkit developer UI**:
    If you plan to work on AI features, you can run the Genkit tools in a separate terminal:
    ```bash
    npm run genkit:dev
    ```

## Deploying Firebase Rules

For the application to securely access the database, you must deploy the Firestore security rules.

**Prerequisite**: Make sure you have the Firebase CLI installed and are logged in (`firebase login`).

Run the following command from your terminal in the project's root directory:

```bash
firebase deploy --only firestore
```

This will upload the `firestore.rules` file to your Firebase project, fixing any "Missing or insufficient permissions" errors.

## Core Concepts

### Groups
- Groups are the core of {AppName}. All expenses are contained within a group.
- You can create a new group and invite other registered users to join.
- Each group has its own balance sheet, expense log, and history.

### Expenses
- Expenses can be added to any group you are a member of.
- The app supports complex splits:
  - **Equally**: Split the cost evenly among selected participants.
  - **Unequally**: Manually enter the amount each person owes.
  - **By Shares**: Assign shares to participants (e.g., person A pays for 2 shares, person B for 1).
  - **By Percentage**: Assign a percentage of the total cost to each participant.
- Multiple members can be marked as payers for a single expense.

### Settlements
- When you are ready to pay someone back or get paid, you can record a settlement.
- The "Balances" tab in a group shows a detailed breakdown of who owes whom.
- You can use the "Simplify Debts" feature to find the most efficient way to clear all debts in the group.

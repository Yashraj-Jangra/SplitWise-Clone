# Welcome to {AppName} - Effortless Group Expense Management

Tired of chasing friends for money or getting lost in endless spreadsheets after a trip? **{AppName}** is a modern, full-stack web application designed to eliminate the headache of managing shared expenses. Built with a powerful tech stack including Next.js, Firebase, and Tailwind CSS, it provides a beautiful and intuitive platform for tracking costs, splitting bills, and settling debts within any group.

Whether you're planning a vacation, sharing household bills, or organizing an event, {AppName} ensures fairness and clarity, letting you focus on what matters most.

![{AppName} Dashboard Screenshot](/public/screenshots/dashboard.png)
_A snapshot of the main dashboard, giving you a complete overview of your finances._

## Table of Contents

- [Key Features](#key-features)
- [Live Demo & Screenshots](#live-demo--screenshots)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Core Concepts](#core-concepts)
- [Project Structure](#project-structure)

## Key Features

{AppName} is packed with features designed for a seamless user experience, from powerful core functionalities to a comprehensive admin panel.

### Core Functionality

-   🔐 **Secure User Authentication**: Easy sign-up and login with Email/Password or Google OAuth, ensuring your data is always protected.
-   👨‍👩‍👧‍👦 **Flexible Group Management**: Create shared expense groups for any purpose, invite members seamlessly via email, and manage group settings with ease.
-   💸 **Advanced Expense Tracking**: Go beyond simple splits. Log detailed expenses with support for complex divisions:
    -   **Equally**: Split the cost evenly among all or selected participants.
    -   **Unequally**: Manually enter the exact amount each person owes.
    -   **By Shares**: Assign shares to participants for proportional splitting (e.g., for a 2-day vs. 1-day stay).
    -   **By Percentage**: Allocate costs based on a percentage breakdown.
-   🤝 **Multi-Payer Support**: A single expense can be paid by one or more members, accurately reflecting real-world scenarios.
-   📊 **Real-time Balances**: Instantly see who owes whom within each group and view your overall net balance across all your groups.
-   💡 **Smart Debt Settlement**: Our "Simplify Debts" algorithm calculates the most efficient payment path to clear all debts in a group, minimizing the number of transactions required.
-   🗄️ **Group Archiving**: Once all debts are settled, the group creator can archive a group, making it a read-only record of past activities.

### User Experience

-   🏠 **Personal Dashboard**: A centralized view of your net balance, outstanding debts, and recent spending trends to keep you informed at a glance.
-   📈 **Financial Analysis**: Visualize your personal spending patterns with interactive charts and flexible date-range filters.
-   📱 **Fully Responsive Design**: A beautiful and functional interface that works flawlessly on both desktop and mobile devices.
-   🎨 **Customizable Theming**: Personalize your experience by choosing from several pre-configured color themes.
-   🔍 **Global Search**: Instantly find any group, expense, or user with a powerful global search (`⌘K` / `Ctrl+K`).
-   🔔 **Notifications**: Receive important site-wide announcements and critical alerts directly within the app.

### Admin Panel

A dedicated, secure dashboard for administrators to manage the entire application.

-   📈 **Site-Wide Statistics**: View key metrics like total users, groups, and expenses.
-   🛠️ **User & Group Management**: View, edit, and manage all users and groups in the system.
-   🔄 **Advanced Data Tools**: A powerful UID replacement tool to migrate user data if necessary.
-   📢 **Broadcast System**: Send in-app announcements or broadcast emails to all registered users.
-   ⚙️ **Site Settings Customization**:
    -   **Branding**: Change the application name and logos.
    -   **Theming**: Create, edit, and manage themes available to users.
    -   **Content Management**: Customize content for the landing, about, and legal pages.
    -   **Expense Categories**: Manage the master list of expense categories and keywords for auto-categorization.
    -   **Mail Configuration**: Configure a custom SMTP server for sending transactional emails.

## Live Demo & Screenshots

![Group Detail View](/public/screenshots/group-detail.png)
_The detailed group view, where all activity, balances, and settings are managed._

![Add Expense Form](/public/screenshots/expense-form.png)
_An intuitive form for adding expenses with complex splitting options._

## Tech Stack

This project leverages a modern, robust, and scalable technology stack:

-   **Framework**: [Next.js](https://nextjs.org/) (with App Router)
-   **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
-   **Charts**: [Recharts](https://recharts.org/)
-   **AI (Optional)**: [Genkit](https://firebase.google.com/docs/genkit)

## Getting Started

Follow these instructions to get a local copy of {AppName} up and running on your machine for development and testing purposes.

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
    -   Give it a nickname (e.g., "{AppName} Web") and register the app.
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
    git clone https://github.com/your-username/settleease.git
    cd settleease
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Create Environment File**:
    -   Create a file named `.env` in the root of your project.
    -   Copy your Firebase web app configuration into this file. These keys are safe to expose on the client-side.
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123...
    NEXT_PUBLIC_FIREBASE_APP_ID=1:123...:web:...
    ```

4.  **Connect to Your Firebase Project**:
    -   Link your local project to the Firebase project you created.
    ```bash
    firebase use --add
    ```

5.  **Run the Development Server**:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3231`.

## Core Concepts

-   **Groups**: A group is the central container for shared activities. It holds members, expenses, and settlements. Every expense belongs to a group.
-   **Expenses**: This represents a single cost incurred by one or more members of a group. The app's strength lies in its ability to split this cost in various ways among participants.
-   **Settlements**: A settlement is a direct payment from one member to another to clear a debt. The "Simplify Debts" feature helps calculate the minimum number of payments needed to balance the group's finances.

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
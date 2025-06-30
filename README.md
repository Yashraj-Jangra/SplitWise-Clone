# SettleEase - Effortless Group Expense Management

SettleEase is a modern, full-stack web application designed to simplify expense tracking and settlement within groups. Built with Next.js, Firebase, and ShadCN UI, it provides a seamless and intuitive user experience for managing shared costs, whether for trips, household bills, or any group activity.

[![SettleEase Dashboard Screenshot](https://placehold.co/800x450.png)](https://placehold.co)
*A placeholder for the app's dashboard screenshot.*

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
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
  - [Admin Panel](#admin-panel)

## Features

- **User Authentication**: Secure sign-up and login with Email/Password and Google.
- **Group Management**: Create shared expense groups, invite members, and manage group settings.
- **Expense Tracking**: Add detailed expenses with complex splits (equal, unequal, by shares, by percentage) and multiple payers.
- **Real-time Balances**: Instantly see who owes whom within each group.
- **Simplified Settlements**: A smart algorithm calculates the most efficient way to settle all debts.
- **Personal Dashboard**: A centralized view of your overall balance, recent activities, and quick actions.
- **Expense Analysis**: Visualize spending patterns with charts for both personal and group expenses.
- **Admin Panel**: A dedicated dashboard for administrators to manage users, groups, and site-wide settings.
- **Responsive Design**: A beautiful and functional interface on both desktop and mobile devices.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (with App Router)
- **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **AI (Optional)**: [Genkit](https://firebase.google.com/docs/genkit)

## Getting Started

Follow these instructions to get a local copy of SettleEase up and running on your machine.

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
    - Give it a nickname (e.g., "SettleEase Web") and click "Register app".
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
    The application will be available at `http://localhost:9002`.

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
- Groups are the core of SettleEase. All expenses are contained within a group.
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

### Admin Panel
- Users with the `admin` role have access to a special administrative dashboard at `/admin/dashboard`.
- Admins can view all users and groups, manage site-wide settings (like the app name and default images), and have elevated permissions for data management.

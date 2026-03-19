# Project Memory: SplitIt - Full-Stack Expense Splitting App

This document serves as an internal memory and technical overview of the SplitIt application, summarizing its architecture, features, and core components as understood by the AI assistant.

## 1. Project Overview

**SplitIt** is a full-stack web application designed to simplify expense sharing among groups. It allows users to create groups, track expenses with various splitting methods, and settle debts efficiently. It is built with Next.js, Firebase, and Tailwind CSS and includes a comprehensive admin panel for site management.

## 2. Core Features

### User-Facing Features:
-   **Authentication**: Secure user sign-up and login via Email/Password and Google OAuth.
-   **Group Management**: Create/archive groups, invite members.
-   **Flexible Expense Splitting**:
    -   Equal, Unequal, Percentage, and Share-based splits.
    -   Support for multiple payers per expense.
-   **Real-time Balances**: View balances per group and a net balance across all groups.
-   **Debt Simplification**: An algorithm calculates the most efficient payment path to clear all debts.
-   **Personal Dashboard**: At-a-glance view of net balance, who you owe, and who owes you.
-   **Spending Analytics**: Charts and filters to analyze personal spending patterns over time.
-   **User Settings**: Profile management, appearance (theme) selection, and security options.
-   **Support System**: Users can create and reply to support tickets.

### Admin Panel:
-   **Admin Dashboard**: Site-wide statistics (users, groups, expenses).
-   **User Management**: View and edit all user profiles.
-   **Group Management**: View, archive, restore, and permanently delete any group.
-   **Broadcast System**: Send in-app notifications or bulk emails to all users.
-   **Support Ticket Management**: View and respond to all user support tickets.
-   **Site Customization (Settings)**:
    -   **General**: App name, logos, default group cover images.
    -   **Theme**: Create, edit, and manage custom color themes.
    -   **Content**: Customize content for the landing page, about page, legal pages (T&C, Privacy), and 404 page.
    -   **Expense Categories**: Manage the master list of expense categories and their auto-detection keywords.
    -   **Mail Configuration**: Set up a custom SMTP server for sending transactional emails.
    -   **Data Tools**: Advanced tools like a UID replacement utility for data migration.

## 3. Tech Stack

-   **Framework**: Next.js (App Router)
-   **Backend & Database**: Firebase (Authentication, Firestore)
-   **Styling**: Tailwind CSS
-   **UI Components**: ShadCN UI
-   **Icons**: Lucide React
-   **Forms**: React Hook Form with Zod for validation
-   **Charts**: Recharts
-   **Generative AI**: Genkit (if implemented)
-   **Deployment**: Firebase App Hosting

## 4. Architecture & Data Model

### Frontend Architecture
-   **Next.js App Router**: The project uses the `src/app` directory structure.
    -   **Route Groups**: Pages are organized into logical groups: `(app)` for authenticated users, `(admin)` for the admin panel, `(auth)` for login/signup, and `(info)` for public informational pages.
    -   **Component-Based Structure**: UI is broken down into reusable components located in `src/components`, further organized by feature (e.g., `dashboard`, `expenses`, `groups`).
    -   **Context Providers**: Global state for Authentication (`auth-context.tsx`) and Site Settings (`site-settings-context.tsx`) is managed via React Context.
    -   **Client-Side Data Fetching**: Most data is fetched on the client using functions from `src/lib/mock-data.ts`, which interact directly with Firestore.

### Core Data Model (Firestore)
The database structure revolves around several key collections:

-   **/users/{userId}**: Stores `UserProfile` data (name, email, role, etc.).
-   **/groups/{groupId}**: The central document for a group, containing its name, members (`memberIds`), and creator.
-   **/expenses/{expenseId}**: Represents a single expense, linked to a `groupId`. Contains details like amount, description, payers, and participants.
-   **/settlements/{settlementId}**: Records a direct payment between two users within a group to clear a debt.
-   **/history/{historyId}**: An audit log for all significant actions within a group (e.g., expense created, member added).
-   **/settings/general**: A singleton document storing global site settings like app name, branding, themes, and content for various pages.
-   **/tickets/{ticketId}**: Stores support tickets submitted by users.
-   **/notifications/{notificationId}**: Stores broadcast announcements for all users.

## 5. Key File Summary

-   `src/app/(app)/layout.tsx`: Main shell for the authenticated application, handles auth redirection.
-   `src/app/(admin)/layout.tsx`: Shell for the admin panel, handles admin role verification.
-   `src/contexts/auth-context.tsx`: Manages Firebase Authentication state, user profile data, and provides auth-related functions (login, logout, etc.).
-   `src/contexts/site-settings-context.tsx`: Loads and provides global site settings to all components.
-   `src/lib/mock-data.ts`: The primary data layer for the application. Contains all functions for interacting with Firestore (CRUD operations for users, groups, expenses, etc.).
-   `src/lib/firebase.ts`: Initializes the client-side Firebase app instance.
-   `src/lib/firebase-admin.ts`: Initializes the server-side Firebase Admin SDK for use in API routes.
-   `src/app/api/`: Contains serverless functions for admin actions that require elevated privileges (e.g., sending broadcast emails, running data migrations).
-   `firestore.rules`: Defines the security rules that protect Firestore data from unauthorized access.
-   `src/themes/index.ts` & `src/app/globals.css`: Define the base themes and styling variables for the application.
-   `src/components/layout/app-shell.tsx`: The main layout component for logged-in users, including the sidebar and header.
-   `src/components/layout/admin-shell.tsx`: The main layout component for the admin section.

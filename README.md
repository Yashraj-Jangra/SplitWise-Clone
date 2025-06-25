
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Deploying Firebase Rules

To allow the application to securely access the database, you must deploy the Firestore security rules.

**Prerequisite**: Make sure you have the Firebase CLI installed and are logged in (`firebase login`).

Run the following command from your terminal in the project's root directory:

```bash
firebase deploy --only firestore:rules
```

This will upload the `firestore.rules` file to your Firebase project, fixing any "Missing or insufficient permissions" errors.

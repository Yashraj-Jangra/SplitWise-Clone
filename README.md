
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Deploying Firebase Rules

To allow the application to securely access the database and storage, you must deploy the Firestore and Storage security rules.

**Prerequisite**: Make sure you have the Firebase CLI installed and are logged in (`firebase login`).

Run the following command from your terminal in the project's root directory:

```bash
firebase deploy --only firestore,storage
```

This will upload the `firestore.rules` and `storage.rules` files to your Firebase project, fixing any "Missing or insufficient permissions" errors for both the database and image uploads.

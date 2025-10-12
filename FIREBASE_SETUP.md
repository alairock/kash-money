# Firebase Setup Guide

This application now uses Firebase Firestore as its backend database. Follow these steps to configure Firebase for your app.

## Prerequisites

- A Google account
- Node.js and npm installed

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "kash-money")
4. (Optional) Enable Google Analytics
5. Click "Create project"

## Step 2: Register Your Web App

1. In your Firebase project, click the web icon (`</>`) to add a web app
2. Enter an app nickname (e.g., "Kash Money Web")
3. (Optional) Set up Firebase Hosting
4. Click "Register app"
5. **Copy the Firebase configuration object** - you'll need this in the next step

## Step 3: Enable Firestore Database

1. In the Firebase Console, go to "Build" > "Firestore Database"
2. Click "Create database"
3. Choose "Start in **test mode**" for development (you can change this later)
4. Select a Cloud Firestore location (choose one closest to your users)
5. Click "Enable"

## Step 4: Configure Your App

1. In your project root, create a `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your Firebase configuration values from Step 2:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
   ```

3. **Important:** Add `.env` to your `.gitignore` to keep your Firebase credentials secure:
   ```
   .env
   .env.local
   ```

## Step 5: Set Up Firestore Security Rules

For production, you should secure your database. Go to "Firestore Database" > "Rules" and update:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all users to read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if true; // For now, allow all - add auth later
    }
  }
}
```

**Note:** The current rules allow anyone to read/write. You should add Firebase Authentication later for security.

## Step 6: Migrate Existing Data (Optional)

If you have data in localStorage, you can migrate it to Firebase:

1. Open your app in a browser
2. Open the browser console (F12)
3. Run the migration function:
   ```javascript
   import { migrateFromLocalStorage } from './src/utils/storage';
   await migrateFromLocalStorage();
   ```

This will copy all budgets and recurring expenses from localStorage to Firebase.

## Step 7: Run Your App

```bash
npm install
npm run dev
```

Your app should now be connected to Firebase!

## Firestore Data Structure

The app uses the following Firestore structure:

```
users/
  {userId}/
    budgets/
      {budgetId}/
        - id: string
        - name: string
        - dateCreated: string
        - startingAmount: number
        - lineItems: array

    recurringExpenses/
      {expenseId}/
        - id: string
        - name: string
        - amount: number
        - isAutomatic: boolean
        - link?: string
        - note?: string
```

## Next Steps

### Add Authentication (Completed)

Authentication has been added to the app:

1. ✅ Firebase Authentication enabled in the Firebase Console
2. ✅ Email/Password and Google sign-in methods configured
3. ✅ Updated `src/utils/storage.ts` to use `auth.currentUser?.uid`
4. ✅ Added login, signup, and forgot-password pages

**Authentication Features:**
- Email/password sign-in and sign-up
- Google sign-in
- Password reset functionality
- Protected routes (budgets require authentication)
- User-specific data storage in Firestore

**Pages:**
- `/login` - Sign in with email/password or Google
- `/signup` - Create a new account
- `/forgot-password` - Reset your password

### Update Security Rules

Once you add authentication, update your Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Troubleshooting

### "Firebase: Error (auth/api-key-not-valid)"
- Check that your API key in `.env` is correct
- Make sure you've enabled the required Firebase services

### "Missing or insufficient permissions"
- Check your Firestore security rules
- Make sure you're using the correct user ID

### Data not showing up
- Open the Firebase Console and check the Firestore Database directly
- Check the browser console for errors
- Make sure your `.env` file is being loaded (restart the dev server)

## Support

For more information, see the [Firebase Documentation](https://firebase.google.com/docs/firestore).

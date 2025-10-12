# Quick Start Guide - Firebase Migration

Follow these steps to get your budget app running with Firebase:

## Step 1: Firebase Project Setup (5 minutes)

1. Go to https://console.firebase.google.com/
2. Click "Add project" or "Create a project"
3. Name your project (e.g., "kash-money-app")
4. Disable Google Analytics (optional, can enable later)
5. Click "Create project"

## Step 2: Enable Firestore (2 minutes)

1. In Firebase Console, click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Select "Start in **test mode**" (we'll secure it later)
4. Choose a location close to you
5. Click "Enable"

## Step 3: Get Firebase Config (3 minutes)

1. In Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Click "Project settings"
3. Scroll down to "Your apps"
4. Click the web icon `</>` to add a web app
5. Register app with a nickname (e.g., "Kash Money Web")
6. **Copy the firebaseConfig object** - you'll need these values!

It looks like this:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123"
};
```

## Step 4: Configure Your App (2 minutes)

1. In your project folder, create a `.env` file:
```bash
touch .env
```

2. Add your Firebase config to `.env`:
```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc123
```

Replace the values with YOUR actual Firebase config values!

## Step 5: Install & Run (2 minutes)

```bash
# Install dependencies (if you haven't already)
npm install

# Start the development server
npm run dev
```

## Step 6: Test It Out! (2 minutes)

1. Open http://localhost:5173 in your browser
2. **If you have existing localStorage data**: The app will automatically migrate it to Firebase on first load! You'll see a migration screen for a few seconds.
3. Navigate to "Config" and add a recurring expense
4. Go to "Budgets" and create a new budget
5. Check your Firebase Console → Firestore Database
6. You should see your data there! 🎉

## Automatic Migration

**Good news!** If you have existing data in localStorage, the app will automatically migrate it to Firebase the first time you open it after setting up Firebase. 

The migration:
- ✅ Runs automatically on first load
- ✅ Only runs once (never again)
- ✅ Shows a loading screen while migrating
- ✅ Preserves all your budgets and recurring expenses
- ✅ Keeps the original localStorage data as backup

You don't need to do anything manually!

## Verify Everything Works

✅ Create a budget → Should appear in Firebase Console
✅ Refresh the page → Data should persist
✅ Edit a budget → Changes should save
✅ Delete a budget → Should remove from Firebase
✅ Add recurring expense → Should save to Firebase

## Troubleshooting

**Problem**: "Firebase: Error (auth/api-key-not-valid)"
**Solution**: Double-check your API key in `.env` is correct

**Problem**: Data not showing up
**Solution**:
- Check browser console for errors
- Verify `.env` file exists and has correct values
- Restart dev server after creating `.env`

**Problem**: "Permission denied"
**Solution**:
- Make sure Firestore is in "test mode"
- Check Firestore Rules in Firebase Console

**Problem**: App shows "Loading..." forever
**Solution**:
- Check browser console for errors
- Verify Firebase project is created and Firestore is enabled
- Check network tab for failed requests

## Next Steps

Now that Firebase is working:

1. **Secure Your Database** (Important for production!)
   - See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for security rules

2. **Add User Authentication** (Later)
   - Enable Firebase Auth
   - Add login/signup pages
   - Each user gets their own data

3. **Deploy Your App**
   - Use Firebase Hosting, Vercel, or Netlify
   - Don't forget to set environment variables in your hosting platform!

## Need Help?

- Read the full guide: [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
- Check implementation details: [FIREBASE_IMPLEMENTATION.md](./FIREBASE_IMPLEMENTATION.md)
- Firebase Docs: https://firebase.google.com/docs/firestore

---

**Estimated Total Time: 15-20 minutes** ⏱️

You're all set! Your budget app is now powered by Firebase! 🚀

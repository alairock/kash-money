# Deployment Guide

This app is automatically deployed to Firebase Hosting via GitHub Actions.

## How Deployment Works

- **On every push to `main`**: The app is built and deployed to production
- **On every Pull Request**: A preview deployment is created and a comment is added to the PR with the preview URL

## Required GitHub Secrets

For the deployment to work, you need to add the following secrets to your GitHub repository:

### Step-by-Step: Adding Secrets to GitHub

1. Go to your repository on GitHub: `https://github.com/alairock/kash-money`
2. Click **Settings** (top navigation)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each of the following secrets:

### Required Secrets

| Secret Name | Value | Where to Find |
|------------|-------|---------------|
| `VITE_FIREBASE_API_KEY` | Your Firebase API Key | Firebase Console → Project Settings → General |
| `VITE_FIREBASE_AUTH_DOMAIN` | Your Auth Domain | Firebase Console → Project Settings → General |
| `VITE_FIREBASE_PROJECT_ID` | Your Project ID | Firebase Console → Project Settings → General |
| `VITE_FIREBASE_STORAGE_BUCKET` | Your Storage Bucket | Firebase Console → Project Settings → General |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your Messaging Sender ID | Firebase Console → Project Settings → General |
| `VITE_FIREBASE_APP_ID` | Your App ID | Firebase Console → Project Settings → General |

**Note**: `FIREBASE_SERVICE_ACCOUNT_KASHMONEY_9F3C2` was already created automatically when you ran `firebase init hosting`.

## Getting Your Firebase Config Values

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`kashmoney-9f3c2`)
3. Click the gear icon ⚙️ → **Project settings**
4. Scroll down to **Your apps** section
5. Click on your web app
6. Copy each value from the `firebaseConfig` object

## Testing Locally

To test locally with your environment variables:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase values in `.env`

3. Run the dev server:
   ```bash
   npm run dev
   ```

**Important**: Never commit `.env` to git - it's already in `.gitignore`.

## Manual Deployment

If you need to deploy manually (not recommended, use GitHub Actions instead):

```bash
npm run build
firebase deploy
```

## Viewing Your Deployed App

- **Production**: Your app is deployed to the Firebase Hosting URL (check Firebase Console → Hosting)
- **Preview URLs**: Created automatically for each PR

## Troubleshooting

### "Firebase: Error (auth/invalid-api-key)"

This means the environment variables aren't set correctly:

1. **Local development**: Make sure you have a `.env` file with correct values
2. **GitHub Actions**: Make sure all secrets are added to GitHub (see above)

### Build Fails in GitHub Actions

Check the Actions tab in GitHub to see the error logs. Common issues:
- Missing GitHub Secrets
- TypeScript errors
- Missing dependencies

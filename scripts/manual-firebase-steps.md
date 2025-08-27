# 🔥 Manual Firebase Setup - Step by Step

Since the CLI needs interactive mode, let's do this manually but I'll automate what I can.

## Step 1: Create Firebase Project (Browser)

**I'll open the Firebase Console for you:**

1. **Go to Firebase Console** (opening now...)
2. **Click "Create a project"**
3. **Project name**: `kidqueue-app`
4. **Project ID**: `kidqueue-app-12345` (or whatever Firebase suggests)
5. **Enable Google Analytics**: Yes
6. **Click "Create project"**

## Step 2: Enable Services

**Authentication:**
1. Click "Authentication" → "Get started"
2. Go to "Sign-in method" tab
3. Enable "Google" → Save
4. Enable "Email/Password" → Save

**Firestore Database:**
1. Click "Firestore Database" → "Create database"
2. Choose "Start in test mode"
3. Select location (us-central or closest to you)
4. Click "Done"

**Storage:**
1. Click "Storage" → "Get started"
2. Choose "Start in test mode"
3. Same location as Firestore
4. Click "Done"

**Hosting:**
1. Click "Hosting" → "Get started"
2. Click "Next" through the steps

## Step 3: Get Web App Configuration

1. Click the **Settings gear icon** (Project Settings)
2. Scroll to "Your apps" section
3. Click the **Web app icon** (`</>`)
4. App nickname: `KidQueue Web`
5. ✅ Check "Also set up Firebase Hosting"
6. Click "Register app"
7. **COPY the entire config object**

## Step 4: Paste Config Here

Once you have the config, paste it in the chat and I'll:
- ✅ Set up environment variables
- ✅ Install dependencies 
- ✅ Build the app
- ✅ Deploy to Firebase hosting
- ✅ Give you the live URL

**The config looks like this:**
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "kidqueue-app.firebaseapp.com", 
  projectId: "kidqueue-app",
  storageBucket: "kidqueue-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-ABC123"
};
```

**Ready? Let's start with Step 1!**
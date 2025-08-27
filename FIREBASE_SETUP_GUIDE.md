# 🔥 Firebase Setup Guide for KidQueue

## Step 1: Create Firebase Project (5 minutes)

The Firebase Console should be open in your browser. If not, go to: https://console.firebase.google.com

### 1.1 Create New Project
1. Click **"Create a project"**
2. Project name: `kidqueue-app`
3. Click **"Continue"**
4. Enable Google Analytics: **Yes** (recommended)
5. Choose or create Analytics account
6. Click **"Create project"**
7. Wait for project creation (30-60 seconds)
8. Click **"Continue"**

## Step 2: Set Up Authentication (2 minutes)

1. In your Firebase project dashboard, click **"Authentication"** in the left sidebar
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Enable these providers:
   - **Google**: Click → Enable → Save
   - **Facebook**: Click → Enable → Add App ID/Secret (get from Facebook Developer Console) → Save
   - **Apple**: Click → Enable → Configure (optional for now) → Save

## Step 3: Set Up Firestore Database (2 minutes)

1. Click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll update rules later)
4. Select location: **us-central1** (or closest to your users)
5. Click **"Done"**

## Step 4: Set Up Hosting (1 minute)

1. Click **"Hosting"** in the left sidebar
2. Click **"Get started"**
3. Click **"Next"** (we'll deploy via CLI)
4. Click **"Continue to console"**

## Step 5: Set Up Storage (1 minute)

1. Click **"Storage"** in the left sidebar
2. Click **"Get started"**
3. Choose **"Start in test mode"**
4. Select same location as Firestore
5. Click **"Done"**

## Step 6: Get Web App Configuration (2 minutes)

1. Click the **gear icon** (Project Settings) in the left sidebar
2. Scroll down to **"Your apps"**
3. Click **"Web app"** icon (`</>`)
4. App nickname: `KidQueue Web`
5. Check **"Also set up Firebase Hosting"**
6. Click **"Register app"**
7. **COPY the config object** - it looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "kidqueue-app.firebaseapp.com",
  projectId: "kidqueue-app",
  storageBucket: "kidqueue-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
  measurementId: "G-ABCDEF"
};
```

8. **PASTE THE CONFIG HERE IN CHAT** and I'll configure everything!

## Step 7: Configure Facebook Authentication (Optional)

If you want Facebook login:
1. Go to https://developers.facebook.com/
2. Create new app
3. Add Facebook Login product
4. Get App ID and App Secret
5. Add to Firebase Authentication → Facebook provider

---

## That's it! 

Once you paste your Firebase config here, I'll:
✅ Update environment variables
✅ Install dependencies  
✅ Build and deploy the app
✅ Test everything

**Total time: ~10 minutes**

Just paste your Firebase config object when you get it!
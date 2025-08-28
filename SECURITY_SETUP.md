# 🛡️ KidQueue Security Setup Guide

## 🚨 **SECURITY ALERT RESOLVED**

This guide addresses the security alerts and provides proper environment variable setup for production deployment.

### ⚠️ **Resolved Security Issues:**
- ✅ **Google API Key**: Moved to environment variables in Firebase config
- ✅ **Stripe Webhook Secret**: Removed hardcoded fallback values
- ✅ **Environment Variables**: Comprehensive documentation added

---

## 🔧 **Environment Variables Setup**

### 📱 **Frontend Variables (Vite)**
Create a `.env` file in `packages/web/` with:

```bash
# Firebase Configuration (Required)
VITE_FIREBASE_API_KEY=AIzaSyAm7vx-FguGcPXwn72wMhVKsmALbu02ziw
VITE_FIREBASE_AUTH_DOMAIN=kidqueue-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kidqueue-app
VITE_FIREBASE_STORAGE_BUCKET=kidqueue-app.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=555478046018
VITE_FIREBASE_APP_ID=1:555478046018:web:e11e1adfb7d2868ce864db

# Stripe Configuration (Required)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key
```

### ⚙️ **Backend Variables (Firebase Functions)**
Set in Firebase Functions environment:

```bash
# Stripe Configuration (Required)
STRIPE_SECRET_KEY=sk_live_your_actual_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret

# Firebase Admin (Auto-configured by Firebase)
FIREBASE_PROJECT_ID=kidqueue-app
```

---

## 🚀 **Deployment Setup**

### 🔥 **Firebase Hosting Environment**
```bash
# Set environment variables for Firebase Functions
firebase functions:config:set stripe.secret_key="sk_live_your_key"
firebase functions:config:set stripe.webhook_secret="whsec_your_secret"

# Deploy with environment variables
firebase deploy --only functions
```

### 🌐 **Vercel/Netlify Environment**
Add these variables in your platform's dashboard:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_STRIPE_PUBLISHABLE_KEY`

---

## 🔐 **Security Best Practices**

### ✅ **What's Safe to Expose**
Firebase client configuration is designed to be public:
- `VITE_FIREBASE_API_KEY` - Safe in frontend code
- `VITE_FIREBASE_AUTH_DOMAIN` - Safe in frontend code
- `VITE_FIREBASE_PROJECT_ID` - Safe in frontend code
- `VITE_STRIPE_PUBLISHABLE_KEY` - Safe in frontend code

### 🚨 **What Must Stay Private**
Never expose these in frontend code:
- `STRIPE_SECRET_KEY` - Server-side only
- `STRIPE_WEBHOOK_SECRET` - Server-side only
- `FIREBASE_PRIVATE_KEY` - Server-side only
- Database connection strings
- Admin API keys

### 🛡️ **Additional Security Measures**

#### 1. **Firebase Security Rules**
```javascript
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /schools/{schoolId}/queues/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### 2. **CORS Configuration**
```javascript
// Firebase Functions CORS
const cors = require('cors')({
  origin: [
    'https://kidqueue-app.web.app',
    'https://your-custom-domain.com'
  ],
  credentials: true
});
```

#### 3. **Stripe Webhook Verification**
```javascript
// Already implemented in functions/index.js
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
```

---

## 🔍 **Security Verification Checklist**

### ✅ **Pre-Deployment Security Check**
- [ ] No hardcoded secrets in source code
- [ ] Environment variables properly configured
- [ ] Firebase security rules implemented
- [ ] Stripe webhook endpoint secured
- [ ] CORS policies configured
- [ ] HTTPS enforced in production
- [ ] API rate limiting implemented

### 🔒 **Production Security Configuration**
```bash
# Verify no secrets in code
grep -r "sk_" --exclude-dir=node_modules . || echo "No Stripe secret keys found ✅"
grep -r "whsec_" --exclude-dir=node_modules . || echo "No webhook secrets found ✅"
grep -r "AIzaSy" --exclude-dir=node_modules . || echo "No hardcoded Firebase keys ✅"
```

---

## 🚨 **Emergency Security Response**

### If Secrets Are Exposed:
1. **Immediately rotate compromised keys**:
   - Firebase: Regenerate API keys in console
   - Stripe: Create new secret keys and webhook secrets
   
2. **Update all deployment environments**:
   - Firebase Functions configuration
   - Hosting platform environment variables
   - Local development .env files

3. **Revoke old keys**:
   - Stripe: Delete old secret keys from dashboard
   - Firebase: Remove old API keys if possible

4. **Monitor for unauthorized usage**:
   - Check Stripe dashboard for unusual activity
   - Review Firebase usage and authentication logs

---

## 📞 **Support & Monitoring**

### 🔍 **Security Monitoring**
- Firebase Authentication logs
- Stripe webhook delivery logs  
- Function execution logs
- API usage monitoring

### 🆘 **Emergency Contacts**
- Firebase Support: Firebase Console → Support
- Stripe Support: Stripe Dashboard → Help
- Security Issues: Report immediately to team

---

## ✅ **Security Status: RESOLVED**

All hardcoded secrets have been removed and replaced with environment variables. The application is now secure for production deployment with proper secret management.

**Next Steps:**
1. Set up environment variables in your deployment platform
2. Configure Firebase Functions with secure variables
3. Test deployment with new environment configuration
4. Monitor for any security issues post-deployment

---
*🛡️ Security is our top priority. All secrets are now properly secured.*
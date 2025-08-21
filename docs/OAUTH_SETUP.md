# OAuth Providers Setup Guide

This guide will walk you through setting up Google, Facebook, and Apple OAuth for your KidQueue application.

## 🔑 Google OAuth Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" or select existing project
3. Enter project name: "KidQueue" 
4. Click "Create"

### 2. Enable Google+ API
1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

### 3. Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Configure consent screen if prompted:
   - Application type: Public
   - Application name: "KidQueue"
   - User support email: your email
   - Developer contact: your email
4. Choose "Web application" as application type
5. Name: "KidQueue Web Client"
6. Add authorized redirect URIs:
   ```
   http://localhost:3001/api/auth/google/callback
   https://yourdomain.com/api/auth/google/callback
   ```
7. Click "Create"
8. Copy the Client ID and Client Secret

### 4. Update Environment Variables
```env
GOOGLE_CLIENT_ID="your_google_client_id_here"
GOOGLE_CLIENT_SECRET="your_google_client_secret_here"
```

---

## 📘 Facebook OAuth Setup

### 1. Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "My Apps" → "Create App"
3. Choose "Consumer" as app type
4. Enter app details:
   - App name: "KidQueue"
   - Contact email: your email
5. Click "Create App"

### 2. Add Facebook Login Product
1. In your app dashboard, click "Add Product"
2. Find "Facebook Login" and click "Set Up"
3. Choose "Web" as platform
4. Enter your site URL: `http://localhost:3000` (for development)

### 3. Configure OAuth Settings
1. Go to "Facebook Login" → "Settings"
2. Add Valid OAuth Redirect URIs:
   ```
   http://localhost:3001/api/auth/facebook/callback
   https://yourdomain.com/api/auth/facebook/callback
   ```
3. Save changes

### 4. Get App Credentials
1. Go to "Settings" → "Basic"
2. Copy the App ID and App Secret
3. Add to environment variables:

```env
FACEBOOK_CLIENT_ID="your_facebook_app_id_here"
FACEBOOK_CLIENT_SECRET="your_facebook_app_secret_here"
```

### 5. App Review (For Production)
- For development, your app works with test users
- For production, submit for App Review to allow public access
- Add required permissions: `email`, `public_profile`

---

## 🍎 Apple OAuth Setup

### 1. Apple Developer Account
1. You need an Apple Developer account ($99/year)
2. Go to [Apple Developer Portal](https://developer.apple.com/)
3. Sign in with your Apple ID

### 2. Create App ID
1. Go to "Certificates, Identifiers & Profiles"
2. Click "Identifiers" → "+"
3. Choose "App IDs" → "App" 
4. Configure:
   - Description: "KidQueue App"
   - Bundle ID: `com.kidqueue.app` (explicit)
   - Capabilities: Enable "Sign In with Apple"
5. Click "Continue" → "Register"

### 3. Create Services ID
1. Go to "Identifiers" → "+"
2. Choose "Services IDs"
3. Configure:
   - Description: "KidQueue Web Service"
   - Identifier: `com.kidqueue.web`
4. Enable "Sign In with Apple"
5. Click "Configure" next to "Sign In with Apple"
6. Add domains and redirect URLs:
   - Primary App ID: Select your App ID from step 2
   - Domains: `localhost`, `yourdomain.com`
   - Redirect URLs: 
     ```
     http://localhost:3001/api/auth/apple/callback
     https://yourdomain.com/api/auth/apple/callback
     ```
7. Save and continue

### 4. Create Private Key
1. Go to "Keys" → "+"
2. Key Name: "KidQueue Sign In Key"
3. Enable "Sign In with Apple"
4. Configure and select your App ID
5. Click "Continue" → "Register"
6. Download the `.p8` file (save it securely!)
7. Note the Key ID

### 5. Get Team ID
1. In Apple Developer Portal, your Team ID is displayed in the top right
2. Copy this value

### 6. Update Environment Variables
```env
APPLE_CLIENT_ID="com.kidqueue.web"
APPLE_TEAM_ID="your_team_id_here"
APPLE_KEY_ID="your_key_id_here"
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
your_private_key_content_here
-----END PRIVATE KEY-----"
```

**Important**: For the private key, you can either:
- Paste the entire key content (including headers)
- Or store the key in a file and reference it: `APPLE_PRIVATE_KEY_PATH="/path/to/key.p8"`

---

## 🔒 Security Best Practices

### Environment Variables Security
- Never commit OAuth credentials to Git
- Use different credentials for development and production
- Rotate secrets regularly
- Use Azure Key Vault for production secrets

### Redirect URI Security
- Always use HTTPS in production
- Whitelist specific domains only
- Don't use wildcards in redirect URIs

### OAuth Scopes
- Request only necessary permissions
- Google: `profile`, `email`
- Facebook: `email`, `public_profile`
- Apple: `name`, `email`

---

## 🧪 Testing OAuth Setup

### 1. Test Google OAuth
```bash
# Start your development server
cd packages/api && npm run dev

# Visit in browser:
http://localhost:3001/api/auth/google
```

### 2. Test Facebook OAuth
```bash
# Visit in browser:
http://localhost:3001/api/auth/facebook
```

### 3. Test Apple OAuth
```bash
# Visit in browser:
http://localhost:3001/api/auth/apple
```

### Expected Flow
1. Redirects to provider login page
2. User signs in with their account
3. Redirects back to your app with authorization code
4. App exchanges code for user info
5. Creates/updates user in database
6. Redirects to frontend with JWT token

---

## 🐛 Common Issues & Solutions

### Google OAuth Issues
**"redirect_uri_mismatch"**
- Ensure redirect URI exactly matches what's configured
- Check for trailing slashes, HTTP vs HTTPS
- Verify the OAuth client is for "Web application"

**"access_blocked"**
- App is not verified by Google
- Add test users in OAuth consent screen
- Submit for verification for production use

### Facebook OAuth Issues
**"Can't Load URL"**
- Check Valid OAuth Redirect URIs in Facebook Login settings
- Ensure app is not in development mode for production
- Verify domain ownership

**"App Not Setup"**
- Facebook Login product not added
- OAuth redirect URIs not configured
- App review required for public access

### Apple OAuth Issues
**"invalid_client"**
- Client ID (Services ID) doesn't match
- Private key or Key ID incorrect
- Team ID mismatch

**"invalid_request"**
- Redirect URI not whitelisted
- Domain not verified in Services ID configuration

---

## 📱 Mobile App OAuth Notes

For the mobile app, OAuth works differently:

### Google (Mobile)
- Use Expo's AuthSession
- Configure OAuth client for "iOS" and "Android" types
- Add bundle IDs to Google Cloud Console

### Facebook (Mobile)
- Add iOS and Android platforms in Facebook App
- Configure bundle IDs and package names
- Add Facebook SDK configuration

### Apple (Mobile)
- Use built-in Sign In with Apple capability
- No additional configuration needed beyond App ID setup

---

## 🚀 Production Checklist

Before going live:

- [ ] Create production OAuth apps/projects
- [ ] Use production domains in redirect URIs
- [ ] Enable HTTPS only
- [ ] Submit apps for review where required
- [ ] Configure production environment variables
- [ ] Test OAuth flow in production environment
- [ ] Set up monitoring for OAuth failures

---

## 📞 Getting Help

If you encounter issues:

1. Check the console logs for specific error messages
2. Verify redirect URIs match exactly (including protocols)
3. Ensure OAuth apps are configured for the correct environment
4. Check provider documentation for latest requirements
5. Test with different browsers/incognito mode

**Common OAuth Testing Tools:**
- [OAuth Debugger](https://oauthdebugger.com/)
- Browser Developer Tools Network tab
- Provider-specific debugging tools

---

*Note: OAuth provider interfaces may change over time. Refer to the official documentation for the most up-to-date setup instructions.*
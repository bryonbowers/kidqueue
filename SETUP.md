# KidQueue Setup Guide

Follow these steps to get your KidQueue application running locally and deployed to production.

## 🚀 Quick Start (Local Development)

### 1. **Prerequisites**
- Node.js 18+ installed
- Git installed
- PostgreSQL database (local or cloud)
- GitHub account

### 2. **Clone and Initialize**
```bash
# If you haven't already, push to GitHub first:
git remote add origin https://github.com/YOURUSERNAME/kidqueue.git
git branch -M main
git push -u origin main

# Then clone to other machines:
git clone https://github.com/YOURUSERNAME/kidqueue.git
cd kidqueue
```

### 3. **Install Dependencies**
```bash
npm install
```

### 4. **Configure Environment Variables**
```bash
# Copy example environment file
cp packages/api/.env.example packages/api/.env

# Edit packages/api/.env with your configuration
```

**Required Environment Variables:**
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/kidqueue"

# JWT Secret (generate a random string)
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# Server Configuration
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# OAuth Credentials (see OAuth Setup section below)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
# ... etc
```

### 5. **Set Up Database**
```bash
# Option A: Use the setup script
node scripts/setup-database.js

# Option B: Manual setup
cd packages/api
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

### 6. **Start Development Servers**
```bash
# Terminal 1: API Server
cd packages/api
npm run dev

# Terminal 2: Web App
cd packages/web
npm run dev

# Terminal 3: Mobile App (optional)
cd packages/mobile
npx expo start
```

### 7. **Access Applications**
- **Web App**: http://localhost:3000
- **API**: http://localhost:3001
- **Mobile**: Scan QR code in Expo Go app

---

## 🔐 OAuth Provider Setup

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3001/api/auth/google/callback` (development)
   - `https://yourdomain.com/api/auth/google/callback` (production)

### Facebook OAuth
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create new app
3. Add Facebook Login product
4. Configure OAuth redirect URIs:
   - `http://localhost:3001/api/auth/facebook/callback` (development)
   - `https://yourdomain.com/api/auth/facebook/callback` (production)

### Apple OAuth
1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create App ID and Service ID
3. Generate private key
4. Configure redirect URIs

---

## 📊 Database Options

### Option A: Local PostgreSQL
```bash
# Install PostgreSQL
# macOS: brew install postgresql
# Windows: Download from postgresql.org
# Ubuntu: sudo apt install postgresql

# Create database
createdb kidqueue

# Update DATABASE_URL in .env
DATABASE_URL="postgresql://username:password@localhost:5432/kidqueue"
```

### Option B: ElephantSQL (Free Cloud)
1. Visit [ElephantSQL.com](https://elephantsql.com)
2. Create free account
3. Create new database instance
4. Copy connection URL to .env

### Option C: Azure Database for PostgreSQL
```bash
az postgres flexible-server create \
  --resource-group kidqueue-rg \
  --name kidqueue-db \
  --location eastus \
  --admin-user kidqueueadmin \
  --admin-password YourSecurePassword123!
```

---

## ☁️ Azure Deployment

### 1. **Create Azure Resources**

**Static Web App (Frontend):**
```bash
az staticwebapp create \
  --name kidqueue-web \
  --resource-group kidqueue-rg \
  --source https://github.com/YOURUSERNAME/kidqueue \
  --location eastus2 \
  --branch main \
  --app-location "packages/web" \
  --output-location "dist"
```

**App Service (Backend):**
```bash
az appservice plan create \
  --name kidqueue-plan \
  --resource-group kidqueue-rg \
  --sku B1 \
  --is-linux

az webapp create \
  --resource-group kidqueue-rg \
  --plan kidqueue-plan \
  --name kidqueue-api \
  --runtime "NODE|18-lts"
```

### 2. **Configure GitHub Secrets**

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- `AZURE_STATIC_WEB_APPS_API_TOKEN`: From Azure Static Web App deployment token
- `AZURE_API_APP_NAME`: Your Azure App Service name
- `AZURE_API_PUBLISH_PROFILE`: Download from Azure App Service
- `EXPO_TOKEN`: Expo account token for mobile builds

### 3. **Environment Variables in Azure**

Configure these in Azure App Service → Configuration:

```
DATABASE_URL=your-azure-postgresql-connection-string
JWT_SECRET=your-production-jwt-secret
CLIENT_URL=https://your-static-web-app-url
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
# ... other OAuth credentials
```

---

## 📱 Mobile App Deployment

### 1. **Set Up Expo Account**
```bash
npm install -g @expo/cli eas-cli
npx expo login
```

### 2. **Configure EAS**
```bash
cd packages/mobile
eas build:configure
```

### 3. **Build for App Stores**
```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

### 4. **Submit to App Stores**
```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

---

## 🧪 Testing

### Run Tests
```bash
# All tests
npm run test

# Specific package
cd packages/web && npm run test
cd packages/api && npm run test
```

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

---

## 🛠️ Development Workflow

### 1. **Feature Development**
```bash
git checkout -b feature/your-feature-name
# Make changes
git add .
git commit -m "Add your feature"
git push origin feature/your-feature-name
# Create Pull Request on GitHub
```

### 2. **Database Changes**
```bash
cd packages/api
# Edit prisma/schema.prisma
npx prisma migrate dev --name describe-your-change
npx prisma generate
```

### 3. **Deployment**
- Push to `main` branch triggers automatic deployment
- Monitor GitHub Actions for deployment status
- Check Azure resources for successful deployment

---

## 🔧 Troubleshooting

### Common Issues

**Database Connection Errors:**
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure database exists and credentials are correct

**OAuth Errors:**
- Verify client IDs and secrets
- Check redirect URIs match exactly
- Ensure OAuth apps are properly configured

**Build Errors:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run typecheck`
- Verify environment variables are set

**Deployment Issues:**
- Check GitHub Actions logs
- Verify Azure resource configuration
- Ensure secrets are properly set

### Getting Help

1. Check the [Issues](https://github.com/YOURUSERNAME/kidqueue/issues) page
2. Review application logs in Azure
3. Use browser developer tools for frontend issues
4. Check mobile app logs in Expo

---

## 📈 Next Steps

After successful setup:

1. **Customize Branding**: Update logos, colors, and app names
2. **Configure Schools**: Add your school(s) to the database
3. **User Training**: Train teachers and staff on QR scanning
4. **Parent Onboarding**: Guide parents through account setup
5. **Monitor Usage**: Use Azure Application Insights for monitoring

---

## 🔄 Updates and Maintenance

### Updating Dependencies
```bash
npm update
cd packages/web && npm update
cd packages/api && npm update
cd packages/mobile && npm update
```

### Database Migrations
```bash
cd packages/api
npx prisma migrate deploy  # For production
```

### Security Updates
- Regularly update OAuth credentials
- Monitor for security advisories
- Keep dependencies up to date

---

**Need Help?** Open an issue on GitHub or contact the development team.
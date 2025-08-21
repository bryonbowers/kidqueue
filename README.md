# KidQueue - School Pickup Management System

A comprehensive solution for managing school pickup queues using QR code technology, built with modern web and mobile technologies.

## 🎯 Features

### For Parents
- **Student Management**: Add and manage multiple students
- **Vehicle Registration**: Register vehicles and generate QR code stickers
- **QR Code Generation**: Printable QR codes for vehicles and students
- **Real-time Queue Status**: Monitor pickup queue position in real-time
- **Mobile App**: iOS and Android app for queue management
- **Multi-Authentication**: Login with Google, Facebook, or Apple

### For Teachers
- **QR Code Scanning**: Scan student or vehicle QR codes via mobile app
- **Queue Management**: Add students to queue, mark as called/picked up
- **Real-time Dashboard**: Monitor current queue status
- **Pickup History**: View completed pickups and statistics
- **Multi-School Support**: Support for multiple schools

### Technical Features
- **Real-time Updates**: WebSocket-based real-time queue updates
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Secure Authentication**: OAuth2 with Google, Facebook, and Apple
- **Cloud Deployment**: Azure-hosted with CI/CD pipelines
- **Cross-Platform Mobile**: React Native app for iOS and Android

## 🏗️ Architecture

This is a monorepo containing:

- **`packages/web`**: React web application with Material-UI
- **`packages/mobile`**: React Native mobile app with Expo
- **`packages/api`**: Node.js Express API server
- **`packages/shared`**: Shared TypeScript types and utilities

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Azure account (for deployment)
- Google/Facebook/Apple OAuth credentials

### Local Development

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/yourusername/kidqueue.git
   cd kidqueue
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp packages/api/.env.example packages/api/.env
   # Edit packages/api/.env with your configuration
   ```

3. **Set up database**
   ```bash
   cd packages/api
   npx prisma migrate dev
   npx prisma generate
   ```

4. **Start development servers**
   ```bash
   # Terminal 1 - API server
   cd packages/api
   npm run dev

   # Terminal 2 - Web app
   cd packages/web
   npm run dev

   # Terminal 3 - Mobile app (optional)
   cd packages/mobile
   npx expo start
   ```

5. **Access the applications**
   - Web app: http://localhost:3000
   - API: http://localhost:3001
   - Mobile app: Scan QR code in Expo Go app

## 📱 Mobile App Setup

The mobile app uses Expo for cross-platform development:

1. **Install Expo CLI**
   ```bash
   npm install -g @expo/cli
   ```

2. **Start the mobile app**
   ```bash
   cd packages/mobile
   npx expo start
   ```

3. **Test on device**
   - Install Expo Go app on your phone
   - Scan QR code from terminal

## 🌐 Deployment

### Azure Web App (API)

1. Create Azure App Service
2. Set up PostgreSQL database
3. Configure GitHub Actions secrets:
   - `AZURE_API_APP_NAME`
   - `AZURE_API_PUBLISH_PROFILE`

### Azure Static Web Apps (Frontend)

1. Create Azure Static Web App
2. Configure GitHub Actions secrets:
   - `AZURE_STATIC_WEB_APPS_API_TOKEN`

### Mobile App Store Deployment

1. **iOS App Store**
   ```bash
   cd packages/mobile
   eas build --platform ios --profile production
   eas submit --platform ios
   ```

2. **Google Play Store**
   ```bash
   cd packages/mobile
   eas build --platform android --profile production
   eas submit --platform android
   ```

## 🔧 Configuration

### Environment Variables

#### API (`packages/api/.env`)
```env
DATABASE_URL="postgresql://username:password@localhost:5432/kidqueue"
JWT_SECRET="your-super-secret-jwt-key"
CLIENT_URL="http://localhost:3000"

# OAuth Credentials
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
FACEBOOK_CLIENT_ID="your-facebook-app-id"
FACEBOOK_CLIENT_SECRET="your-facebook-app-secret"
APPLE_CLIENT_ID="your-apple-service-id"
APPLE_TEAM_ID="your-apple-team-id"
APPLE_KEY_ID="your-apple-key-id"
APPLE_PRIVATE_KEY="your-apple-private-key"
```

#### Web App
- Set `VITE_API_URL` for production builds

#### Mobile App
- Configure `EXPO_PUBLIC_API_URL` in app.json extras

### GitHub Actions Secrets

Required secrets for CI/CD:

- `AZURE_API_APP_NAME`: Azure App Service name
- `AZURE_API_PUBLISH_PROFILE`: Azure App Service publish profile
- `AZURE_STATIC_WEB_APPS_API_TOKEN`: Azure Static Web Apps token
- `EXPO_TOKEN`: Expo account token for mobile builds

## 📊 Database Schema

The system uses PostgreSQL with Prisma ORM:

- **Users**: Parent/teacher accounts with OAuth authentication
- **Schools**: School entities for multi-tenant support
- **Students**: Student records linked to parents and schools
- **Vehicles**: Vehicle registration with QR codes
- **QueueEntries**: Active and historical pickup queue records

## 🔐 Security Features

- **OAuth2 Authentication**: Secure login with major providers
- **JWT Tokens**: Stateless authentication for API access
- **Role-based Access Control**: Parent, teacher, and admin roles
- **CORS Protection**: Configured for cross-origin requests
- **Input Validation**: Zod schema validation on all inputs
- **SQL Injection Protection**: Prisma ORM prevents SQL injection

## 🚦 Usage Flow

### Parent Workflow
1. Sign up with Google/Facebook/Apple
2. Add students and assign to schools
3. Register vehicles and print QR code stickers
4. Monitor queue status via web/mobile app
5. Receive notifications when student is called

### Teacher Workflow
1. Login with teacher account
2. Open mobile app QR scanner
3. Scan parent vehicle stickers or student QR codes
4. Students automatically added to pickup queue
5. Scan again to mark as called/picked up

## 🧪 Testing

```bash
# Run all tests
npm run test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## 📈 Performance Considerations

- **WebSocket Connections**: Real-time updates with Socket.io
- **Database Indexing**: Optimized queries for large datasets
- **Caching**: Redis caching for frequently accessed data
- **CDN**: Azure CDN for static assets
- **Image Optimization**: QR codes generated and cached

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: GitHub Issues for bug reports and feature requests
- **Documentation**: Comprehensive API documentation available
- **Community**: Discord server for community support

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern React with hooks and context
- **Material-UI 5**: Clean, accessible UI components
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **React Query**: Data fetching and caching

### Mobile
- **React Native**: Cross-platform mobile development
- **Expo**: Managed React Native workflow
- **React Native Paper**: Material Design components
- **Expo Camera**: QR code scanning functionality

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web application framework
- **TypeScript**: Type-safe server development
- **Prisma**: Modern database toolkit
- **Socket.io**: Real-time WebSocket communication
- **Passport**: Authentication middleware

### Database & Infrastructure
- **PostgreSQL**: Relational database
- **Azure App Service**: API hosting
- **Azure Static Web Apps**: Frontend hosting
- **GitHub Actions**: CI/CD pipelines
- **Expo Application Services**: Mobile app building

---

Built with ❤️ for safer and more efficient school pickup management.
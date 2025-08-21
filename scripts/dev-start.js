#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting KidQueue Development Environment...\n');

// Check if environment file exists
const fs = require('fs');
const envPath = path.join(__dirname, '..', 'packages', 'api', '.env');

if (!fs.existsSync(envPath)) {
  console.log('❌ Environment file not found!');
  console.log('📋 Please copy packages/api/.env.example to packages/api/.env');
  console.log('🔑 And configure your OAuth credentials');
  console.log('\n📖 See docs/OAUTH_SETUP.md for detailed instructions');
  process.exit(1);
}

console.log('✅ Environment file found');

// Start API server
console.log('🔧 Starting API server...');
const apiServer = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, '..', 'packages', 'api'),
  stdio: 'inherit'
});

// Start web server
setTimeout(() => {
  console.log('🌐 Starting web application...');
  const webServer = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '..', 'packages', 'web'),
    stdio: 'inherit'
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development servers...');
    apiServer.kill();
    webServer.kill();
    process.exit(0);
  });
}, 3000);

console.log('\n📱 To start mobile app:');
console.log('  cd packages/mobile');
console.log('  npx expo start');
console.log('\n🌍 Access your app at:');
console.log('  Web: http://localhost:3000');
console.log('  API: http://localhost:3001');
console.log('\n⏹️  Press Ctrl+C to stop all servers');
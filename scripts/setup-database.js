#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🗄️ Setting up KidQueue Database...\n');

const apiPath = path.join(__dirname, '..', 'packages', 'api');

try {
  console.log('📦 Installing API dependencies...');
  execSync('npm install', { cwd: apiPath, stdio: 'inherit' });

  console.log('\n🔄 Generating Prisma client...');
  execSync('npx prisma generate', { cwd: apiPath, stdio: 'inherit' });

  console.log('\n🏗️ Running database migrations...');
  execSync('npx prisma migrate dev --name init', { cwd: apiPath, stdio: 'inherit' });

  console.log('\n🌱 Seeding database with initial data...');
  execSync('npx prisma db seed', { cwd: apiPath, stdio: 'inherit' });

  console.log('\n✅ Database setup complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Configure OAuth providers');
  console.log('2. Start the development servers');
  console.log('3. Test the application');

} catch (error) {
  console.error('\n❌ Database setup failed:', error.message);
  console.log('\n🔧 Troubleshooting:');
  console.log('1. Make sure PostgreSQL is running');
  console.log('2. Check your DATABASE_URL in packages/api/.env');
  console.log('3. Verify database credentials');
  process.exit(1);
}
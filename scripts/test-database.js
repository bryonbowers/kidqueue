#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Testing Database Connection...\n');

const apiPath = path.join(__dirname, '..', 'packages', 'api');

try {
  console.log('📦 Installing dependencies...');
  execSync('npm install', { cwd: apiPath, stdio: 'inherit' });

  console.log('\n🔄 Generating Prisma client...');
  execSync('npx prisma generate', { cwd: apiPath, stdio: 'inherit' });

  console.log('\n🔗 Testing database connection...');
  execSync('npx prisma db push --accept-data-loss', { cwd: apiPath, stdio: 'inherit' });

  console.log('\n🌱 Seeding with sample data...');
  execSync('npx prisma db seed', { cwd: apiPath, stdio: 'inherit' });

  console.log('\n✅ Database setup complete!');
  console.log('🎯 Ready to test your app with:');
  console.log('   npm run dev');

} catch (error) {
  console.error('\n❌ Database setup failed:', error.message);
  console.log('\n🔧 Check your DATABASE_URL in packages/api/.env');
}
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🗄️ Quick Database Setup for KidQueue\n');

const envPath = path.join(__dirname, '..', 'packages', 'api', '.env');

console.log('Choose your database option:\n');
console.log('1. 🚀 ElephantSQL (Free cloud PostgreSQL - RECOMMENDED)');
console.log('2. 🏠 Local PostgreSQL (if you have it installed)');
console.log('3. 🧪 SQLite (for quick testing)');

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('\nEnter your choice (1, 2, or 3): ', (choice) => {
  switch(choice) {
    case '1':
      console.log('\n🌐 Setting up ElephantSQL:');
      console.log('1. Go to: https://www.elephantsql.com/');
      console.log('2. Sign up for free account');
      console.log('3. Create new instance (Tiny Turtle plan - FREE)');
      console.log('4. Copy the database URL from the Details page');
      console.log('5. Update your .env file with the URL');
      console.log('\nExample URL format:');
      console.log('postgresql://username:password@server:5432/database');
      break;
      
    case '2':
      console.log('\n🏠 Local PostgreSQL setup:');
      console.log('1. Make sure PostgreSQL is installed and running');
      console.log('2. Create database: createdb kidqueue');
      console.log('3. Update DATABASE_URL in .env file:');
      console.log('   DATABASE_URL="postgresql://username:password@localhost:5432/kidqueue"');
      break;
      
    case '3':
      console.log('\n🧪 Setting up SQLite for testing...');
      const envContent = fs.readFileSync(envPath, 'utf8');
      const updatedContent = envContent.replace(
        /DATABASE_URL=".*"/,
        'DATABASE_URL="file:./dev.db"'
      );
      fs.writeFileSync(envPath, updatedContent);
      console.log('✅ Updated .env file to use SQLite');
      console.log('📝 Note: SQLite is only for testing - use PostgreSQL for production');
      break;
      
    default:
      console.log('❌ Invalid choice. Please run the script again.');
  }
  
  console.log('\n📋 After setting up database, run:');
  console.log('  npm run setup     # Set up database schema');
  console.log('  npm run dev       # Start development servers');
  
  readline.close();
});
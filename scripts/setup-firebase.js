#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔥 Setting up Firebase for KidQueue\n');

console.log('📋 Firebase Setup Steps:');
console.log('1. Login to Firebase');
console.log('2. Create new Firebase project');
console.log('3. Enable Authentication');
console.log('4. Enable Firestore');
console.log('5. Enable Hosting');
console.log('6. Configure project locally');

console.log('\n🚀 Starting Firebase setup...');

try {
  // Login to Firebase
  console.log('\n🔐 Logging into Firebase...');
  execSync('firebase login', { stdio: 'inherit' });

  // Initialize Firebase project
  console.log('\n🆕 Initializing Firebase project...');
  execSync('firebase init', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  console.log('\n✅ Firebase setup complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Enable Authentication providers in Firebase Console');
  console.log('2. Set up Firestore security rules');
  console.log('3. Update environment variables');
  console.log('4. Deploy to Firebase hosting');

} catch (error) {
  console.error('\n❌ Firebase setup failed:', error.message);
  console.log('\n🔧 Manual setup instructions:');
  console.log('1. Run: firebase login');
  console.log('2. Run: firebase init');
  console.log('3. Select: Firestore, Functions, Hosting, Storage');
  console.log('4. Create new project or use existing');
}
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log('🔥 Firebase Auto-Setup for KidQueue\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to check if user is logged in
function checkFirebaseLogin() {
  try {
    const result = execSync('firebase projects:list', { encoding: 'utf8' });
    return result.includes('Project Display Name');
  } catch (error) {
    return false;
  }
}

// Function to create Firebase project
async function createFirebaseProject() {
  return new Promise((resolve) => {
    rl.question('Enter your desired project ID (e.g., kidqueue-app-12345): ', (projectId) => {
      try {
        console.log(`\n🆕 Creating Firebase project: ${projectId}`);
        execSync(`firebase projects:create ${projectId} --display-name "KidQueue App"`, { stdio: 'inherit' });
        
        console.log('\n✅ Project created successfully!');
        resolve(projectId);
      } catch (error) {
        console.log('\n⚠️  Project creation failed. You can create it manually in Firebase Console.');
        rl.question('Enter your existing project ID: ', (existingId) => {
          resolve(existingId);
        });
      }
    });
  });
}

// Function to set up Firebase services
function setupFirebaseServices(projectId) {
  try {
    console.log('\n🔧 Setting up Firebase services...');
    
    // Use the project
    execSync(`firebase use ${projectId}`, { stdio: 'inherit' });
    
    // Deploy Firestore rules and indexes
    execSync('firebase deploy --only firestore:rules,firestore:indexes', { stdio: 'inherit' });
    
    // Deploy storage rules
    execSync('firebase deploy --only storage', { stdio: 'inherit' });
    
    console.log('\n✅ Firebase services configured!');
    return true;
  } catch (error) {
    console.log('\n⚠️  Service setup failed:', error.message);
    return false;
  }
}

// Function to get Firebase config
function getFirebaseConfig(projectId) {
  try {
    console.log('\n📱 Setting up web app...');
    
    // This would create a web app, but requires manual steps in console
    console.log(`\n📋 Manual steps needed:`);
    console.log(`1. Go to: https://console.firebase.google.com/project/${projectId}`);
    console.log(`2. Click Project Settings (gear icon)`);
    console.log(`3. Scroll to "Your apps" and click Web app icon`);
    console.log(`4. Name: "KidQueue Web"`);
    console.log(`5. Copy the config object and paste it here`);
    
    return new Promise((resolve) => {
      console.log('\n🔧 Paste your Firebase config object:');
      console.log('(It should start with: const firebaseConfig = {)');
      
      let configInput = '';
      rl.on('line', (line) => {
        configInput += line + '\n';
        if (line.includes('};')) {
          resolve(configInput);
        }
      });
    });
  } catch (error) {
    console.error('Config retrieval failed:', error.message);
    return null;
  }
}

// Main setup function
async function main() {
  try {
    // Check if logged in
    if (!checkFirebaseLogin()) {
      console.log('🔐 Please login to Firebase first:');
      console.log('   Open a new terminal and run: firebase login');
      console.log('   Then come back and run this script again.');
      process.exit(1);
    }
    
    console.log('✅ Firebase login detected!');
    
    // Create or select project
    const projectId = await createFirebaseProject();
    
    // Set up services
    setupFirebaseServices(projectId);
    
    // Get config
    const config = await getFirebaseConfig(projectId);
    
    if (config) {
      // Parse and save config
      console.log('\n💾 Saving Firebase configuration...');
      
      // Extract config values (this is a simplified parser)
      const envContent = `# Firebase Configuration
VITE_FIREBASE_API_KEY=${extractValue(config, 'apiKey')}
VITE_FIREBASE_AUTH_DOMAIN=${extractValue(config, 'authDomain')}
VITE_FIREBASE_PROJECT_ID=${extractValue(config, 'projectId')}
VITE_FIREBASE_STORAGE_BUCKET=${extractValue(config, 'storageBucket')}
VITE_FIREBASE_MESSAGING_SENDER_ID=${extractValue(config, 'messagingSenderId')}
VITE_FIREBASE_APP_ID=${extractValue(config, 'appId')}
VITE_FIREBASE_MEASUREMENT_ID=${extractValue(config, 'measurementId')}`;

      fs.writeFileSync(path.join(__dirname, '..', 'packages', 'web', '.env'), envContent);
      
      console.log('\n🎉 Firebase setup complete!');
      console.log('\n📋 Next steps:');
      console.log('1. Enable Authentication providers in Firebase Console');
      console.log('2. Run: npm run dev (to test locally)');
      console.log('3. Run: firebase deploy (to deploy to hosting)');
    }
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

// Helper function to extract config values
function extractValue(config, key) {
  const regex = new RegExp(`${key}:\\s*["']([^"']+)["']`);
  const match = config.match(regex);
  return match ? match[1] : '';
}

// Run the setup
main();
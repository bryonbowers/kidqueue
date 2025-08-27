#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔥 Guided Firebase Setup - Let\'s do this together!\n');

function waitForEnter(message) {
  return new Promise((resolve) => {
    rl.question(`${message}\nPress Enter when ready...`, () => {
      resolve();
    });
  });
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  try {
    console.log('📋 Step 1: Login to Firebase CLI');
    await waitForEnter('I\'ll open Firebase login. Complete it in your browser.');
    
    // Try to login via CLI
    try {
      execSync('firebase login --interactive', { stdio: 'inherit' });
      console.log('✅ Firebase login successful!');
    } catch (error) {
      console.log('⚠️ CLI login failed, but that\'s okay if you\'re already logged in browser.');
    }

    console.log('\n📋 Step 2: Create Firebase Project');
    const projectId = await askQuestion('Enter a unique project ID (e.g., kidqueue-app-12345): ');
    
    try {
      console.log(`Creating project: ${projectId}`);
      execSync(`firebase projects:create ${projectId} --display-name "KidQueue App"`, { stdio: 'inherit' });
      console.log('✅ Project created!');
    } catch (error) {
      console.log('⚠️ Project might already exist or CLI needs browser login.');
      console.log(`Please create project manually: https://console.firebase.google.com`);
      await waitForEnter('Create project named "kidqueue-app" in Firebase Console');
    }

    console.log('\n📋 Step 3: Initialize Firebase in this directory');
    try {
      execSync(`firebase use ${projectId}`, { stdio: 'inherit' });
      console.log('✅ Project selected!');
    } catch (error) {
      console.log('Using manual project selection...');
      execSync('firebase use --add', { stdio: 'inherit' });
    }

    console.log('\n📋 Step 4: Setting up services...');
    console.log('Go to Firebase Console and enable:');
    console.log('1. Authentication → Sign-in method → Google & Facebook');
    console.log('2. Firestore Database → Create database (test mode)');
    console.log('3. Storage → Get started');
    console.log('4. Hosting → Get started');
    
    await waitForEnter('Complete these steps in Firebase Console');

    console.log('\n📋 Step 5: Deploy rules and configuration');
    try {
      execSync('firebase deploy --only firestore:rules,firestore:indexes,storage', { stdio: 'inherit' });
      console.log('✅ Rules deployed!');
    } catch (error) {
      console.log('⚠️ Rules deployment failed, continuing...');
    }

    console.log('\n📋 Step 6: Get Web App Config');
    console.log('In Firebase Console:');
    console.log('1. Click Project Settings (gear icon)');
    console.log('2. Scroll to "Your apps" → Add Web App');
    console.log('3. Name: "KidQueue Web"');
    console.log('4. Enable hosting');
    console.log('5. Copy the config object');

    const config = await askQuestion('\nPaste your Firebase config object here:\n');

    // Parse and save config
    console.log('\n💾 Saving configuration...');
    const projectMatch = config.match(/projectId:\s*["']([^"']+)["']/);
    const actualProjectId = projectMatch ? projectMatch[1] : projectId;

    // Create environment file
    const envContent = createEnvFromConfig(config);
    fs.writeFileSync(path.join(__dirname, '..', 'packages', 'web', '.env'), envContent);
    console.log('✅ Environment file created!');

    console.log('\n📋 Step 7: Install dependencies and build');
    execSync('npm install', { 
      cwd: path.join(__dirname, '..', 'packages', 'web'),
      stdio: 'inherit' 
    });

    execSync('npm run build', { 
      cwd: path.join(__dirname, '..', 'packages', 'web'),
      stdio: 'inherit' 
    });

    console.log('\n📋 Step 8: Deploy to Firebase Hosting');
    try {
      execSync('firebase deploy --only hosting', { stdio: 'inherit' });
      console.log('\n🎉 Deployment successful!');
      console.log(`🌐 Your app is live at: https://${actualProjectId}.web.app`);
      console.log(`🌐 Custom domain: https://${actualProjectId}.firebaseapp.com`);
    } catch (error) {
      console.log('⚠️ Deployment failed:', error.message);
    }

    console.log('\n✅ Firebase setup complete!');
    console.log('\n📱 Next steps:');
    console.log('1. Test your app in the browser');
    console.log('2. Set up Facebook authentication (optional)');
    console.log('3. Customize your app');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

function createEnvFromConfig(config) {
  const apiKey = config.match(/apiKey:\s*["']([^"']+)["']/)?.[1] || '';
  const authDomain = config.match(/authDomain:\s*["']([^"']+)["']/)?.[1] || '';
  const projectId = config.match(/projectId:\s*["']([^"']+)["']/)?.[1] || '';
  const storageBucket = config.match(/storageBucket:\s*["']([^"']+)["']/)?.[1] || '';
  const messagingSenderId = config.match(/messagingSenderId:\s*["']([^"']+)["']/)?.[1] || '';
  const appId = config.match(/appId:\s*["']([^"']+)["']/)?.[1] || '';
  const measurementId = config.match(/measurementId:\s*["']([^"']+)["']/)?.[1] || '';

  return `# Firebase Configuration
VITE_FIREBASE_API_KEY=${apiKey}
VITE_FIREBASE_AUTH_DOMAIN=${authDomain}
VITE_FIREBASE_PROJECT_ID=${projectId}
VITE_FIREBASE_STORAGE_BUCKET=${storageBucket}
VITE_FIREBASE_MESSAGING_SENDER_ID=${messagingSenderId}
VITE_FIREBASE_APP_ID=${appId}
VITE_FIREBASE_MEASUREMENT_ID=${measurementId}`;
}

main();
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Function to create environment file from Firebase config
function createEnvFromConfig(config) {
  const envPath = path.join(__dirname, '..', 'packages', 'web', '.env');
  
  // Parse the Firebase config
  const apiKey = config.match(/apiKey:\s*["']([^"']+)["']/)?.[1] || '';
  const authDomain = config.match(/authDomain:\s*["']([^"']+)["']/)?.[1] || '';
  const projectId = config.match(/projectId:\s*["']([^"']+)["']/)?.[1] || '';
  const storageBucket = config.match(/storageBucket:\s*["']([^"']+)["']/)?.[1] || '';
  const messagingSenderId = config.match(/messagingSenderId:\s*["']([^"']+)["']/)?.[1] || '';
  const appId = config.match(/appId:\s*["']([^"']+)["']/)?.[1] || '';
  const measurementId = config.match(/measurementId:\s*["']([^"']+)["']/)?.[1] || '';

  const envContent = `# Firebase Configuration
VITE_FIREBASE_API_KEY=${apiKey}
VITE_FIREBASE_AUTH_DOMAIN=${authDomain}
VITE_FIREBASE_PROJECT_ID=${projectId}
VITE_FIREBASE_STORAGE_BUCKET=${storageBucket}
VITE_FIREBASE_MESSAGING_SENDER_ID=${messagingSenderId}
VITE_FIREBASE_APP_ID=${appId}
VITE_FIREBASE_MEASUREMENT_ID=${measurementId}`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Environment file created!');
  
  return projectId;
}

// Function to deploy to Firebase
function deployToFirebase(projectId) {
  try {
    console.log('\n🏗️ Building application...');
    execSync('npm run build', { 
      cwd: path.join(__dirname, '..', 'packages', 'web'),
      stdio: 'inherit' 
    });
    
    console.log('\n🚀 Deploying to Firebase...');
    execSync(`firebase use ${projectId}`, { stdio: 'inherit' });
    execSync('firebase deploy', { stdio: 'inherit' });
    
    console.log('\n🎉 Deployment complete!');
    console.log(`🌐 Your app is live at: https://${projectId}.web.app`);
    
  } catch (error) {
    console.error('Deployment failed:', error.message);
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node finalize-firebase.js "your-firebase-config"');
    console.log('\nExample:');
    console.log('node finalize-firebase.js "const firebaseConfig = { apiKey: \'abc\', ... };"');
    return;
  }
  
  const firebaseConfig = args[0];
  console.log('🔥 Finalizing Firebase setup...');
  
  const projectId = createEnvFromConfig(firebaseConfig);
  
  if (projectId) {
    deployToFirebase(projectId);
  } else {
    console.error('❌ Failed to parse Firebase config');
  }
}

if (require.main === module) {
  main();
}

module.exports = { createEnvFromConfig, deployToFirebase };
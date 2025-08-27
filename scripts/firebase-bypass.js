#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔥 Bypassing Firebase interactive setup...\n');

// Create Firebase configuration files directly
const firebaseConfig = {
  "projects": {
    "default": "kidqueue-app"
  }
};

const firebaseJson = {
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "packages/web/dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "storage": {
    "rules": "storage.rules"
  }
};

try {
  // Write configuration files
  fs.writeFileSync('.firebaserc', JSON.stringify(firebaseConfig, null, 2));
  fs.writeFileSync('firebase.json', JSON.stringify(firebaseJson, null, 2));
  
  console.log('✅ Firebase configuration files created');
  
  // Try to create project via API
  console.log('🔧 Attempting to create Firebase project...');
  
  // Since we can't fully automate without authentication, 
  // let's prepare everything and give clear manual steps
  console.log('\n📋 Manual steps needed:');
  console.log('1. Go to: https://console.firebase.google.com/');
  console.log('2. Create project: "kidqueue-app"');
  console.log('3. Enable: Authentication, Firestore, Storage, Hosting');
  console.log('4. Get web app config and paste it here');
  
  console.log('\n✅ Firebase config files ready for deployment');
  
} catch (error) {
  console.error('❌ Setup failed:', error.message);
}
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔗 GitHub Setup for KidQueue\n');

console.log('📋 Follow these steps:');
console.log('1. Go to https://github.com/new');
console.log('2. Repository name: kidqueue');
console.log('3. Description: School pickup queue management system with QR codes');
console.log('4. Choose Public or Private');
console.log('5. DO NOT initialize with README, .gitignore, or license');
console.log('6. Click "Create repository"');
console.log('\n⏸️  Press Enter when you\'ve created the repository...');

// Wait for user input
require('child_process').execSync('pause', { stdio: 'inherit' });

console.log('\n📝 What\'s your GitHub username?');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('GitHub username: ', (username) => {
  const repoUrl = `https://github.com/${username}/kidqueue.git`;
  
  console.log(`\n🚀 Setting up remote: ${repoUrl}`);
  
  try {
    // Add remote
    execSync(`git remote add origin ${repoUrl}`, { stdio: 'inherit' });
    
    // Rename branch to main
    execSync('git branch -M main', { stdio: 'inherit' });
    
    // Push to GitHub
    console.log('\n📤 Pushing to GitHub...');
    execSync('git push -u origin main', { stdio: 'inherit' });
    
    console.log('\n✅ Successfully pushed to GitHub!');
    console.log(`🌐 Your repository: https://github.com/${username}/kidqueue`);
    
    // Create .env file from example
    const envExample = path.join(__dirname, '..', 'packages', 'api', '.env.example');
    const envFile = path.join(__dirname, '..', 'packages', 'api', '.env');
    
    if (!fs.existsSync(envFile)) {
      fs.copyFileSync(envExample, envFile);
      console.log('\n📝 Created packages/api/.env file');
      console.log('🔧 Next: Edit this file with your OAuth credentials');
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Set up Google OAuth (5-10 minutes)');
    console.log('2. Configure environment variables');
    console.log('3. Set up database');
    console.log('4. Test locally');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('already exists')) {
      console.log('💡 Remote already exists, trying to push...');
      try {
        execSync('git push -u origin main', { stdio: 'inherit' });
        console.log('✅ Successfully pushed to GitHub!');
      } catch (pushError) {
        console.error('❌ Push failed:', pushError.message);
      }
    }
  }
  
  readline.close();
});
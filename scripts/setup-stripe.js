#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupStripe() {
  console.log('🚀 KidQueue Stripe Integration Setup\n');
  
  console.log('📋 This script will help you configure Stripe for KidQueue.\n');
  
  // Get Stripe keys
  console.log('1️⃣ First, get your Stripe API keys from: https://dashboard.stripe.com/apikeys\n');
  
  const stripeSecretKey = await question('Enter your Stripe Secret Key (sk_test_...): ');
  if (!stripeSecretKey.startsWith('sk_')) {
    console.log('❌ Invalid secret key format. Should start with sk_test_ or sk_live_');
    process.exit(1);
  }
  
  const stripePublishableKey = await question('Enter your Stripe Publishable Key (pk_test_...): ');
  if (!stripePublishableKey.startsWith('pk_')) {
    console.log('❌ Invalid publishable key format. Should start with pk_test_ or pk_live_');
    process.exit(1);
  }
  
  // Get price IDs
  console.log('\n2️⃣ Create products in Stripe Dashboard and enter the Price IDs:\n');
  
  const basicPriceId = await question('Basic Plan Price ID ($9.99/month): ');
  const professionalPriceId = await question('Professional Plan Price ID ($29.99/month): ');
  const enterprisePriceId = await question('Enterprise Plan Price ID ($99.99/month): ');
  
  // Get webhook secret
  console.log('\n3️⃣ Create a webhook endpoint and get the signing secret:\n');
  console.log('Webhook URL: https://us-central1-kidqueue-app.cloudfunctions.net/api/webhook');
  
  const webhookSecret = await question('Webhook Signing Secret (whsec_...): ');
  if (!webhookSecret.startsWith('whsec_')) {
    console.log('❌ Invalid webhook secret format. Should start with whsec_');
    process.exit(1);
  }
  
  console.log('\n4️⃣ Configuring Firebase Functions...\n');
  
  try {
    // Set Firebase function configuration
    execSync(`firebase functions:config:set stripe.secret_key="${stripeSecretKey}"`, { stdio: 'inherit' });
    execSync(`firebase functions:config:set stripe.webhook_secret="${webhookSecret}"`, { stdio: 'inherit' });
    
    console.log('\n5️⃣ Updating Cloud Functions code with Price IDs...\n');
    
    // Update functions/index.js with the correct price IDs
    const fs = require('fs');
    const path = require('path');
    
    const functionsPath = path.join(__dirname, '..', 'functions', 'index.js');
    let functionsContent = fs.readFileSync(functionsPath, 'utf8');
    
    functionsContent = functionsContent
      .replace(/priceId: 'price_basic_monthly'/, `priceId: '${basicPriceId}'`)
      .replace(/priceId: 'price_professional_monthly'/, `priceId: '${professionalPriceId}'`)
      .replace(/priceId: 'price_enterprise_monthly'/, `priceId: '${enterprisePriceId}'`);
    
    fs.writeFileSync(functionsPath, functionsContent);
    
    console.log('✅ Updated functions/index.js with your Price IDs');
    
    // Create .env file for frontend
    const envPath = path.join(__dirname, '..', 'packages', 'web', '.env');
    const envContent = `VITE_STRIPE_PUBLISHABLE_KEY=${stripePublishableKey}\n`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created packages/web/.env with publishable key');
    
    console.log('\n6️⃣ Ready to deploy! Run these commands:\n');
    console.log('firebase deploy --only functions');
    console.log('cd packages/web && npm run build');
    console.log('firebase deploy --only hosting');
    
    console.log('\n🎉 Setup complete! Your Stripe integration is ready to test.');
    console.log('\n📖 See STRIPE_SETUP_INSTRUCTIONS.md for detailed testing guide.');
    
  } catch (error) {
    console.error('❌ Error during setup:', error.message);
    process.exit(1);
  }
  
  rl.close();
}

// Check if Firebase project is on Blaze plan
try {
  console.log('🔍 Checking Firebase project plan...\n');
  
  // This will fail if not on Blaze plan
  execSync('firebase functions:config:get', { stdio: 'pipe' });
  
  setupStripe().catch(console.error);
  
} catch (error) {
  console.log('❌ Error: Your Firebase project needs to be upgraded to Blaze plan.\n');
  console.log('📈 Upgrade here: https://console.firebase.google.com/project/kidqueue-app/usage/details\n');
  console.log('💰 Don\'t worry - Blaze has a generous free tier. You only pay for usage beyond free limits.\n');
  console.log('🆓 Free tier includes:');
  console.log('   • 2M function invocations/month');
  console.log('   • 50k Firestore reads/day');  
  console.log('   • 20k Firestore writes/day');
  console.log('   • 5GB storage');
  console.log('\n⚡ After upgrading, run this script again.');
  process.exit(1);
}
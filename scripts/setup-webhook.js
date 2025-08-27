#!/usr/bin/env node

const stripe = require('../functions/node_modules/stripe')(process.env.STRIPE_SECRET_KEY);

async function setupWebhook() {
  console.log('🔗 Setting up Stripe webhook endpoint...\n');

  try {
    // Create webhook endpoint
    const webhook = await stripe.webhookEndpoints.create({
      url: 'https://us-central1-kidqueue-app.cloudfunctions.net/api/webhook',
      enabled_events: [
        'checkout.session.completed',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
        'customer.subscription.updated',
        'customer.subscription.deleted'
      ],
      description: 'KidQueue subscription webhook'
    });

    console.log('✅ Webhook endpoint created successfully!');
    console.log(`   Webhook ID: ${webhook.id}`);
    console.log(`   Webhook URL: ${webhook.url}`);
    console.log(`   Webhook Secret: ${webhook.secret}\n`);

    // Configure Firebase Functions with webhook secret
    const { execSync } = require('child_process');
    
    console.log('🔧 Configuring Firebase Functions with webhook secret...');
    execSync(`firebase functions:config:set stripe.webhook_secret="${webhook.secret}"`, { stdio: 'inherit' });
    
    console.log('✅ Firebase Functions configured with webhook secret!');
    
    console.log('\n🎉 SUCCESS! Webhook endpoint fully configured!');
    console.log('\n📋 WEBHOOK DETAILS:');
    console.log(`URL: ${webhook.url}`);
    console.log(`Secret: ${webhook.secret}`);
    console.log(`Events: ${webhook.enabled_events.join(', ')}`);
    
    console.log('\n🚀 Ready to deploy! Run: firebase deploy --only functions');
    
    return webhook.secret;
    
  } catch (error) {
    console.error('❌ Error setting up webhook:', error.message);
    process.exit(1);
  }
}

setupWebhook();
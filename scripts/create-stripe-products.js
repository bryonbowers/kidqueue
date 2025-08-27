#!/usr/bin/env node

const stripe = require('../functions/node_modules/stripe')(process.env.STRIPE_SECRET_KEY);

async function createProducts() {
  console.log('🚀 Creating KidQueue subscription products in Stripe...\n');

  try {
    // Create Basic Plan
    console.log('1️⃣ Creating Basic Plan...');
    const basicProduct = await stripe.products.create({
      name: 'KidQueue Basic',
      description: 'Perfect for individual teachers or small schools - Up to 100 students, 1 school, QR codes, basic pickup queue, email support',
      type: 'service'
    });

    const basicPrice = await stripe.prices.create({
      product: basicProduct.id,
      unit_amount: 999, // $9.99
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      nickname: 'Basic Monthly'
    });

    console.log('✅ Basic Plan created!');
    console.log(`   Product ID: ${basicProduct.id}`);
    console.log(`   Price ID: ${basicPrice.id}\n`);

    // Create Professional Plan
    console.log('2️⃣ Creating Professional Plan...');
    const professionalProduct = await stripe.products.create({
      name: 'KidQueue Professional',
      description: 'Ideal for schools and small districts - Up to 1,000 students, 5 schools, QR + license plate OCR, analytics, priority support, 30-day free trial',
      type: 'service'
    });

    const professionalPrice = await stripe.prices.create({
      product: professionalProduct.id,
      unit_amount: 2999, // $29.99
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      nickname: 'Professional Monthly'
    });

    console.log('✅ Professional Plan created!');
    console.log(`   Product ID: ${professionalProduct.id}`);
    console.log(`   Price ID: ${professionalPrice.id}\n`);

    // Create Enterprise Plan
    console.log('3️⃣ Creating Enterprise Plan...');
    const enterpriseProduct = await stripe.products.create({
      name: 'KidQueue Enterprise',
      description: 'For large districts and organizations - UNLIMITED students & schools, all features, API access, custom reporting, dedicated support, SLA guarantee',
      type: 'service'
    });

    const enterprisePrice = await stripe.prices.create({
      product: enterpriseProduct.id,
      unit_amount: 9999, // $99.99
      currency: 'usd',
      recurring: {
        interval: 'month'
      },
      nickname: 'Enterprise Monthly'
    });

    console.log('✅ Enterprise Plan created!');
    console.log(`   Product ID: ${enterpriseProduct.id}`);
    console.log(`   Price ID: ${enterprisePrice.id}\n`);

    // Update Cloud Functions with Price IDs
    console.log('4️⃣ Updating Cloud Functions with Price IDs...');
    
    const fs = require('fs');
    const path = require('path');
    
    const functionsPath = path.join(__dirname, '..', 'functions', 'index.js');
    let functionsContent = fs.readFileSync(functionsPath, 'utf8');
    
    functionsContent = functionsContent
      .replace(/priceId: 'price_basic_monthly'/, `priceId: '${basicPrice.id}'`)
      .replace(/priceId: 'price_professional_monthly'/, `priceId: '${professionalPrice.id}'`)
      .replace(/priceId: 'price_enterprise_monthly'/, `priceId: '${enterprisePrice.id}'`);
    
    fs.writeFileSync(functionsPath, functionsContent);
    console.log('✅ Updated functions/index.js with your Price IDs');

    // Also update the frontend subscription service
    const subscriptionServicePath = path.join(__dirname, '..', 'packages', 'web', 'src', 'services', 'subscriptionService.ts');
    let serviceContent = fs.readFileSync(subscriptionServicePath, 'utf8');
    
    serviceContent = serviceContent
      .replace(/stripePriceId: 'price_basic_monthly'/, `stripePriceId: '${basicPrice.id}'`)
      .replace(/stripePriceId: 'price_professional_monthly'/, `stripePriceId: '${professionalPrice.id}'`)
      .replace(/stripePriceId: 'price_enterprise_monthly'/, `stripePriceId: '${enterprisePrice.id}'`);
    
    fs.writeFileSync(subscriptionServicePath, serviceContent);
    console.log('✅ Updated frontend subscription service with your Price IDs');

    console.log('\n🎉 SUCCESS! All Stripe products created and configured!');
    console.log('\n📋 SUMMARY:');
    console.log(`Basic Plan: ${basicPrice.id} ($9.99/month)`);
    console.log(`Professional Plan: ${professionalPrice.id} ($29.99/month)`);
    console.log(`Enterprise Plan: ${enterprisePrice.id} ($99.99/month)`);
    
    console.log('\n🔗 Next: Set up webhook endpoint');
    console.log('Go to: https://dashboard.stripe.com/webhooks');
    console.log('Endpoint URL: https://us-central1-kidqueue-app.cloudfunctions.net/api/webhook');
    
  } catch (error) {
    console.error('❌ Error creating products:', error.message);
    process.exit(1);
  }
}

createProducts();
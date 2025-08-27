const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function setupWebhook() {
  try {
    // List existing webhooks first
    console.log('📋 Checking existing webhooks...');
    const existingWebhooks = await stripe.webhookEndpoints.list();
    
    console.log(`Found ${existingWebhooks.data.length} existing webhook(s):`);
    existingWebhooks.data.forEach((webhook, index) => {
      console.log(`${index + 1}. ${webhook.url} - Status: ${webhook.status} - Events: ${webhook.enabled_events.join(', ')}`);
    });

    // The correct webhook URL for our Cloud Function
    const webhookUrl = 'https://api-ns2ux2jxra-uc.a.run.app/webhook';
    
    // Check if webhook already exists for our URL
    const existingWebhook = existingWebhooks.data.find(webhook => webhook.url === webhookUrl);
    
    if (existingWebhook) {
      console.log('✅ Webhook already exists for our URL:', webhookUrl);
      console.log('🔧 Webhook secret (save this):', existingWebhook.secret);
      
      // Update it to ensure it has the right events
      const updatedWebhook = await stripe.webhookEndpoints.update(existingWebhook.id, {
        enabled_events: [
          'checkout.session.completed',
          'invoice.payment_succeeded', 
          'invoice.payment_failed',
          'customer.subscription.updated',
          'customer.subscription.deleted'
        ]
      });
      
      console.log('🔄 Updated webhook events');
      return existingWebhook.secret;
    } else {
      console.log('🆕 Creating new webhook for:', webhookUrl);
      
      // Create new webhook endpoint
      const webhook = await stripe.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: [
          'checkout.session.completed',
          'invoice.payment_succeeded',
          'invoice.payment_failed', 
          'customer.subscription.updated',
          'customer.subscription.deleted'
        ]
      });

      console.log('✅ Webhook created successfully!');
      console.log('🆔 Webhook ID:', webhook.id);
      console.log('🔗 Webhook URL:', webhook.url);
      console.log('🔧 Webhook Secret (SAVE THIS):', webhook.secret);
      console.log('📨 Events:', webhook.enabled_events.join(', '));
      
      return webhook.secret;
    }
    
  } catch (error) {
    console.error('❌ Error setting up webhook:', error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('🔑 Check your Stripe secret key');
    }
    throw error;
  }
}

// Run the setup
setupWebhook()
  .then((secret) => {
    console.log('\n🎉 Webhook setup complete!');
    console.log('🔧 Make sure this secret is in your .env file:');
    console.log('STRIPE_WEBHOOK_SECRET=' + secret);
  })
  .catch((error) => {
    console.error('\n💥 Setup failed:', error.message);
    process.exit(1);
  });
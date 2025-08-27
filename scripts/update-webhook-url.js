const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function updateWebhookURL() {
  try {
    // List existing webhooks
    console.log('Getting existing webhooks...');
    const webhooks = await stripe.webhookEndpoints.list();
    
    // Delete old webhook if it exists
    const oldWebhook = webhooks.data.find(webhook => 
      webhook.url.includes('api-ns2ux2jxra-uc.a.run.app/webhook')
    );
    
    if (oldWebhook) {
      console.log('Deleting old webhook:', oldWebhook.url);
      await stripe.webhookEndpoints.del(oldWebhook.id);
    }
    
    // Create new webhook with updated URL
    console.log('Creating new webhook endpoint...');
    const webhook = await stripe.webhookEndpoints.create({
      url: 'https://us-central1-kidqueue-app.cloudfunctions.net/webhook',
      enabled_events: [
        'checkout.session.completed',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
        'customer.subscription.updated',
        'customer.subscription.deleted'
      ],
    });
    
    console.log('✅ Webhook endpoint created successfully!');
    console.log('📍 URL:', webhook.url);
    console.log('🔑 Secret:', webhook.secret);
    console.log('📋 Events:', webhook.enabled_events);
    
    console.log('\n🚀 Next steps:');
    console.log('1. Update your environment variables with the new webhook secret:', webhook.secret);
    console.log('2. Test a Stripe checkout to verify webhook processing works');
    
  } catch (error) {
    console.error('❌ Error updating webhook:', error.message);
  }
}

updateWebhookURL();
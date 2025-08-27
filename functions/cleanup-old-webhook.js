const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function cleanupOldWebhook() {
  try {
    console.log('📋 Listing all webhooks...');
    const webhooks = await stripe.webhookEndpoints.list();
    
    console.log(`Found ${webhooks.data.length} webhook(s):`);
    webhooks.data.forEach((webhook, index) => {
      console.log(`${index + 1}. ID: ${webhook.id}`);
      console.log(`   URL: ${webhook.url}`);
      console.log(`   Status: ${webhook.status}`);
      console.log(`   Events: ${webhook.enabled_events.join(', ')}`);
      console.log();
    });

    // Find and disable/delete the old webhook
    const oldWebhookUrl = 'https://us-central1-kidqueue-app.cloudfunctions.net/api/webhook';
    const oldWebhook = webhooks.data.find(webhook => webhook.url === oldWebhookUrl);
    
    if (oldWebhook) {
      console.log('🗑️  Found old webhook, deleting:', oldWebhookUrl);
      await stripe.webhookEndpoints.del(oldWebhook.id);
      console.log('✅ Old webhook deleted successfully');
    } else {
      console.log('ℹ️  No old webhook found to delete');
    }
    
    // Verify the current webhook is active
    const currentWebhookUrl = 'https://api-ns2ux2jxra-uc.a.run.app/webhook';
    const currentWebhook = webhooks.data.find(webhook => webhook.url === currentWebhookUrl);
    
    if (currentWebhook) {
      console.log('✅ Current webhook is active:', currentWebhookUrl);
      console.log('🔧 Webhook secret:', currentWebhook.secret);
    } else {
      console.log('⚠️  Current webhook not found!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

cleanupOldWebhook()
  .then(() => {
    console.log('\n🎉 Webhook cleanup complete!');
  })
  .catch((error) => {
    console.error('\n💥 Cleanup failed:', error.message);
    process.exit(1);
  });
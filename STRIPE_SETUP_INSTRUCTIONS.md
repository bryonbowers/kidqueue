# Complete Stripe Integration Setup

## Step 1: Create Stripe Account & Get API Keys

1. **Sign up for Stripe**: Go to https://stripe.com and create an account
2. **Get API Keys**: 
   - Go to Dashboard → Developers → API keys
   - Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)

## Step 2: Create Products and Prices in Stripe Dashboard

1. Go to **Dashboard → Products**
2. Create three products with the following details:

### Product 1: Basic Plan
- **Name**: KidQueue Basic
- **Description**: Perfect for individual teachers or small schools
- **Pricing**: 
  - **Price**: $9.99
  - **Billing**: Monthly recurring
  - **Price ID**: Copy this (will look like `price_1ABC123...`) - use as `price_basic_monthly`

### Product 2: Professional Plan  
- **Name**: KidQueue Professional
- **Description**: Ideal for schools and small districts
- **Pricing**: 
  - **Price**: $29.99
  - **Billing**: Monthly recurring
  - **Price ID**: Copy this - use as `price_professional_monthly`

### Product 3: Enterprise Plan
- **Name**: KidQueue Enterprise
- **Description**: For large districts and organizations
- **Pricing**: 
  - **Price**: $99.99
  - **Billing**: Monthly recurring
  - **Price ID**: Copy this - use as `price_enterprise_monthly`

## Step 3: Configure Stripe Webhook

1. Go to **Dashboard → Developers → Webhooks**
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://us-central1-kidqueue-app.cloudfunctions.net/api/webhook`
4. **Events to send**:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. **Save** and copy the **Webhook signing secret** (starts with `whsec_`)

## Step 4: Update Firebase Functions Configuration

Run these commands to set the Stripe configuration:

```bash
# Set Stripe secret key
firebase functions:config:set stripe.secret_key="sk_test_your_secret_key_here"

# Set Stripe webhook secret
firebase functions:config:set stripe.webhook_secret="whsec_your_webhook_secret_here"

# Deploy the updated configuration
firebase deploy --only functions
```

## Step 5: Update Frontend Environment Variables

1. **Create `.env` file** in `packages/web/` directory:
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

## Step 6: Update Cloud Functions with Correct Price IDs

Edit `functions/index.js` and update the `subscriptionPlans` object with your actual Stripe Price IDs:

```javascript
const subscriptionPlans = {
  basic: {
    priceId: 'price_1ABC123...', // Your actual Basic plan Price ID
    price: 999,
    name: 'Basic',
    studentLimit: 100,
    schoolLimit: 1
  },
  professional: {
    priceId: 'price_1DEF456...', // Your actual Professional plan Price ID  
    price: 2999,
    name: 'Professional',
    studentLimit: 1000,
    schoolLimit: 5
  },
  enterprise: {
    priceId: 'price_1GHI789...', // Your actual Enterprise plan Price ID
    price: 9999,
    name: 'Enterprise',
    studentLimit: null,
    schoolLimit: null
  }
}
```

## Step 7: Upgrade Firebase to Blaze Plan

**IMPORTANT**: Cloud Functions require the Blaze (pay-as-you-go) plan.

1. Go to: https://console.firebase.google.com/project/kidqueue-app/usage/details
2. Click **"Upgrade to Blaze"**
3. Set up billing with a credit card
4. **Note**: Blaze plan has a generous free tier - you only pay for usage beyond free limits

**Free Tier Limits (won't be charged unless exceeded)**:
- Cloud Functions: 2 million invocations/month
- Firestore: 50,000 reads, 20,000 writes, 20,000 deletes/day  
- Storage: 5GB
- Hosting: 10GB/month

## Step 8: Deploy Everything

After upgrading to Blaze plan and configuring Stripe:

```bash
# Deploy functions
firebase deploy --only functions

# Build and deploy frontend
npm run build
firebase deploy --only hosting

# Deploy all at once
firebase deploy
```

## Step 9: Test the Integration

### Test with Stripe Test Cards:
- **Successful payment**: 4242424242424242
- **Payment fails**: 4000000000000002
- **Requires authentication**: 4000002500003155

### Testing Flow:
1. Go to `/subscription` page
2. Click "Get Started" on any plan
3. Use test credit card numbers
4. Verify subscription appears in `/admin/subscriptions` (admin only)
5. Check Stripe Dashboard for payment records

## Step 10: Go Live (Production)

When ready for production:

1. **Switch to live keys** in Stripe Dashboard
2. **Update Firebase configuration** with live keys:
   ```bash
   firebase functions:config:set stripe.secret_key="sk_live_your_live_key"
   firebase functions:config:set stripe.webhook_secret="whsec_live_webhook_secret"
   ```
3. **Update frontend** `.env` with live publishable key
4. **Update webhook URL** in Stripe to production URL
5. **Deploy** updated configuration

## Troubleshooting

### Common Issues:
1. **"Price not found"**: Ensure Price IDs in `functions/index.js` match Stripe Dashboard
2. **Webhook not receiving events**: Check webhook URL and selected events
3. **Payment not completing**: Verify webhook handler is working
4. **Functions not deploying**: Ensure Firebase project is on Blaze plan

### Debug Tools:
- **Stripe Dashboard** → Logs: See all webhook events and API calls
- **Firebase Console** → Functions → Logs: See function execution logs
- **Browser DevTools** → Network: Check API calls to `/api/` endpoints

## Security Notes

- **Never expose secret keys** in frontend code
- **Use environment variables** for all sensitive data  
- **Enable webhook signature verification** (already implemented)
- **Validate all inputs** in Cloud Functions (already implemented)
- **Use HTTPS only** for webhook endpoints (Firebase uses HTTPS by default)
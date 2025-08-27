# Stripe Backend Setup Guide

This document outlines the backend setup required for the KidQueue subscription system.

## Required Backend Endpoints

### 1. Create Checkout Session - `POST /api/create-checkout-session`

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/create-checkout-session', async (req, res) => {
  const { planId, userId, successUrl, cancelUrl } = req.body;
  
  // Get plan details
  const plans = {
    basic: { priceId: 'price_basic_monthly', price: 999 },
    professional: { priceId: 'price_professional_monthly', price: 2999 },
    enterprise: { priceId: 'price_enterprise_monthly', price: 9999 }
  };
  
  const plan = plans[planId];
  if (!plan) {
    return res.status(400).json({ error: 'Invalid plan' });
  }
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: plan.priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        planId: planId
      }
    });
    
    res.json({ sessionId: session.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2. Stripe Webhook Handler - `POST /api/webhook`

```javascript
app.post('/api/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed.`);
  }
  
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await handleSubscriptionCreated(session);
      break;
      
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
      
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
      
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object);
      break;
  }
  
  res.json({received: true});
});
```

### 3. Helper Functions

```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

async function handleSubscriptionCreated(session) {
  const userId = session.client_reference_id;
  const planId = session.metadata.planId;
  
  // Get the subscription from Stripe
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription
  );
  
  // Save to Firebase
  await db.collection('subscriptions').doc(userId).set({
    id: userId,
    userId: userId,
    planId: planId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    createdAt: new Date(),
    updatedAt: new Date()
  });
}

async function handlePaymentSucceeded(invoice) {
  // Update subscription status if needed
  const subscriptionId = invoice.subscription;
  
  // Find user by Stripe subscription ID
  const subscriptionsQuery = await db.collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();
    
  if (!subscriptionsQuery.empty) {
    const docRef = subscriptionsQuery.docs[0].ref;
    await docRef.update({
      status: 'active',
      updatedAt: new Date()
    });
  }
}

async function handlePaymentFailed(invoice) {
  // Update subscription status
  const subscriptionId = invoice.subscription;
  
  const subscriptionsQuery = await db.collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();
    
  if (!subscriptionsQuery.empty) {
    const docRef = subscriptionsQuery.docs[0].ref;
    await docRef.update({
      status: 'past_due',
      updatedAt: new Date()
    });
  }
}
```

## Stripe Dashboard Setup

1. Create Stripe account at https://stripe.com
2. Get your API keys from Dashboard → Developers → API keys
3. Create products and prices in Dashboard → Products:
   - Basic Plan: $9.99/month (price_basic_monthly)
   - Professional Plan: $29.99/month (price_professional_monthly)
   - Enterprise Plan: $99.99/month (price_enterprise_monthly)

## Environment Variables

```bash
# Backend .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FIREBASE_SERVICE_ACCOUNT_KEY={"type": "service_account",...}

# Frontend .env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Firebase Security Rules

Add to Firestore rules:
```javascript
// Allow users to read their own subscription
match /subscriptions/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

// Allow admin to read all subscriptions
match /subscriptions/{document=**} {
  allow read: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.email == 'bryon.bowers@gmail.com';
}
```

## Testing

1. Use Stripe test cards: https://stripe.com/docs/testing
2. Test successful payment: 4242424242424242
3. Test failed payment: 4000000000000002
4. Monitor webhooks in Stripe Dashboard → Developers → Webhooks

## Deployment

1. Deploy backend with webhook endpoint
2. Add webhook URL in Stripe Dashboard → Developers → Webhooks
3. Select events: checkout.session.completed, invoice.payment_succeeded, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted
4. Update frontend with production Stripe publishable key
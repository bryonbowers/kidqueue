const functions = require('firebase-functions/v2')
const admin = require('firebase-admin')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const express = require('express')
const cors = require('cors')

// Initialize Firebase Admin
admin.initializeApp()
const db = admin.firestore()

const app = express()

// Middleware
app.use(cors({ origin: true }))

// Special middleware ordering for webhook
app.use((req, res, next) => {
  if (req.path === '/webhook') {
    // For webhook, use raw body parsing
    return express.raw({ type: 'application/json' })(req, res, next)
  }
  // For all other routes, use JSON parsing
  return express.json()(req, res, next)
})

// Subscription plans configuration
const subscriptionPlans = {
  basic: {
    priceId: 'price_1S0OokGHvMGa8SVhsSOpJRoK',
    price: 999, // $9.99 in cents
    name: 'Basic',
    studentLimit: 100,
    schoolLimit: 1
  },
  professional: {
    priceId: 'price_1S0OolGHvMGa8SVhVBqXsHyN', 
    price: 2999, // $29.99 in cents
    name: 'Professional',
    studentLimit: 1000,
    schoolLimit: 5
  },
  enterprise: {
    priceId: 'price_1S0OolGHvMGa8SVh70orLRU2',
    price: 9999, // $99.99 in cents
    name: 'Enterprise',
    studentLimit: null, // unlimited
    schoolLimit: null // unlimited
  }
}

// Create Stripe Checkout Session
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { planId, userId, successUrl, cancelUrl } = req.body

    console.log('Creating checkout session:', { planId, userId })

    // Validate input
    if (!planId || !userId || !successUrl || !cancelUrl) {
      return res.status(400).json({ 
        error: 'Missing required fields: planId, userId, successUrl, cancelUrl' 
      })
    }

    const plan = subscriptionPlans[planId]
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan ID' })
    }

    // Get user info from Firebase
    const userDoc = await db.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' })
    }

    const userData = userDoc.data()

    // Create or get Stripe customer
    let customerId = userData.stripeCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        name: userData.name,
        metadata: {
          firebaseUserId: userId
        }
      })
      customerId = customer.id
      
      // Save customer ID to user document
      await db.collection('users').doc(userId).update({
        stripeCustomerId: customerId
      })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
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
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      // Add trial period for professional plan
      ...(planId === 'professional' && {
        subscription_data: {
          trial_period_days: 30
        }
      })
    })

    console.log('Checkout session created:', session.id)
    res.json({ sessionId: session.id })

  } catch (error) {
    console.error('Error creating checkout session:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get subscription status
app.get('/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    
    const subscriptionDoc = await db.collection('subscriptions').doc(userId).get()
    
    if (!subscriptionDoc.exists) {
      return res.json({ subscription: null })
    }

    const subscription = subscriptionDoc.data()
    res.json({ subscription })

  } catch (error) {
    console.error('Error fetching subscription:', error)
    res.status(500).json({ error: error.message })
  }
})

// Cancel subscription
app.post('/cancel-subscription', async (req, res) => {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' })
    }

    const subscriptionDoc = await db.collection('subscriptions').doc(userId).get()
    
    if (!subscriptionDoc.exists) {
      return res.status(404).json({ error: 'Subscription not found' })
    }

    const subscriptionData = subscriptionDoc.data()
    
    // Cancel the Stripe subscription at period end
    await stripe.subscriptions.update(subscriptionData.stripeSubscriptionId, {
      cancel_at_period_end: true
    })

    // Update Firebase document
    await db.collection('subscriptions').doc(userId).update({
      cancelAtPeriodEnd: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    res.json({ success: true, message: 'Subscription will be canceled at the end of the billing period' })

  } catch (error) {
    console.error('Error canceling subscription:', error)
    res.status(500).json({ error: error.message })
  }
})

// Helper functions for webhook handlers
async function handleSubscriptionCreated(session) {
  console.log('Handling subscription created:', session.id)
  
  const userId = session.client_reference_id
  const planId = session.metadata.planId
  
  // Get the subscription from Stripe
  const subscription = await stripe.subscriptions.retrieve(session.subscription)
  
  const subscriptionData = {
    id: userId,
    userId: userId,
    planId: planId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer,
    status: subscription.status,
    currentPeriodStart: admin.firestore.Timestamp.fromDate(
      new Date(subscription.current_period_start * 1000)
    ),
    currentPeriodEnd: admin.firestore.Timestamp.fromDate(
      new Date(subscription.current_period_end * 1000)
    ),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }

  // Add trial information if present
  if (subscription.trial_end) {
    subscriptionData.trialEndsAt = admin.firestore.Timestamp.fromDate(
      new Date(subscription.trial_end * 1000)
    )
  }
  
  // Save to Firebase
  await db.collection('subscriptions').doc(userId).set(subscriptionData)
  
  console.log('Subscription saved to Firebase:', userId)
}

async function handlePaymentSucceeded(invoice) {
  console.log('Payment succeeded for invoice:', invoice.id)
  
  const subscriptionId = invoice.subscription
  
  // Find user by Stripe subscription ID
  const subscriptionsQuery = await db.collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get()
    
  if (!subscriptionsQuery.empty) {
    const docRef = subscriptionsQuery.docs[0].ref
    await docRef.update({
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    console.log('Subscription status updated to active')
  }
}

async function handlePaymentFailed(invoice) {
  console.log('Payment failed for invoice:', invoice.id)
  
  const subscriptionId = invoice.subscription
  
  const subscriptionsQuery = await db.collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscriptionId)
    .limit(1)
    .get()
    
  if (!subscriptionsQuery.empty) {
    const docRef = subscriptionsQuery.docs[0].ref
    await docRef.update({
      status: 'past_due',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    console.log('Subscription status updated to past_due')
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id)
  
  const subscriptionsQuery = await db.collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get()
    
  if (!subscriptionsQuery.empty) {
    const docRef = subscriptionsQuery.docs[0].ref
    await docRef.update({
      status: subscription.status,
      currentPeriodStart: admin.firestore.Timestamp.fromDate(
        new Date(subscription.current_period_start * 1000)
      ),
      currentPeriodEnd: admin.firestore.Timestamp.fromDate(
        new Date(subscription.current_period_end * 1000)
      ),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    console.log('Subscription updated in Firebase')
  }
}

async function handleSubscriptionCanceled(subscription) {
  console.log('Subscription canceled:', subscription.id)
  
  const subscriptionsQuery = await db.collection('subscriptions')
    .where('stripeSubscriptionId', '==', subscription.id)
    .limit(1)
    .get()
    
  if (!subscriptionsQuery.empty) {
    const docRef = subscriptionsQuery.docs[0].ref
    await docRef.update({
      status: 'canceled',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    console.log('Subscription marked as canceled in Firebase')
  }
}

// Stripe webhook handler
app.post('/webhook', async (req, res) => {
  console.log('🎯 Webhook received!')
  console.log('📝 Request body type:', typeof req.body)
  console.log('📝 Request body constructor:', req.body.constructor.name)
  console.log('🔐 Stripe signature header:', req.headers['stripe-signature'] ? 'Present' : 'Missing')
  
  const sig = req.headers['stripe-signature']
  let event
  
  if (!sig) {
    console.error('❌ No stripe-signature header provided')
    return res.status(400).send('No stripe-signature header value was provided.')
  }
  
  try {
    console.log('🔍 Attempting webhook verification...')
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    )
    console.log('✅ Webhook verification successful!')
    console.log('📨 Event type:', event.type)
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook signature verification failed.`)
  }
  
  console.log('Received webhook event:', event.type)
  
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleSubscriptionCreated(event.data.object)
        break
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object)
        break
        
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error('Error handling webhook:', error)
    return res.status(500).json({ error: 'Webhook handler failed' })
  }
  
  res.json({received: true})
})

// Create separate webhook app with raw body parsing
const webhookApp = express()
webhookApp.use(cors({ origin: true }))
webhookApp.use(express.raw({ type: 'application/json' }))

// Move webhook endpoint to separate app
webhookApp.post('/webhook', async (req, res) => {
  console.log('🎯 Webhook received!')
  console.log('📝 Request body type:', typeof req.body)
  console.log('📝 Request body constructor:', req.body.constructor.name)
  console.log('🔐 Stripe signature header:', req.headers['stripe-signature'] ? 'Present' : 'Missing')
  
  const sig = req.headers['stripe-signature']
  let event
  
  if (!sig) {
    console.error('❌ No stripe-signature header provided')
    return res.status(400).send('No stripe-signature header value was provided.')
  }
  
  try {
    console.log('🔍 Attempting webhook verification...')
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET
    )
    console.log('✅ Webhook verification successful!')
    console.log('📨 Event type:', event.type)
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook signature verification failed.`)
  }
  
  console.log('Received webhook event:', event.type)
  
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleSubscriptionCreated(event.data.object)
        break
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object)
        break
        
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error('Error handling webhook:', error)
    return res.status(500).json({ error: 'Webhook handler failed' })
  }
  
  res.json({received: true})
})

// Export the Express app as a Cloud Function
exports.api = functions.https.onRequest({
  cors: true,
  invoker: 'public'
}, app)

// Export webhook as separate function
exports.webhook = functions.https.onRequest({
  cors: true,
  invoker: 'public'
}, webhookApp)
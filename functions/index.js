const functions = require('firebase-functions/v2')
const admin = require('firebase-admin')
const express = require('express')
const cors = require('cors')

// Initialize Stripe lazily to avoid build-time issues
let stripe
function getStripe() {
  if (!stripe) {
    const stripeLib = require('stripe')
    stripe = stripeLib(process.env.STRIPE_SECRET_KEY)
  }
  return stripe
}

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
      const customer = await getStripe().customers.create({
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
    const session = await getStripe().checkout.sessions.create({
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
    
    console.log('🔍 Fetching subscription for userId:', userId)
    const subscriptionDoc = await db.collection('subscriptions').doc(userId).get()
    
    const subscription = subscriptionDoc.data()
    
    if (!subscription) {
      console.log('❌ No subscription document found for userId:', userId)
      return res.json({ subscription: null })
    }

    console.log('✅ Found subscription:', subscription)
    res.json({ subscription })

  } catch (error) {
    console.error('❌ Error fetching subscription:', error)
    res.status(500).json({ error: error.message })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '3.0',
    bug_fixes: ['exists_property_vs_function_fixed', 'subscription_retrieval_working']
  })
})

// Test subscription retrieval with alternative approach (for debugging)
app.get('/test-subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    
    console.log('🔍 [TEST] Fetching subscription for userId:', userId)
    const subscriptionDoc = await db.collection('subscriptions').doc(userId).get()
    
    console.log('📄 [TEST] Document reference:', !!subscriptionDoc)
    console.log('📄 [TEST] Document exists property:', subscriptionDoc.exists)
    console.log('📄 [TEST] Document exists function type:', typeof subscriptionDoc.exists)
    
    // Alternative approach - check if data() returns null/undefined
    const subscriptionData = subscriptionDoc.data()
    
    if (!subscriptionData) {
      console.log('❌ [TEST] No subscription data found for userId:', userId)
      return res.json({ 
        subscription: null, 
        debug: 'document_not_found',
        exists_property: subscriptionDoc.exists,
        data_result: subscriptionData
      })
    }

    console.log('✅ [TEST] Found subscription:', subscriptionData)
    res.json({ 
      subscription: subscriptionData, 
      debug: 'success',
      exists_property: subscriptionDoc.exists
    })

  } catch (error) {
    console.error('❌ [TEST] Error fetching subscription:', error)
    res.status(500).json({ 
      error: error.message, 
      debug: 'error_caught',
      errorName: error.name,
      stack: error.stack
    })
  }
})

// Webhook endpoint info for Stripe configuration
app.get('/webhook-info', async (req, res) => {
  res.json({
    webhook_url: 'https://webhook-ns2ux2jxra-uc.a.run.app/webhook',
    required_events: [
      'checkout.session.completed',
      'customer.subscription.created', 
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed'
    ],
    instructions: 'Add this webhook URL to your Stripe Dashboard at https://dashboard.stripe.com/webhooks'
  })
})

// Manual sync subscription from Stripe
app.post('/sync-subscription-from-stripe', async (req, res) => {
  try {
    const { userId } = req.body
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' })
    }

    console.log('🔄 Manual sync from Stripe for userId:', userId)

    // Get user document to find Stripe customer ID
    const userDoc = await db.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' })
    }

    const userData = userDoc.data()
    const customerId = userData.stripeCustomerId

    if (!customerId) {
      return res.status(404).json({ error: 'No Stripe customer ID found for user' })
    }

    console.log('🔍 Found Stripe customer ID:', customerId)

    // Get subscriptions for this customer from Stripe
    const subscriptions = await getStripe().subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 10
    })

    console.log('📄 Found subscriptions from Stripe:', subscriptions.data.length)

    if (subscriptions.data.length === 0) {
      return res.json({ 
        success: false, 
        message: 'No subscriptions found in Stripe for this customer',
        customerId 
      })
    }

    // Get the most recent active subscription
    const activeSubscription = subscriptions.data.find(sub => 
      ['active', 'trialing', 'incomplete', 'past_due'].includes(sub.status)
    ) || subscriptions.data[0]

    console.log('✅ Using subscription:', activeSubscription.id, 'Status:', activeSubscription.status)

    // Determine plan ID from the subscription
    const priceId = activeSubscription.items.data[0]?.price.id
    let planId = 'basic' // default
    
    if (priceId === 'price_1S0OolGHvMGa8SVhVBqXsHyN') planId = 'professional'
    if (priceId === 'price_1S0OolGHvMGa8SVh70orLRU2') planId = 'enterprise'

    // Create subscription document in Firebase
    const subscriptionData = {
      id: userId,
      userId: userId,
      planId: planId,
      stripeSubscriptionId: activeSubscription.id,
      stripeCustomerId: activeSubscription.customer,
      status: activeSubscription.status,
      currentPeriodStart: admin.firestore.Timestamp.fromDate(
        new Date(activeSubscription.current_period_start * 1000)
      ),
      currentPeriodEnd: admin.firestore.Timestamp.fromDate(
        new Date(activeSubscription.current_period_end * 1000)
      ),
      cancelAtPeriodEnd: activeSubscription.cancel_at_period_end,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }

    if (activeSubscription.trial_end) {
      subscriptionData.trialEndsAt = admin.firestore.Timestamp.fromDate(
        new Date(activeSubscription.trial_end * 1000)
      )
    }

    await db.collection('subscriptions').doc(userId).set(subscriptionData)
    console.log('✅ Subscription synced to Firebase')

    res.json({ 
      success: true, 
      message: 'Subscription synced from Stripe',
      subscription: subscriptionData
    })

  } catch (error) {
    console.error('❌ Error syncing subscription from Stripe:', error)
    res.status(500).json({ error: error.message })
  }
})

// Debug endpoint to create a test subscription
app.post('/debug/create-test-subscription', async (req, res) => {
  try {
    const { userId, planId } = req.body
    
    if (!userId || !planId) {
      return res.status(400).json({ error: 'Missing userId or planId' })
    }

    console.log('🧪 Creating test subscription for:', { userId, planId })

    const subscriptionData = {
      id: userId,
      userId: userId,
      planId: planId,
      stripeSubscriptionId: 'sub_test_' + Date.now(),
      stripeCustomerId: 'cus_test_' + Date.now(),
      status: 'active',
      currentPeriodStart: admin.firestore.Timestamp.now(),
      currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      cancelAtPeriodEnd: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }

    await db.collection('subscriptions').doc(userId).set(subscriptionData)
    console.log('✅ Test subscription created successfully')

    res.json({ 
      success: true, 
      message: 'Test subscription created',
      subscriptionData: subscriptionData 
    })

  } catch (error) {
    console.error('❌ Error creating test subscription:', error)
    res.status(500).json({ error: error.message })
  }
})

// Debug endpoint to create a test user
app.post('/debug/create-test-user', async (req, res) => {
  try {
    const { userId, email, name } = req.body
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' })
    }

    console.log('🧪 Creating test user for:', { userId, email, name })

    const userData = {
      id: userId,
      email: email || `test-${userId.substring(0, 8)}@example.com`,
      name: name || `Test User ${userId.substring(0, 8)}`,
      role: 'parent',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }

    await db.collection('users').doc(userId).set(userData)
    console.log('✅ Test user created successfully')

    res.json({ 
      success: true, 
      message: 'Test user created',
      userData: userData 
    })

  } catch (error) {
    console.error('❌ Error creating test user:', error)
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
    await getStripe().subscriptions.update(subscriptionData.stripeSubscriptionId, {
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
  console.log('🎉 Handling subscription created:', session.id)
  console.log('🔍 Session data:', JSON.stringify(session, null, 2))
  
  const userId = session.client_reference_id
  const planId = session.metadata.planId
  
  console.log('👤 User ID:', userId)
  console.log('📦 Plan ID:', planId)
  
  if (!userId || !planId) {
    console.error('❌ Missing userId or planId in session metadata')
    return
  }
  
  // Get the subscription from Stripe
  console.log('🔍 Retrieving subscription from Stripe:', session.subscription)
  const subscription = await getStripe().subscriptions.retrieve(session.subscription)
  console.log('✅ Subscription retrieved:', subscription.id, 'Status:', subscription.status)
  
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
  console.log('💾 Saving subscription to Firebase for user:', userId)
  console.log('📄 Subscription data:', JSON.stringify(subscriptionData, null, 2))
  await db.collection('subscriptions').doc(userId).set(subscriptionData)
  
  console.log('✅ Subscription saved to Firebase:', userId)
  
  // Verify the subscription was saved correctly
  const savedDoc = await db.collection('subscriptions').doc(userId).get()
  if (savedDoc.exists) {
    console.log('✅ Verification: Subscription exists in Firebase with status:', savedDoc.data().status)
  } else {
    console.error('❌ Verification failed: Subscription not found in Firebase')
  }
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
  console.log('🌐 Request headers:', JSON.stringify(req.headers, null, 2))
  
  const sig = req.headers['stripe-signature']
  let event
  
  if (!sig) {
    console.error('❌ No stripe-signature header provided')
    return res.status(400).send('No stripe-signature header value was provided.')
  }
  
  try {
    console.log('🔍 Attempting webhook verification...')
    event = getStripe().webhooks.constructEvent(
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
        
      case 'customer.subscription.created':
        await handleSubscriptionUpdated(event.data.object)
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
    event = getStripe().webhooks.constructEvent(
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
        
      case 'customer.subscription.created':
        await handleSubscriptionUpdated(event.data.object)
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
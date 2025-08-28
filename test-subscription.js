// Test script to create a sample subscription document
const admin = require('firebase-admin')

// Initialize Firebase Admin
admin.initializeApp()
const db = admin.firestore()

async function createTestSubscription() {
  const userId = 'test-user-123'
  const subscriptionData = {
    id: userId,
    userId: userId,
    planId: 'professional',
    stripeSubscriptionId: 'sub_test_123',
    stripeCustomerId: 'cus_test_123',
    status: 'active',
    currentPeriodStart: admin.firestore.Timestamp.now(),
    currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
    cancelAtPeriodEnd: false,
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  }

  try {
    await db.collection('subscriptions').doc(userId).set(subscriptionData)
    console.log('✅ Test subscription created for user:', userId)
    
    // Verify it can be retrieved
    const doc = await db.collection('subscriptions').doc(userId).get()
    if (doc.exists()) {
      console.log('✅ Test subscription retrieved:', doc.data())
    } else {
      console.log('❌ Failed to retrieve test subscription')
    }
  } catch (error) {
    console.error('❌ Error creating test subscription:', error)
  }
}

createTestSubscription()
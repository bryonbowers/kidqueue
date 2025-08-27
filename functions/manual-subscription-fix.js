// Manual script to add subscription for testing
// This should only be used for fixing the current paid subscription issue

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'kidqueue-app'
});

const db = admin.firestore();

async function addManualSubscription() {
  try {
    // User ID from the logs: aajvSz1XylMvaaOTri3Kh7PoAQs1
    const userId = 'aajvSz1XylMvaaOTri3Kh7PoAQs1';
    
    // Create a subscription record for the basic plan
    const subscriptionData = {
      id: userId,
      userId: userId,
      planId: 'basic',
      stripeSubscriptionId: 'manual_sub_' + Date.now(), // Temporary ID
      stripeCustomerId: 'manual_cust_' + Date.now(), // Temporary ID
      status: 'active',
      currentPeriodStart: admin.firestore.Timestamp.now(),
      currentPeriodEnd: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
      cancelAtPeriodEnd: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    // Save to Firebase
    await db.collection('subscriptions').doc(userId).set(subscriptionData);
    
    console.log('✅ Manual subscription created successfully for user:', userId);
    console.log('🎯 Subscription details:', subscriptionData);
    console.log('📅 Valid until:', subscriptionData.currentPeriodEnd.toDate());
    
  } catch (error) {
    console.error('❌ Error creating manual subscription:', error);
  } finally {
    process.exit(0);
  }
}

addManualSubscription();
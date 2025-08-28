// Quick script to create a test user document that matches our existing subscription
const admin = require('firebase-admin')

// Initialize Firebase Admin (reuse existing initialization)
if (!admin.apps.length) {
  admin.initializeApp()
}
const db = admin.firestore()

async function createTestUser() {
  const userId = 'HPkZ3HvXCiRJzDFWEyDCrICATpi1' // Matches our existing subscription
  const userData = {
    id: userId,
    email: 'test-user@example.com',
    name: 'Test User Professional',
    role: 'parent',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  }

  try {
    await db.collection('users').doc(userId).set(userData)
    console.log('✅ Test user created:', userId)
    console.log('📧 Email:', userData.email)
    console.log('👤 Name:', userData.name)
    
    // Verify user was created
    const userDoc = await db.collection('users').doc(userId).get()
    if (userDoc.exists) {
      console.log('✅ User document verified')
    }
    
    // Also verify subscription exists
    const subDoc = await db.collection('subscriptions').doc(userId).get()
    if (subDoc.exists) {
      const subData = subDoc.data()
      console.log('✅ Matching subscription found:', subData.planId, subData.status)
    } else {
      console.log('⚠️ No subscription found for this user')
    }
  } catch (error) {
    console.error('❌ Error creating test user:', error)
  }
}

createTestUser()
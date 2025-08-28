import { loadStripe } from '@stripe/stripe-js'
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { SubscriptionPlan, UserSubscription, PaymentMethod, UsageStats } from '../types/subscription'

// Initialize Stripe with explicit configuration
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51QTkauGHvMGa8SVhHYU4WxKb6E6MYlOxVnUJMqxV1NXTbQbRkZHdgu4JqUmEXGLNtFoS3KzXMM9UL5Kfwfbm9ypc00YpI9y2yj'

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY, {
  locale: 'en'
})

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for individual teachers or small schools',
    price: 999, // $9.99/month
    interval: 'month',
    features: [
      'Up to 100 students',
      'Single school management',
      'QR code generation',
      'Basic pickup queue',
      'Email support'
    ],
    studentLimit: 100,
    schoolLimit: 1,
    stripePriceId: 'price_1S0OokGHvMGa8SVhsSOpJRoK'
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Ideal for schools and small districts',
    price: 2999, // $29.99/month
    interval: 'month',
    features: [
      'Up to 1,000 students',
      'Up to 5 schools',
      'QR code + License plate OCR',
      'Advanced analytics',
      'Multi-school management',
      'Priority support',
      'Custom branding'
    ],
    studentLimit: 1000,
    schoolLimit: 5,
    stripePriceId: 'price_1S0OolGHvMGa8SVhVBqXsHyN',
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large districts and organizations',
    price: 9999, // $99.99/month
    interval: 'month',
    features: [
      'Unlimited students',
      'Unlimited schools',
      'All features included',
      'API access',
      'Custom reporting',
      'Dedicated support',
      'SLA guarantee',
      'Custom integrations'
    ],
    studentLimit: null,
    schoolLimit: null,
    stripePriceId: 'price_1S0OolGHvMGa8SVh70orLRU2'
  }
]

export class SubscriptionService {
  // Check if user is admin
  static isAdmin(email: string): boolean {
    return email === 'bryon.bowers@gmail.com'
  }

  // Get user's current subscription
  static async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      console.log('🔍 Fetching subscription for user:', userId)
      const subscriptionRef = doc(db, 'subscriptions', userId)
      const subscriptionDoc = await getDoc(subscriptionRef)
      
      if (!subscriptionDoc.exists()) {
        console.log('❌ No subscription document found for user:', userId)
        return null
      }
      
      const data = subscriptionDoc.data()
      console.log('📄 Raw subscription data:', data)
      
      const subscription = {
        ...data,
        currentPeriodStart: data.currentPeriodStart?.toDate(),
        currentPeriodEnd: data.currentPeriodEnd?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
        trialEndsAt: data.trialEndsAt?.toDate()
      } as UserSubscription
      
      console.log('✅ Processed subscription:', subscription)
      return subscription
    } catch (error) {
      console.error('❌ Error fetching user subscription:', error)
      return null
    }
  }

  // Get all subscriptions (admin only)
  static async getAllSubscriptions(): Promise<UserSubscription[]> {
    try {
      const subscriptionsRef = collection(db, 'subscriptions')
      const q = query(subscriptionsRef, orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        currentPeriodStart: doc.data().currentPeriodStart.toDate(),
        currentPeriodEnd: doc.data().currentPeriodEnd.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
        trialEndsAt: doc.data().trialEndsAt?.toDate()
      })) as UserSubscription[]
    } catch (error) {
      console.error('Error fetching all subscriptions:', error)
      return []
    }
  }

  // Check if subscription status is considered active/valid
  static isValidSubscriptionStatus(status: string): boolean {
    return ['active', 'trialing', 'incomplete', 'past_due'].includes(status)
  }

  // Check if user has access to feature
  static async checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
    // Admin always has access
    const userDoc = await getDoc(doc(db, 'users', userId))
    const userData = userDoc.data()
    if (userData && this.isAdmin(userData.email)) {
      return true
    }

    const subscription = await this.getUserSubscription(userId)
    if (!subscription || !this.isValidSubscriptionStatus(subscription.status)) {
      return false
    }

    const plan = subscriptionPlans.find(p => p.id === subscription.planId)
    if (!plan) return false

    // Check feature access based on plan
    switch (feature) {
      case 'license_plate_ocr':
        return ['professional', 'enterprise'].includes(plan.id)
      case 'multi_school':
        return plan.schoolLimit === null || plan.schoolLimit > 1
      case 'analytics':
        return ['professional', 'enterprise'].includes(plan.id)
      case 'api_access':
        return plan.id === 'enterprise'
      case 'custom_branding':
        return ['professional', 'enterprise'].includes(plan.id)
      default:
        return true // Basic features available to all
    }
  }

  // Check usage limits
  static async checkUsageLimits(userId: string): Promise<{
    canCreateStudent: boolean
    canCreateSchool: boolean
    studentsUsed: number
    schoolsUsed: number
    studentsLimit: number | null
    schoolsLimit: number | null
  }> {
    // Admin has no limits
    const userDoc = await getDoc(doc(db, 'users', userId))
    const userData = userDoc.data()
    if (userData && this.isAdmin(userData.email)) {
      return {
        canCreateStudent: true,
        canCreateSchool: true,
        studentsUsed: 0,
        schoolsUsed: 0,
        studentsLimit: null,
        schoolsLimit: null
      }
    }

    const subscription = await this.getUserSubscription(userId)
    if (!subscription || !this.isValidSubscriptionStatus(subscription.status)) {
      return {
        canCreateStudent: false,
        canCreateSchool: false,
        studentsUsed: 0,
        schoolsUsed: 0,
        studentsLimit: 0,
        schoolsLimit: 0
      }
    }

    const plan = subscriptionPlans.find(p => p.id === subscription.planId)
    if (!plan) {
      return {
        canCreateStudent: false,
        canCreateSchool: false,
        studentsUsed: 0,
        schoolsUsed: 0,
        studentsLimit: 0,
        schoolsLimit: 0
      }
    }

    // Get current usage
    const studentsQuery = query(
      collection(db, 'students'), 
      where('parentId', '==', userId)
    )
    const studentsSnapshot = await getDocs(studentsQuery)
    const studentsUsed = studentsSnapshot.size

    const schoolsQuery = query(
      collection(db, 'schools'),
      where('ownerId', '==', userId)
    )
    const schoolsSnapshot = await getDocs(schoolsQuery)
    const schoolsUsed = schoolsSnapshot.size

    return {
      canCreateStudent: plan.studentLimit === null || studentsUsed < plan.studentLimit,
      canCreateSchool: plan.schoolLimit === null || schoolsUsed < plan.schoolLimit,
      studentsUsed,
      schoolsUsed,
      studentsLimit: plan.studentLimit,
      schoolsLimit: plan.schoolLimit
    }
  }

  // Create Stripe checkout session
  static async createCheckoutSession(planId: string, userId: string, successUrl?: string, cancelUrl?: string): Promise<boolean> {
    try {
      console.log('Creating checkout session for:', { planId, userId })
      
      const response = await fetch('https://api-ns2ux2jxra-uc.a.run.app/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          userId,
          successUrl: successUrl || `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: cancelUrl || `${window.location.origin}/subscription?checkout=canceled`
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Checkout session creation failed:', errorData)
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { sessionId } = await response.json()
      console.log('Checkout session created:', sessionId)
      
      // Load and initialize Stripe
      console.log('Loading Stripe...')
      const stripe = await stripePromise
      
      if (!stripe) {
        console.error('Stripe failed to load')
        throw new Error('Stripe failed to load. Please check your internet connection and try again.')
      }
      
      console.log('Stripe loaded successfully, redirecting to checkout...')
      
      // Redirect to Stripe Checkout with only sessionId
      const { error } = await stripe.redirectToCheckout({ 
        sessionId
      })
      
      if (error) {
        console.error('Stripe redirect error:', error)
        throw new Error(`Stripe checkout error: ${error.message}`)
      }
      
      return true
    } catch (error) {
      console.error('Error in createCheckoutSession:', error)
      throw error
    }
  }

  // Redirect to Stripe checkout
  static async redirectToCheckout(planId: string, userId: string): Promise<void> {
    try {
      const stripe = await stripePromise
      if (!stripe) throw new Error('Stripe failed to load')

      // Get checkout session URL and redirect
      await this.createCheckoutSession(planId, userId)
    } catch (error) {
      console.error('Error redirecting to checkout:', error)
      throw error
    }
  }

  // Cancel subscription
  static async cancelSubscription(userId: string): Promise<void> {
    try {
      const response = await fetch('https://api-ns2ux2jxra-uc.a.run.app/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to cancel subscription')
      }

      return await response.json()
    } catch (error) {
      console.error('Error canceling subscription:', error)
      throw error
    }
  }

  // Manually sync subscription from Stripe (force refresh)
  static async syncSubscriptionFromStripe(userId: string): Promise<boolean> {
    try {
      console.log('🔄 Manually syncing subscription from Stripe for user:', userId)
      
      const response = await fetch('https://api-ns2ux2jxra-uc.a.run.app/subscription/' + userId, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        console.error('Failed to sync subscription:', response.statusText)
        return false
      }

      const data = await response.json()
      console.log('🔄 Sync response:', data)
      return !!data.subscription
    } catch (error) {
      console.error('Error syncing subscription:', error)
      return false
    }
  }

  // Get user usage data
  static async getUserUsage(userId: string): Promise<{studentCount: number, schoolCount: number}> {
    try {
      // Get current usage
      const studentsQuery = query(
        collection(db, 'students'), 
        where('parentId', '==', userId)
      )
      const studentsSnapshot = await getDocs(studentsQuery)

      const schoolsQuery = query(
        collection(db, 'schools'),
        where('ownerId', '==', userId)
      )
      const schoolsSnapshot = await getDocs(schoolsQuery)

      return {
        studentCount: studentsSnapshot.size,
        schoolCount: schoolsSnapshot.size
      }
    } catch (error) {
      console.error('Error fetching user usage:', error)
      return { studentCount: 0, schoolCount: 0 }
    }
  }

  // Get usage statistics (admin only)
  static async getUsageStats(userId: string): Promise<UsageStats> {
    try {
      // Get user's students
      const studentsQuery = query(
        collection(db, 'students'),
        where('parentId', '==', userId)
      )
      const studentsSnapshot = await getDocs(studentsQuery)

      // Get user's vehicles
      const vehiclesQuery = query(
        collection(db, 'vehicles'),
        where('parentId', '==', userId)
      )
      const vehiclesSnapshot = await getDocs(vehiclesQuery)

      // Get user's schools
      const schoolsQuery = query(
        collection(db, 'schools'),
        where('ownerId', '==', userId)
      )
      const schoolsSnapshot = await getDocs(schoolsQuery)

      return {
        studentsCreated: studentsSnapshot.size,
        vehiclesCreated: vehiclesSnapshot.size,
        queueJoins: 0, // Would need to track this separately
        schoolsCreated: schoolsSnapshot.size,
        monthlyActiveUsers: 1 // Simplified for now
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error)
      return {
        studentsCreated: 0,
        vehiclesCreated: 0,
        queueJoins: 0,
        schoolsCreated: 0,
        monthlyActiveUsers: 0
      }
    }
  }
}

export const subscriptionService = SubscriptionService
export default SubscriptionService
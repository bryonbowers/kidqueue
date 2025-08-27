export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number // in cents
  interval: 'month' | 'year'
  features: string[]
  studentLimit: number | null // null = unlimited
  schoolLimit: number | null // null = unlimited
  stripePriceId: string
  popular?: boolean
}

export interface UserSubscription {
  id: string
  userId: string
  planId: string
  stripeSubscriptionId: string
  stripeCustomerId: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  createdAt: Date
  updatedAt: Date
  trialEndsAt?: Date
}

export interface Subscription {
  id: string
  userId: string
  planId: string
  stripeSubscriptionId: string
  stripeCustomerId: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
  currentPeriodStart: any // Firestore timestamp
  currentPeriodEnd: any // Firestore timestamp
  cancelAtPeriodEnd: boolean
  createdAt: any // Firestore timestamp
  updatedAt: any // Firestore timestamp
  trialEndsAt?: any // Firestore timestamp
}

export interface PaymentMethod {
  id: string
  type: string
  card?: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  }
  isDefault: boolean
}

export interface UsageStats {
  studentsCreated: number
  vehiclesCreated: number
  queueJoins: number
  schoolsCreated: number
  monthlyActiveUsers: number
}
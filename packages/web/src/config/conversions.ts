// Conversion tracking configuration for KidQueue
// These represent key business metrics and user milestones

export interface ConversionConfig {
  name: string
  description: string
  value: number
  category: 'user_onboarding' | 'feature_adoption' | 'engagement' | 'retention' | 'success'
}

export const CONVERSION_EVENTS: Record<string, ConversionConfig> = {
  // User Onboarding Conversions
  user_signed_up: {
    name: 'user_signed_up',
    description: 'User successfully created account',
    value: 10,
    category: 'user_onboarding'
  },
  
  profile_completed: {
    name: 'profile_completed',
    description: 'User completed their profile setup',
    value: 5,
    category: 'user_onboarding'
  },

  // Feature Adoption Conversions
  first_student_added: {
    name: 'first_student_added',
    description: 'User added their first student',
    value: 20,
    category: 'feature_adoption'
  },

  first_vehicle_added: {
    name: 'first_vehicle_added',
    description: 'User added their first vehicle',
    value: 25,
    category: 'feature_adoption'
  },

  first_qr_generated: {
    name: 'first_qr_generated',
    description: 'User generated their first QR code',
    value: 15,
    category: 'feature_adoption'
  },

  // Queue Management Conversions (Core Business Value)
  first_queue_join: {
    name: 'first_queue_join',
    description: 'User joined queue for the first time',
    value: 50,
    category: 'success'
  },

  queue_joined: {
    name: 'queue_joined',
    description: 'User successfully joined pickup queue',
    value: 30,
    category: 'success'
  },

  successful_pickup: {
    name: 'successful_pickup',
    description: 'Student was successfully picked up',
    value: 40,
    category: 'success'
  },

  // Teacher/Staff Conversions
  teacher_first_scan: {
    name: 'teacher_first_scan',
    description: 'Teacher performed first QR scan',
    value: 35,
    category: 'feature_adoption'
  },

  teacher_queue_managed: {
    name: 'teacher_queue_managed',
    description: 'Teacher successfully managed queue',
    value: 25,
    category: 'success'
  },

  // Engagement Conversions
  daily_active_user: {
    name: 'daily_active_user',
    description: 'User was active today',
    value: 5,
    category: 'engagement'
  },

  weekly_active_user: {
    name: 'weekly_active_user',
    description: 'User was active this week',
    value: 15,
    category: 'engagement'
  },

  power_user: {
    name: 'power_user',
    description: 'User has 5+ students and vehicles',
    value: 100,
    category: 'engagement'
  },

  // Feature Usage Conversions
  qr_scanner_used: {
    name: 'qr_scanner_used',
    description: 'User successfully used QR scanner',
    value: 20,
    category: 'feature_adoption'
  },

  mobile_app_used: {
    name: 'mobile_app_used',
    description: 'User accessed via mobile device',
    value: 15,
    category: 'feature_adoption'
  },

  // Retention Conversions
  user_returned_next_day: {
    name: 'user_returned_next_day',
    description: 'User returned the day after first use',
    value: 25,
    category: 'retention'
  },

  user_returned_week_later: {
    name: 'user_returned_week_later',
    description: 'User returned a week after first use',
    value: 50,
    category: 'retention'
  },

  // Error and Support Conversions (negative values to track issues)
  critical_error: {
    name: 'critical_error',
    description: 'User encountered critical error',
    value: -10,
    category: 'engagement'
  },

  user_frustrated: {
    name: 'user_frustrated',
    description: 'User showed signs of frustration (multiple failed attempts)',
    value: -5,
    category: 'engagement'
  }
}

// Helper function to get conversion value
export const getConversionValue = (conversionName: string): number => {
  return CONVERSION_EVENTS[conversionName]?.value || 1
}

// Helper function to check if conversion should be tracked
export const shouldTrackConversion = (conversionName: string): boolean => {
  return conversionName in CONVERSION_EVENTS
}

// Get conversions by category
export const getConversionsByCategory = (category: ConversionConfig['category']) => {
  return Object.values(CONVERSION_EVENTS).filter(conv => conv.category === category)
}

export default CONVERSION_EVENTS
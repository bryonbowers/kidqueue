import { getAnalytics, logEvent, setUserProperties, setUserId } from 'firebase/analytics'
import app from '../config/firebase'

// Initialize Analytics only if measurement ID is provided
let analytics: any = null

try {
  // Check if Analytics is configured (measurement ID provided)
  const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  
  if (measurementId && measurementId !== 'undefined') {
    analytics = getAnalytics(app)
    console.log('Google Analytics initialized successfully with ID:', measurementId)
  } else {
    console.log('Google Analytics disabled - no measurement ID configured')
  }
} catch (error) {
  console.warn('Google Analytics initialization failed:', error)
}

export interface AnalyticsEvent {
  action: string
  category?: string
  label?: string
  value?: number
  custom_parameters?: Record<string, any>
}

// Enhanced event tracking with detailed parameters
export const trackEvent = (eventName: string, parameters: Record<string, any> = {}) => {
  if (!analytics) return

  try {
    // Add common parameters to all events
    const enhancedParameters = {
      ...parameters,
      timestamp: new Date().toISOString(),
      page_location: window.location.href,
      page_title: document.title,
      user_agent: navigator.userAgent,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    }

    logEvent(analytics, eventName, enhancedParameters)
    console.log('Analytics Event:', eventName, enhancedParameters)
  } catch (error) {
    console.warn('Failed to track event:', error)
  }
}

// User identification and properties
export const identifyUser = (userId: string, properties: Record<string, any> = {}) => {
  if (!analytics) return

  try {
    setUserId(analytics, userId)
    setUserProperties(analytics, {
      ...properties,
      last_login: new Date().toISOString(),
    })
    console.log('User identified:', userId, properties)
  } catch (error) {
    console.warn('Failed to identify user:', error)
  }
}

// Page tracking
export const trackPageView = (path: string, title?: string) => {
  trackEvent('page_view', {
    page_path: path,
    page_title: title || document.title,
  })
}

// Authentication events
export const trackLogin = (method: string, userId?: string) => {
  trackEvent('login', {
    method,
    user_id: userId,
  })
}

export const trackSignUp = (method: string, userId?: string) => {
  trackEvent('sign_up', {
    method,
    user_id: userId,
  })
}

export const trackLogout = () => {
  trackEvent('logout')
}

// Student management events
export const trackStudentAdded = (studentData: {
  studentId: string
  grade: string
  parentId: string
  schoolId: string
}) => {
  trackEvent('student_added', {
    student_id: studentData.studentId,
    grade: studentData.grade,
    parent_id: studentData.parentId,
    school_id: studentData.schoolId,
    value: 1, // For conversion counting
  })
}

export const trackStudentUpdated = (studentId: string, changes: string[]) => {
  trackEvent('student_updated', {
    student_id: studentId,
    fields_changed: changes.join(','),
    changes_count: changes.length,
  })
}

export const trackStudentDeleted = (studentId: string) => {
  trackEvent('student_deleted', {
    student_id: studentId,
  })
}

// Vehicle management events
export const trackVehicleAdded = (vehicleData: {
  vehicleId: string
  licensePlate: string
  parentId: string
  studentIds: string[]
}) => {
  trackEvent('vehicle_added', {
    vehicle_id: vehicleData.vehicleId,
    license_plate: vehicleData.licensePlate.replace(/[^A-Z0-9]/g, ''), // Sanitized for privacy
    parent_id: vehicleData.parentId,
    students_count: vehicleData.studentIds.length,
    value: 1, // For conversion counting
  })
}

export const trackVehicleUpdated = (vehicleId: string, changes: string[]) => {
  trackEvent('vehicle_updated', {
    vehicle_id: vehicleId,
    fields_changed: changes.join(','),
    changes_count: changes.length,
  })
}

export const trackVehicleDeleted = (vehicleId: string) => {
  trackEvent('vehicle_deleted', {
    vehicle_id: vehicleId,
  })
}

// QR Code events
export const trackQRCodeGenerated = (type: 'student' | 'vehicle', id: string) => {
  trackEvent('qr_code_generated', {
    qr_type: type,
    item_id: id,
  })
}

export const trackQRCodeScanned = (type: 'student' | 'vehicle', method: 'camera' | 'manual', success: boolean) => {
  trackEvent('qr_code_scanned', {
    qr_type: type,
    scan_method: method,
    success,
    value: success ? 1 : 0,
  })
}

export const trackQRCodeDownloaded = (type: 'student' | 'vehicle', format: 'pdf' | 'png') => {
  trackEvent('qr_code_downloaded', {
    qr_type: type,
    download_format: format,
  })
}

// Queue management events
export const trackQueueJoined = (queueData: {
  studentIds: string[]
  vehicleId: string
  schoolId: string
  method: 'qr_scan' | 'manual'
  queuePosition: number
}) => {
  trackEvent('queue_joined', {
    students_count: queueData.studentIds.length,
    vehicle_id: queueData.vehicleId,
    school_id: queueData.schoolId,
    join_method: queueData.method,
    queue_position: queueData.queuePosition,
    value: 1, // Key conversion event
  })
}

export const trackQueueLeft = (reason: 'picked_up' | 'cancelled' | 'timeout', studentCount: number) => {
  trackEvent('queue_left', {
    reason,
    students_count: studentCount,
  })
}

export const trackQueueStatusChanged = (newStatus: 'waiting' | 'called' | 'picked_up', queuePosition: number) => {
  trackEvent('queue_status_changed', {
    new_status: newStatus,
    queue_position: queuePosition,
  })
}

// Teacher/Staff events
export const trackTeacherScan = (success: boolean, studentCount: number) => {
  trackEvent('teacher_scan', {
    success,
    students_affected: studentCount,
    value: success ? 1 : 0,
  })
}

export const trackQueueCleared = (clearedCount: number, schoolId: string) => {
  trackEvent('queue_cleared', {
    cleared_count: clearedCount,
    school_id: schoolId,
  })
}

// User engagement events
export const trackFeatureUsed = (feature: string, details?: Record<string, any>) => {
  trackEvent('feature_used', {
    feature_name: feature,
    ...details,
  })
}

export const trackError = (errorType: string, errorMessage: string, context?: Record<string, any>) => {
  trackEvent('error_occurred', {
    error_type: errorType,
    error_message: errorMessage.substring(0, 100), // Limit length
    ...context,
  })
}

export const trackPerformance = (metricName: string, value: number, context?: Record<string, any>) => {
  trackEvent('performance_metric', {
    metric_name: metricName,
    metric_value: value,
    ...context,
  })
}

// Navigation events
export const trackNavigation = (from: string, to: string, method: 'click' | 'back_button' | 'direct') => {
  trackEvent('navigation', {
    from_page: from,
    to_page: to,
    navigation_method: method,
  })
}

// Search and filter events
export const trackSearch = (query: string, resultCount: number, searchType: 'student' | 'vehicle' | 'general') => {
  trackEvent('search', {
    search_term: query.toLowerCase(),
    result_count: resultCount,
    search_type: searchType,
  })
}

// Custom conversion events
export const trackConversion = (conversionType: string, value?: number, details?: Record<string, any>) => {
  trackEvent('conversion', {
    conversion_type: conversionType,
    conversion_value: value || 1,
    ...details,
  })
}

// Session and engagement tracking
export const trackSessionStart = (userType: 'parent' | 'teacher' | 'admin') => {
  trackEvent('session_start', {
    user_type: userType,
    session_id: Date.now().toString(),
  })
}

export const trackEngagement = (timeSpent: number, pageViews: number, actionsPerformed: number) => {
  trackEvent('engagement_summary', {
    time_spent_seconds: timeSpent,
    page_views: pageViews,
    actions_performed: actionsPerformed,
    engagement_rate: actionsPerformed / Math.max(1, timeSpent / 60), // Actions per minute
  })
}

// A/B Test tracking
export const trackABTest = (testName: string, variant: string) => {
  trackEvent('ab_test', {
    test_name: testName,
    variant,
  })
}

// Device and technical info
export const trackTechnicalInfo = () => {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
  
  trackEvent('technical_info', {
    device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    browser_language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    connection_type: connection?.effectiveType || 'unknown',
    online_status: navigator.onLine,
    cookie_enabled: navigator.cookieEnabled,
  })
}

// Initialize session tracking
let sessionStartTime = Date.now()
let pageViews = 0
let actionsPerformed = 0

// Track page views automatically
export const initializeAnalytics = () => {
  // Track initial page load
  trackPageView(window.location.pathname)
  trackTechnicalInfo()
  pageViews++

  // Track page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      const timeSpent = Math.round((Date.now() - sessionStartTime) / 1000)
      trackEngagement(timeSpent, pageViews, actionsPerformed)
    }
  })

  // Track before page unload
  window.addEventListener('beforeunload', () => {
    const timeSpent = Math.round((Date.now() - sessionStartTime) / 1000)
    trackEngagement(timeSpent, pageViews, actionsPerformed)
  })
}

// Helper to increment action counter
export const incrementActionCounter = () => {
  actionsPerformed++
}

export default analytics
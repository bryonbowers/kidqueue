import { trackEvent, trackConversion } from '../utils/analytics'
import { CONVERSION_EVENTS, getConversionValue } from '../config/conversions'

// Local storage keys for tracking user milestones
const STORAGE_KEYS = {
  FIRST_STUDENT_ADDED: 'kidqueue_first_student_added',
  FIRST_VEHICLE_ADDED: 'kidqueue_first_vehicle_added', 
  FIRST_QUEUE_JOIN: 'kidqueue_first_queue_join',
  FIRST_QR_SCAN: 'kidqueue_first_qr_scan',
  FIRST_QR_GENERATED: 'kidqueue_first_qr_generated',
  LAST_ACTIVE_DATE: 'kidqueue_last_active_date',
  USER_SIGNUP_DATE: 'kidqueue_user_signup_date',
  CONSECUTIVE_DAYS: 'kidqueue_consecutive_days',
  TOTAL_SESSIONS: 'kidqueue_total_sessions'
}

class AnalyticsService {
  private userId: string | null = null
  private userRole: string | null = null
  private sessionStartTime: number = Date.now()

  // Initialize user session
  initializeUser(userId: string, userRole: string, isNewUser: boolean = false) {
    this.userId = userId
    this.userRole = userRole

    // Track new user signup
    if (isNewUser) {
      localStorage.setItem(STORAGE_KEYS.USER_SIGNUP_DATE, new Date().toISOString())
      this.trackMilestoneConversion('user_signed_up')
    }

    // Track daily/weekly active user
    this.trackActivityConversions()
    
    // Increment total sessions
    const totalSessions = parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_SESSIONS) || '0') + 1
    localStorage.setItem(STORAGE_KEYS.TOTAL_SESSIONS, totalSessions.toString())

    // Track session start
    trackEvent('session_start', {
      user_id: userId,
      user_role: userRole,
      session_number: totalSessions,
      is_new_user: isNewUser
    })
  }

  // Track milestone conversions (only fire once per user)
  trackMilestoneConversion(conversionName: string, additionalData?: Record<string, any>) {
    const storageKey = `kidqueue_milestone_${conversionName}`
    const alreadyTracked = localStorage.getItem(storageKey)

    if (!alreadyTracked) {
      const value = getConversionValue(conversionName)
      trackConversion(conversionName, value, additionalData)
      localStorage.setItem(storageKey, new Date().toISOString())
      
      console.log(`🎯 Milestone reached: ${conversionName}`)
      return true
    }
    return false
  }

  // Track activity-based conversions
  private trackActivityConversions() {
    const today = new Date().toDateString()
    const lastActive = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_DATE)
    
    if (lastActive !== today) {
      // Track daily active user
      this.trackMilestoneConversion('daily_active_user')
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_DATE, today)

      // Check for consecutive days
      if (lastActive) {
        const lastActiveDate = new Date(lastActive)
        const todayDate = new Date(today)
        const daysDiff = Math.floor((todayDate.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (daysDiff === 1) {
          // Consecutive day
          const consecutiveDays = parseInt(localStorage.getItem(STORAGE_KEYS.CONSECUTIVE_DAYS) || '0') + 1
          localStorage.setItem(STORAGE_KEYS.CONSECUTIVE_DAYS, consecutiveDays.toString())
          
          if (consecutiveDays === 2) {
            this.trackMilestoneConversion('user_returned_next_day')
          }
          if (consecutiveDays === 7) {
            this.trackMilestoneConversion('user_returned_week_later')
          }
        } else {
          // Reset consecutive days
          localStorage.setItem(STORAGE_KEYS.CONSECUTIVE_DAYS, '1')
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.CONSECUTIVE_DAYS, '1')
      }
    }

    // Track weekly active user (simplified - just track if active this week)
    const signupDate = localStorage.getItem(STORAGE_KEYS.USER_SIGNUP_DATE)
    if (signupDate) {
      const daysSinceSignup = Math.floor((Date.now() - new Date(signupDate).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceSignup >= 7) {
        this.trackMilestoneConversion('weekly_active_user')
      }
    }
  }

  // Student-related conversions
  trackStudentAdded(isFirstStudent: boolean, totalStudents: number) {
    trackEvent('student_added_detailed', {
      is_first_student: isFirstStudent,
      total_students: totalStudents,
      user_id: this.userId,
      user_role: this.userRole
    })

    if (isFirstStudent) {
      this.trackMilestoneConversion('first_student_added', { total_students: totalStudents })
    }

    // Track power user milestone
    if (totalStudents >= 5) {
      this.trackMilestoneConversion('power_user', { student_count: totalStudents })
    }
  }

  // Vehicle-related conversions
  trackVehicleAdded(isFirstVehicle: boolean, totalVehicles: number) {
    trackEvent('vehicle_added_detailed', {
      is_first_vehicle: isFirstVehicle,
      total_vehicles: totalVehicles,
      user_id: this.userId,
      user_role: this.userRole
    })

    if (isFirstVehicle) {
      this.trackMilestoneConversion('first_vehicle_added', { total_vehicles: totalVehicles })
    }
  }

  // QR Code conversions
  trackQRCodeGenerated(type: 'student' | 'vehicle', isFirstQR: boolean) {
    trackEvent('qr_code_generated_detailed', {
      qr_type: type,
      is_first_qr: isFirstQR,
      user_id: this.userId
    })

    if (isFirstQR) {
      this.trackMilestoneConversion('first_qr_generated', { qr_type: type })
    }
  }

  trackQRCodeScanned(success: boolean, method: 'camera' | 'manual', isFirstScan: boolean) {
    trackEvent('qr_scan_detailed', {
      success,
      scan_method: method,
      is_first_scan: isFirstScan,
      user_id: this.userId
    })

    if (success) {
      this.trackMilestoneConversion('qr_scanner_used', { method })
      
      if (isFirstScan && this.userRole === 'teacher') {
        this.trackMilestoneConversion('teacher_first_scan', { method })
      }
    }
  }

  // Queue conversions
  trackQueueJoined(isFirstTime: boolean, studentsCount: number, method: 'qr_scan' | 'manual') {
    trackEvent('queue_join_detailed', {
      is_first_time: isFirstTime,
      students_count: studentsCount,
      join_method: method,
      user_id: this.userId
    })

    // Always track queue joined conversion
    trackConversion('queue_joined', studentsCount, { 
      method, 
      students_count: studentsCount 
    })

    if (isFirstTime) {
      this.trackMilestoneConversion('first_queue_join', { 
        students_count: studentsCount,
        method 
      })
    }
  }

  trackSuccessfulPickup(studentsCount: number, waitTimeMinutes: number) {
    const value = getConversionValue('successful_pickup')
    trackConversion('successful_pickup', value * studentsCount, {
      students_count: studentsCount,
      wait_time_minutes: waitTimeMinutes,
      user_id: this.userId
    })
  }

  // Error tracking
  trackUserFrustration(context: string, attemptCount: number) {
    trackEvent('user_frustration', {
      context,
      attempt_count: attemptCount,
      user_id: this.userId
    })

    if (attemptCount >= 3) {
      const value = getConversionValue('user_frustrated')
      trackConversion('user_frustrated', value, { context, attempt_count: attemptCount })
    }
  }

  trackCriticalError(errorType: string, errorMessage: string, context?: string) {
    const value = getConversionValue('critical_error')
    trackConversion('critical_error', value, {
      error_type: errorType,
      error_message: errorMessage.substring(0, 100),
      context,
      user_id: this.userId
    })
  }

  // Session end tracking
  trackSessionEnd() {
    const sessionDuration = Math.round((Date.now() - this.sessionStartTime) / 1000)
    
    trackEvent('session_end', {
      session_duration_seconds: sessionDuration,
      user_id: this.userId,
      user_role: this.userRole
    })
  }

  // Device and context tracking
  trackDeviceInfo() {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent)
    const deviceType = isMobile ? 'mobile' : 'desktop'
    
    trackEvent('device_info', {
      device_type: deviceType,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      user_agent: navigator.userAgent.substring(0, 100),
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })

    if (isMobile) {
      this.trackMilestoneConversion('mobile_app_used', { device_type: deviceType })
    }
  }

  // Clean up on component unmount
  cleanup() {
    this.trackSessionEnd()
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService()
export default analyticsService
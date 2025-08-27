import { useCallback, useEffect, useContext } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/FirebaseAuthContext'
import SchoolContext from '../contexts/SchoolContext'
import * as analytics from '../utils/analytics'
import analyticsService from '../services/analyticsService'

export const useAnalytics = () => {
  const location = useLocation()
  const { user } = useAuth()
  
  // Safely try to get school context - might not be available in all components
  const schoolContext = useContext(SchoolContext)
  const currentSchool = schoolContext?.currentSchool || null
  const userRoleAtCurrentSchool = schoolContext?.userRoleAtCurrentSchool || null

  // Track page views on route changes
  useEffect(() => {
    analytics.trackPageView(location.pathname)
  }, [location.pathname])

  // Initialize analytics service when user authenticates
  useEffect(() => {
    if (user) {
      // Check if this is a new user (simplified check)
      const isNewUser = !localStorage.getItem(`kidqueue_user_${user.id}_seen`)
      if (isNewUser) {
        localStorage.setItem(`kidqueue_user_${user.id}_seen`, new Date().toISOString())
      }

      analyticsService.initializeUser(user.id, user.role, isNewUser)
      analyticsService.trackDeviceInfo()

      // Also use the original analytics for Firebase
      analytics.identifyUser(user.id, {
        user_role: user.role,
        current_school_id: currentSchool?.id,
        current_school_role: userRoleAtCurrentSchool,
        current_school_name: currentSchool?.name?.substring(0, 20),
        user_name: user.name.substring(0, 20), // Limit for privacy
        email_domain: user.email.split('@')[1], // Only domain, not full email
      })
    }
  }, [user, currentSchool?.id, userRoleAtCurrentSchool])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (user) {
        analyticsService.cleanup()
      }
    }
  }, [user])

  // Return tracking functions with action counter increment
  const trackWithIncrement = useCallback((trackFunction: () => void) => {
    analytics.incrementActionCounter()
    trackFunction()
  }, [])

  return {
    // Basic tracking
    trackEvent: analytics.trackEvent,
    trackPageView: analytics.trackPageView,
    trackError: analytics.trackError,
    trackFeatureUsed: analytics.trackFeatureUsed,
    trackNavigation: analytics.trackNavigation,
    
    // Authentication
    trackLogin: (method: string) => 
      trackWithIncrement(() => analytics.trackLogin(method, user?.id)),
    trackSignUp: (method: string) => 
      trackWithIncrement(() => analytics.trackSignUp(method, user?.id)),
    trackLogout: () => 
      trackWithIncrement(() => analytics.trackLogout()),
    
    // Student management
    trackStudentAdded: (studentData: Parameters<typeof analytics.trackStudentAdded>[0]) =>
      trackWithIncrement(() => analytics.trackStudentAdded(studentData)),
    trackStudentUpdated: (studentId: string, changes: string[]) =>
      trackWithIncrement(() => analytics.trackStudentUpdated(studentId, changes)),
    trackStudentDeleted: (studentId: string) =>
      trackWithIncrement(() => analytics.trackStudentDeleted(studentId)),
    
    // Vehicle management  
    trackVehicleAdded: (vehicleData: Parameters<typeof analytics.trackVehicleAdded>[0]) =>
      trackWithIncrement(() => analytics.trackVehicleAdded(vehicleData)),
    trackVehicleUpdated: (vehicleId: string, changes: string[]) =>
      trackWithIncrement(() => analytics.trackVehicleUpdated(vehicleId, changes)),
    trackVehicleDeleted: (vehicleId: string) =>
      trackWithIncrement(() => analytics.trackVehicleDeleted(vehicleId)),
    
    // QR Code tracking
    trackQRCodeGenerated: (type: 'student' | 'vehicle', id: string) =>
      trackWithIncrement(() => analytics.trackQRCodeGenerated(type, id)),
    trackQRCodeScanned: (type: 'student' | 'vehicle', method: 'camera' | 'manual', success: boolean) =>
      trackWithIncrement(() => analytics.trackQRCodeScanned(type, method, success)),
    trackQRCodeDownloaded: (type: 'student' | 'vehicle', format: 'pdf' | 'png') =>
      trackWithIncrement(() => analytics.trackQRCodeDownloaded(type, format)),
    
    // Queue management
    trackQueueJoined: (queueData: Parameters<typeof analytics.trackQueueJoined>[0]) =>
      trackWithIncrement(() => analytics.trackQueueJoined(queueData)),
    trackQueueLeft: (reason: 'picked_up' | 'cancelled' | 'timeout', studentCount: number) =>
      trackWithIncrement(() => analytics.trackQueueLeft(reason, studentCount)),
    trackQueueStatusChanged: (newStatus: 'waiting' | 'called' | 'picked_up', queuePosition: number) =>
      trackWithIncrement(() => analytics.trackQueueStatusChanged(newStatus, queuePosition)),
    trackQueueCleared: (clearedCount: number, schoolId: string) =>
      trackWithIncrement(() => analytics.trackQueueCleared(clearedCount, schoolId)),
    
    // Teacher events
    trackTeacherScan: (success: boolean, studentCount: number) =>
      trackWithIncrement(() => analytics.trackTeacherScan(success, studentCount)),
    
    // Conversions and engagement
    trackConversion: (conversionType: string, value?: number, details?: Record<string, any>) =>
      trackWithIncrement(() => analytics.trackConversion(conversionType, value, details)),
    trackSearch: (query: string, resultCount: number, searchType: 'student' | 'vehicle' | 'general') =>
      trackWithIncrement(() => analytics.trackSearch(query, resultCount, searchType)),
    trackPerformance: analytics.trackPerformance,
    
    // Increment action counter for any custom tracking
    incrementAction: analytics.incrementActionCounter,

    // Enhanced analytics service methods
    trackStudentAddedEnhanced: (isFirst: boolean, total: number) => 
      analyticsService.trackStudentAdded(isFirst, total),
    trackVehicleAddedEnhanced: (isFirst: boolean, total: number) => 
      analyticsService.trackVehicleAdded(isFirst, total),
    trackQRGeneratedEnhanced: (type: 'student' | 'vehicle', isFirst: boolean) => 
      analyticsService.trackQRCodeGenerated(type, isFirst),
    trackQRScannedEnhanced: (success: boolean, method: 'camera' | 'manual', isFirst: boolean) => 
      analyticsService.trackQRCodeScanned(success, method, isFirst),
    trackQueueJoinedEnhanced: (isFirst: boolean, count: number, method: 'qr_scan' | 'manual') => 
      analyticsService.trackQueueJoined(isFirst, count, method),
    trackSuccessfulPickupEnhanced: (count: number, waitTime: number) => 
      analyticsService.trackSuccessfulPickup(count, waitTime),
    trackUserFrustration: (context: string, attempts: number) => 
      analyticsService.trackUserFrustration(context, attempts),
    trackCriticalError: (type: string, message: string, context?: string) => 
      analyticsService.trackCriticalError(type, message, context),

    // School-specific tracking
    trackSchoolCreated: (schoolName: string) => 
      trackWithIncrement(() => analytics.trackConversion('school_created', 1, { school_name: schoolName.substring(0, 20) })),
    trackSchoolSwitched: (fromSchool: string, toSchool: string) =>
      trackWithIncrement(() => analytics.trackEvent('school_switched', { from_school: fromSchool, to_school: toSchool })),
    trackMultiSchoolUser: (schoolCount: number) =>
      trackWithIncrement(() => analytics.trackConversion('multi_school_user', schoolCount, { school_count: schoolCount })),
      
    // Current school context
    currentSchoolInfo: {
      id: currentSchool?.id,
      name: currentSchool?.name,
      userRole: userRoleAtCurrentSchool
    },
  }
}
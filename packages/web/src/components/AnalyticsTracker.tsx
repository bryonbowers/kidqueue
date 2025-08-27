import { useEffect } from 'react'
import { useAuth } from '../contexts/FirebaseAuthContext'
import * as analytics from '../utils/analytics'

interface AnalyticsTrackerProps {
  children: React.ReactNode
}

export const AnalyticsTracker: React.FC<AnalyticsTrackerProps> = ({ children }) => {
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      // Set user properties for segmentation
      analytics.identifyUser(user.id, {
        user_role: user.role,
        school_id: user.schoolId,
        registration_date: user.createdAt || new Date().toISOString(),
        last_activity: new Date().toISOString(),
        // Hash email domain for privacy
        email_domain: user.email.split('@')[1],
      })

      // Track user milestones based on role
      if (user.role === 'parent') {
        analytics.trackConversion('parent_active_session', 1, {
          user_type: 'parent',
          school_id: user.schoolId,
        })
      } else if (user.role === 'teacher') {
        analytics.trackConversion('teacher_active_session', 1, {
          user_type: 'teacher',
          school_id: user.schoolId,
        })
      }
    }
  }, [user])

  return <>{children}</>
}

export default AnalyticsTracker
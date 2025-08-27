import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../contexts/FirebaseAuthContext'
import { useSchool } from '../contexts/SchoolContext'
import { 
  ActiveUser,
  setUserActive, 
  setUserInactive, 
  subscribeToActiveUsers,
  subscribeToAllActiveUsers,
  sendHeartbeat 
} from '../services/activeUsersService'

export const useActiveUsers = (showAllUsers = false) => {
  const { user } = useAuth()
  const { currentSchool } = useSchool()
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [isTracking, setIsTracking] = useState(false)

  // Initialize user tracking when they log in
  const startTracking = useCallback(async () => {
    if (!user?.id || isTracking) return

    try {
      await setUserActive(user.id, {
        name: user.name || 'Unknown User',
        email: user.email || '',
        role: user.role,
        schoolId: user.schoolId || currentSchool?.id
      })
      setIsTracking(true)
      console.log('[ACTIVE USERS] Started tracking user:', user.id)
    } catch (error) {
      console.error('[ACTIVE USERS] Error starting tracking:', error)
    }
  }, [user, currentSchool, isTracking])

  // Stop user tracking when they log out or leave
  const stopTracking = useCallback(async () => {
    if (!user?.id || !isTracking) return

    try {
      await setUserInactive(user.id)
      setIsTracking(false)
      console.log('[ACTIVE USERS] Stopped tracking user:', user.id)
    } catch (error) {
      console.error('[ACTIVE USERS] Error stopping tracking:', error)
    }
  }, [user, isTracking])

  // Send periodic heartbeat to keep user active
  useEffect(() => {
    if (!user?.id || !isTracking) return

    const interval = setInterval(() => {
      sendHeartbeat(user.id)
    }, 30000) // Send heartbeat every 30 seconds

    return () => clearInterval(interval)
  }, [user, isTracking])

  // Subscribe to active users
  useEffect(() => {
    if (showAllUsers) {
      // Admin view - show all active users
      const unsubscribe = subscribeToAllActiveUsers(setActiveUsers)
      return unsubscribe
    } else {
      // School view - show only school users
      const unsubscribe = subscribeToActiveUsers(
        currentSchool?.id || user?.schoolId,
        setActiveUsers
      )
      return unsubscribe
    }
  }, [showAllUsers, currentSchool, user])

  // Start tracking on mount, stop on unmount
  useEffect(() => {
    if (user?.id) {
      startTracking()
    }

    // Cleanup on unmount or user change
    return () => {
      if (isTracking) {
        stopTracking()
      }
    }
  }, [user?.id])

  // Handle page visibility change (user switches tabs/minimizes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched away from tab - could optionally mark as away
        console.log('[ACTIVE USERS] User went away')
      } else {
        // User came back to tab - send heartbeat
        if (user?.id && isTracking) {
          sendHeartbeat(user.id)
          console.log('[ACTIVE USERS] User came back')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, isTracking])

  // Handle beforeunload (user closes tab/browser)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user?.id && isTracking) {
        // Use sendBeacon for reliable cleanup on page unload
        navigator.sendBeacon('/api/user-offline', JSON.stringify({ userId: user.id }))
        // Also try regular cleanup (may not complete)
        setUserInactive(user.id)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [user, isTracking])

  return {
    activeUsers,
    isTracking,
    startTracking,
    stopTracking,
    totalUsers: activeUsers.length
  }
}

export default useActiveUsers
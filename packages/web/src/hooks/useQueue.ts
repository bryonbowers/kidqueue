import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/FirebaseAuthContext'
import { useSchool } from '../contexts/SchoolContext'
import useSchoolFirebase from './useSchoolFirebase'

// Unified queue hook that all pages should use
// Ensures consistent data access across all views
export const useQueue = () => {
  const { user } = useAuth()
  const { currentSchool } = useSchool()
  const schoolFirebase = useSchoolFirebase()
  const queryClient = useQueryClient()

  // Single source of truth for queue data - ALL queue entries for the school
  const { data: allQueueEntries, isLoading: isLoadingAll, error: allQueueError, refetch: refetchAll } = useQuery({
    queryKey: ['school-queue', currentSchool?.id],
    queryFn: async () => {
      if (!currentSchool?.id) return []
      
      return new Promise<any[]>((resolve) => {
        // Use the established real-time queue service
        const unsubscribe = schoolFirebase.getQueueBySchool(async (entries) => {
          try {
            // Enrich entries with student and vehicle details
            const { doc, getDoc } = await import('firebase/firestore')
            const { db } = await import('../config/firebase')
            
            const enrichedEntries = await Promise.all(
              entries.map(async (entry: any) => {
                try {
                  // Get student details
                  let student = null
                  if (entry.studentId) {
                    const studentDoc = await getDoc(doc(db, 'students', entry.studentId))
                    if (studentDoc.exists()) {
                      student = { id: studentDoc.id, ...studentDoc.data() }
                    }
                  }
                  
                  // Get parent details
                  let parent = null
                  if (entry.parentId) {
                    const parentDoc = await getDoc(doc(db, 'users', entry.parentId))
                    if (parentDoc.exists()) {
                      parent = { id: parentDoc.id, ...parentDoc.data() }
                    }
                  }
                  
                  // Get vehicle details
                  let vehicle = null
                  if (entry.vehicleId) {
                    const vehicleDoc = await getDoc(doc(db, 'vehicles', entry.vehicleId))
                    if (vehicleDoc.exists()) {
                      vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() }
                    }
                  }
                  
                  return {
                    ...entry,
                    student,
                    parent,
                    vehicle
                  }
                } catch (err) {
                  console.error('[QUEUE HOOK] Error enriching entry:', err)
                  return entry
                }
              })
            )
            
            console.log('[QUEUE HOOK] Enriched queue entries:', enrichedEntries)
            resolve(enrichedEntries)
          } catch (error) {
            console.error('[QUEUE HOOK] Error enriching entries:', error)
            resolve(entries) // Return raw entries if enrichment fails
          }
        })
        
        // Return cleanup function
        return unsubscribe
      })
    },
    enabled: !!currentSchool?.id,
    refetchInterval: 5000, // Refresh every 5 seconds for live updates
    staleTime: 0, // Always consider data stale to get real-time updates
  })

  // Derived data - current user's queue entries only
  const currentUserQueueEntries = allQueueEntries?.filter(entry => entry.parentId === user?.id) || []

  // Derived data - waiting students
  const waitingEntries = allQueueEntries?.filter(entry => entry.status === 'waiting') || []

  // Derived data - called students  
  const calledEntries = allQueueEntries?.filter(entry => entry.status === 'called') || []

  // Derived data - picked up students (for history)
  const pickedUpEntries = allQueueEntries?.filter(entry => entry.status === 'picked_up') || []

  // Function to invalidate and refresh queue data
  const refreshQueue = () => {
    queryClient.invalidateQueries({ queryKey: ['school-queue'] })
  }

  // Function to calculate estimated pickup time
  // Each car takes 30 seconds, so position * 30 seconds from now
  const getEstimatedPickupTime = (queuePosition: number) => {
    const secondsUntilPickup = (queuePosition - 1) * 30 // Position 1 = now, position 2 = 30 seconds, etc.
    const pickupTime = new Date(Date.now() + secondsUntilPickup * 1000)
    return pickupTime
  }

  // Function to format pickup time for display
  const formatEstimatedTime = (queuePosition: number) => {
    if (queuePosition <= 1) return "Now"
    
    const secondsUntilPickup = (queuePosition - 1) * 30
    const minutes = Math.floor(secondsUntilPickup / 60)
    const seconds = secondsUntilPickup % 60
    
    if (minutes === 0) {
      return `${seconds}s`
    } else if (seconds === 0) {
      return `${minutes}m`
    } else {
      return `${minutes}m ${seconds}s`
    }
  }

  // Function to get queue statistics
  const getQueueStats = () => ({
    total: allQueueEntries?.length || 0,
    waiting: waitingEntries.length,
    called: calledEntries.length,
    userEntries: currentUserQueueEntries.length,
    isEmpty: (allQueueEntries?.length || 0) === 0
  })

  return {
    // All queue data (for kiosk, teacher dashboard)
    allQueueEntries: allQueueEntries || [],
    
    // Filtered data
    currentUserQueueEntries,
    waitingEntries,
    calledEntries,
    pickedUpEntries,
    
    // Loading states
    isLoading: isLoadingAll,
    error: allQueueError,
    
    // Actions
    refreshQueue,
    refetch: refetchAll,
    
    // Statistics
    stats: getQueueStats(),
    
    // Pickup time estimation
    getEstimatedPickupTime,
    formatEstimatedTime,
    
    // School info
    currentSchool,
    user
  }
}

export default useQueue
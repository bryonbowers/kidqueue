import { useCallback } from 'react'
import { useSchool } from '../contexts/SchoolContext'
import { useAuth } from '../contexts/FirebaseAuthContext'
import * as firebaseService from '../services/firebaseService'

// Hook that provides school-aware Firebase service methods
export const useSchoolFirebase = () => {
  const { currentSchool } = useSchool()
  const { user } = useAuth()

  // Get students for current user and school
  const getStudents = useCallback(async () => {
    if (!user?.id || !currentSchool?.id) return []
    
    console.log('[SCHOOL FIREBASE] Getting students for user:', user.id, 'school:', currentSchool.id)
    const students = await firebaseService.getStudentsByParent(user.id)
    
    // Filter by current school
    return students.filter(student => student.schoolId === currentSchool.id)
  }, [user?.id, currentSchool?.id])

  // Get vehicles for current user and school
  const getVehicles = useCallback(async () => {
    if (!user?.id || !currentSchool?.id) return []
    
    console.log('[SCHOOL FIREBASE] Getting vehicles for user:', user.id, 'school:', currentSchool.id)
    const vehicles = await firebaseService.getVehiclesByParent(user.id)
    
    // Note: Vehicles aren't directly tied to schools, but students associated with vehicles are
    // For now, return all vehicles for the user
    return vehicles
  }, [user?.id, currentSchool?.id])

  // Create student with current school
  const createStudent = useCallback(async (studentData: Omit<firebaseService.Student, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user?.id || !currentSchool?.id) {
      throw new Error('No user or school selected')
    }

    const studentWithSchool = {
      ...studentData,
      parentId: user.id,
      schoolId: currentSchool.id
    }

    console.log('[SCHOOL FIREBASE] Creating student for school:', currentSchool.id)
    return await firebaseService.createStudent(studentWithSchool)
  }, [user?.id, currentSchool?.id])

  // Create vehicle (vehicles are user-scoped, not school-scoped)
  const createVehicle = useCallback(async (vehicleData: Omit<firebaseService.Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user?.id) {
      throw new Error('No user logged in')
    }

    const vehicleWithUser = {
      ...vehicleData,
      parentId: user.id
    }

    console.log('[SCHOOL FIREBASE] Creating vehicle for user:', user.id)
    return await firebaseService.createVehicle(vehicleWithUser)
  }, [user?.id])

  // School-aware queue operations
  const addToQueue = useCallback(async (queueData: Omit<firebaseService.QueueEntry, 'id' | 'enteredAt'>) => {
    if (!currentSchool?.id) {
      throw new Error('No school selected')
    }

    const queueWithSchool = {
      ...queueData,
      schoolId: currentSchool.id
    }

    console.log('[SCHOOL FIREBASE] Adding to queue for school:', currentSchool.id)
    return await firebaseService.addToQueue(queueWithSchool)
  }, [currentSchool?.id])

  // Add vehicle to queue for current school
  const addVehicleToQueue = useCallback(async (vehicleId: string) => {
    if (!user?.id || !currentSchool?.id) {
      throw new Error('No user or school selected')
    }

    console.log('[SCHOOL FIREBASE] Adding vehicle to queue for school:', currentSchool.id)
    return await firebaseService.addVehicleToQueue(vehicleId, user.id, currentSchool.id)
  }, [user?.id, currentSchool?.id])

  // Remove vehicle from queue for current school
  const removeVehicleFromQueue = useCallback(async (vehicleId: string) => {
    console.log('[SCHOOL FIREBASE] Removing vehicle from queue')
    return await firebaseService.removeVehicleFromQueue(vehicleId)
  }, [])

  // Clear all queue for current school
  const clearAllQueue = useCallback(async () => {
    if (!currentSchool?.id) {
      throw new Error('No school selected')
    }

    console.log('[SCHOOL FIREBASE] Clearing all queue for school:', currentSchool.id)
    return await firebaseService.clearAllQueue(currentSchool.id)
  }, [currentSchool?.id])

  // Get queue for current school
  const getQueueBySchool = useCallback((callback: (entries: firebaseService.QueueEntry[]) => void) => {
    if (!currentSchool?.id) {
      console.warn('[SCHOOL FIREBASE] No school selected for queue subscription')
      callback([])
      return () => {} // Return empty unsubscribe function
    }

    console.log('[SCHOOL FIREBASE] Subscribing to queue for school:', currentSchool.id)
    return firebaseService.getQueueBySchool(currentSchool.id, callback)
  }, [currentSchool?.id])

  // Get queue entries for current user and school
  const getCurrentUserQueue = useCallback(async () => {
    if (!user?.id || !currentSchool?.id) return []

    try {
      const schoolId = currentSchool.id
      console.log('[SCHOOL FIREBASE] Getting queue for user:', user.id, 'school:', schoolId)
      
      const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore')
      const { db } = await import('../config/firebase')
      
      // Get queue entries for current user and school
      const q = query(
        collection(db, 'queue'),
        where('parentId', '==', user.id),
        where('schoolId', '==', schoolId),
        where('status', 'in', ['waiting', 'called'])
      )
      
      const snapshot = await getDocs(q)
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // Enrich with student and vehicle details
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
            
            // Get vehicle details
            let vehicle = null
            if (entry.vehicleId) {
              const vehicleDoc = await getDoc(doc(db, 'vehicles', entry.vehicleId))
              if (vehicleDoc.exists()) {
                vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() }
              }
            }
            
            return { ...entry, student, vehicle }
          } catch (err) {
            console.error('[SCHOOL FIREBASE] Error enriching entry:', err)
            return entry
          }
        })
      )
      
      return enrichedEntries
    } catch (error) {
      console.error('[SCHOOL FIREBASE] Error fetching user queue:', error)
      return []
    }
  }, [user?.id, currentSchool?.id])

  return {
    // Current school info
    currentSchool,
    
    // Student operations
    getStudents,
    createStudent,
    updateStudent: firebaseService.updateStudent,
    deleteStudent: firebaseService.deleteStudent,
    
    // Vehicle operations
    getVehicles,
    createVehicle,
    updateVehicle: firebaseService.updateVehicle,
    deleteVehicle: firebaseService.deleteVehicle,
    
    // Queue operations
    addToQueue,
    addVehicleToQueue,
    removeVehicleFromQueue,
    clearAllQueue,
    getQueueBySchool,
    getCurrentUserQueue,
    
    // QR operations (these work across schools)
    getVehicleByQRCode: firebaseService.getVehicleByQRCode,
    generateQRData: firebaseService.generateQRData,
    generateVehicleQRData: firebaseService.generateVehicleQRData,
    
    // Utility functions
    updateQueueEntry: firebaseService.updateQueueEntry,
    removeFromQueue: firebaseService.removeFromQueue,
  }
}

export default useSchoolFirebase
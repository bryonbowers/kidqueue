import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  getDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '../config/firebase'

export interface QueueEntry {
  id?: string
  studentId: string
  vehicleId?: string
  schoolId: string
  parentId: string
  status: 'waiting' | 'called' | 'picked_up'
  queuePosition: number
  enteredAt: Timestamp
  calledAt?: Timestamp
  pickedUpAt?: Timestamp
  teacherId?: string
}

export class QueueService {
  
  // Add a student to the queue
  static async addToQueue(entry: Omit<QueueEntry, 'id' | 'enteredAt' | 'queuePosition'>) {
    try {
      // Get current queue position
      const q = query(
        collection(db, 'queue'),
        where('schoolId', '==', entry.schoolId),
        where('status', 'in', ['waiting', 'called']),
        orderBy('queuePosition', 'desc')
      )
      const snapshot = await getDocs(q)
      const maxPosition = snapshot.empty ? 0 : snapshot.docs[0].data().queuePosition
      
      const queueEntry: Omit<QueueEntry, 'id'> = {
        ...entry,
        status: 'waiting',
        queuePosition: maxPosition + 1,
        enteredAt: Timestamp.now()
      }
      
      const docRef = await addDoc(collection(db, 'queue'), queueEntry)
      console.log('[QUEUE] Student added to queue:', docRef.id)
      return docRef.id
    } catch (error) {
      console.error('[QUEUE] Error adding to queue:', error)
      throw error
    }
  }
  
  // Get queue for a school
  static async getSchoolQueue(schoolId: string) {
    try {
      const q = query(
        collection(db, 'queue'),
        where('schoolId', '==', schoolId),
        where('status', 'in', ['waiting', 'called']),
        orderBy('queuePosition', 'asc')
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as QueueEntry[]
    } catch (error) {
      console.error('[QUEUE] Error getting school queue:', error)
      return []
    }
  }
  
  // Update queue entry status
  static async updateQueueStatus(queueId: string, status: QueueEntry['status'], teacherId?: string) {
    try {
      const updateData: any = { status }
      
      if (status === 'called') {
        updateData.calledAt = Timestamp.now()
        if (teacherId) updateData.teacherId = teacherId
      } else if (status === 'picked_up') {
        updateData.pickedUpAt = Timestamp.now()
        if (teacherId) updateData.teacherId = teacherId
      }
      
      await updateDoc(doc(db, 'queue', queueId), updateData)
      console.log('[QUEUE] Updated queue entry:', queueId, 'to status:', status)
    } catch (error) {
      console.error('[QUEUE] Error updating queue status:', error)
      throw error
    }
  }
  
  // Remove from queue (mark as picked up and archive)
  static async removeFromQueue(queueId: string, teacherId?: string) {
    try {
      await this.updateQueueStatus(queueId, 'picked_up', teacherId)
      console.log('[QUEUE] Removed from queue:', queueId)
    } catch (error) {
      console.error('[QUEUE] Error removing from queue:', error)
      throw error
    }
  }
  
  // Get user's queue entries
  static async getUserQueueEntries(parentId: string) {
    try {
      const q = query(
        collection(db, 'queue'),
        where('parentId', '==', parentId),
        where('status', 'in', ['waiting', 'called']),
        orderBy('queuePosition', 'asc')
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as QueueEntry[]
    } catch (error) {
      console.error('[QUEUE] Error getting user queue entries:', error)
      return []
    }
  }
  
  // Create test queue data for development
  static async createTestData(schoolId: string = 'default-school') {
    try {
      const batch = writeBatch(db)
      const testEntries = [
        {
          studentId: 'test-student-1',
          schoolId,
          parentId: 'test-parent-1',
          status: 'waiting' as const,
          queuePosition: 1,
          enteredAt: Timestamp.now()
        },
        {
          studentId: 'test-student-2', 
          schoolId,
          parentId: 'test-parent-2',
          status: 'waiting' as const,
          queuePosition: 2,
          enteredAt: Timestamp.now()
        },
        {
          studentId: 'test-student-3',
          schoolId, 
          parentId: 'test-parent-3',
          status: 'called' as const,
          queuePosition: 3,
          enteredAt: Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000)),
          calledAt: Timestamp.now()
        }
      ]
      
      // Create test students too
      const testStudents = [
        { name: 'Alice Johnson', grade: '3rd', parentId: 'test-parent-1', schoolId },
        { name: 'Bob Smith', grade: '4th', parentId: 'test-parent-2', schoolId },
        { name: 'Charlie Brown', grade: '2nd', parentId: 'test-parent-3', schoolId }
      ]
      
      // Create test vehicles
      const testVehicles = [
        { licensePlate: 'ABC123', make: 'Honda', model: 'Civic', color: 'Blue', parentId: 'test-parent-1' },
        { licensePlate: 'XYZ789', make: 'Toyota', model: 'Camry', color: 'Silver', parentId: 'test-parent-2' },
        { licensePlate: 'DEF456', make: 'Ford', model: 'F-150', color: 'Red', parentId: 'test-parent-3' }
      ]
      
      // Add test students
      for (let i = 0; i < testStudents.length; i++) {
        const studentRef = doc(collection(db, 'students'), `test-student-${i + 1}`)
        batch.set(studentRef, testStudents[i])
      }
      
      // Add test vehicles
      for (let i = 0; i < testVehicles.length; i++) {
        const vehicleRef = doc(collection(db, 'vehicles'), `test-vehicle-${i + 1}`)
        batch.set(vehicleRef, testVehicles[i])
      }
      
      // Add queue entries with vehicle references
      for (let i = 0; i < testEntries.length; i++) {
        const queueRef = doc(collection(db, 'queue'))
        batch.set(queueRef, {
          ...testEntries[i],
          vehicleId: `test-vehicle-${i + 1}`
        })
      }
      
      await batch.commit()
      console.log('[QUEUE] Test data created successfully')
    } catch (error) {
      console.error('[QUEUE] Error creating test data:', error)
      throw error
    }
  }
}

export default QueueService
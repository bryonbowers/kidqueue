import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'

export interface ActiveUser {
  id: string
  name: string
  email: string
  role?: string
  schoolId?: string
  lastSeen: Timestamp
  isOnline: boolean
}

// Track user as active
export const setUserActive = async (userId: string, userData: { 
  name: string
  email: string
  role?: string
  schoolId?: string 
}) => {
  try {
    await setDoc(doc(db, 'activeUsers', userId), {
      ...userData,
      lastSeen: serverTimestamp(),
      isOnline: true
    }, { merge: true })
  } catch (error) {
    console.error('Error setting user active:', error)
  }
}

// Track user as inactive
export const setUserInactive = async (userId: string) => {
  try {
    await deleteDoc(doc(db, 'activeUsers', userId))
  } catch (error) {
    console.error('Error setting user inactive:', error)
  }
}

// Get active users for a school (real-time)
export const subscribeToActiveUsers = (
  schoolId: string | undefined,
  callback: (users: ActiveUser[]) => void
) => {
  if (!schoolId) {
    callback([])
    return () => {}
  }

  const q = query(
    collection(db, 'activeUsers'),
    where('schoolId', '==', schoolId),
    where('isOnline', '==', true)
  )
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const activeUsers: ActiveUser[] = []
    snapshot.forEach((doc) => {
      activeUsers.push({ id: doc.id, ...doc.data() } as ActiveUser)
    })
    
    // Sort by most recent activity
    activeUsers.sort((a, b) => {
      const aTime = a.lastSeen?.toMillis() || 0
      const bTime = b.lastSeen?.toMillis() || 0
      return bTime - aTime
    })
    
    callback(activeUsers)
  })
  
  return unsubscribe
}

// Get all active users (for admin view)
export const subscribeToAllActiveUsers = (callback: (users: ActiveUser[]) => void) => {
  const q = query(
    collection(db, 'activeUsers'),
    where('isOnline', '==', true)
  )
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const activeUsers: ActiveUser[] = []
    snapshot.forEach((doc) => {
      activeUsers.push({ id: doc.id, ...doc.data() } as ActiveUser)
    })
    
    // Sort by most recent activity
    activeUsers.sort((a, b) => {
      const aTime = a.lastSeen?.toMillis() || 0
      const bTime = b.lastSeen?.toMillis() || 0
      return bTime - aTime
    })
    
    callback(activeUsers)
  })
  
  return unsubscribe
}

// Heartbeat function to keep user active (call every 30 seconds)
export const sendHeartbeat = async (userId: string) => {
  try {
    await setDoc(doc(db, 'activeUsers', userId), {
      lastSeen: serverTimestamp(),
      isOnline: true
    }, { merge: true })
  } catch (error) {
    console.error('Error sending heartbeat:', error)
  }
}
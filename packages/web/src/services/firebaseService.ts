import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'

// Types
export interface Student {
  id: string
  name: string
  grade: string
  parentId: string
  schoolId: string
  qrCode: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface Vehicle {
  id: string
  parentId: string
  licensePlate: string
  make?: string
  model?: string
  color?: string
  qrCode: string
  studentIds?: string[] // Array of student IDs associated with this vehicle
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface QueueEntry {
  id: string
  studentId: string
  parentId: string
  schoolId: string
  vehicleId?: string
  status: 'waiting' | 'called' | 'picked_up'
  queuePosition: number
  enteredAt: Timestamp
  calledAt?: Timestamp
  pickedUpAt?: Timestamp
  teacherId?: string
}

export interface School {
  id: string
  name: string
  address: string
  phoneNumber?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

// Student operations
export const createStudent = async (studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => {
  console.log('Creating student:', studentData)
  try {
    const docRef = await addDoc(collection(db, 'students'), {
      ...studentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    console.log('Student created with ID:', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('Error creating student:', error)
    throw error
  }
}

export const getStudentsByParent = async (parentId: string) => {
  console.log('Getting students for parent:', parentId)
  try {
    // Temporarily remove orderBy to avoid index requirement while index builds
    const q = query(
      collection(db, 'students'),
      where('parentId', '==', parentId)
    )
    const snapshot = await getDocs(q)
    const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student))
    // Sort in memory temporarily
    students.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0
      const bTime = b.createdAt?.toMillis() || 0
      return bTime - aTime
    })
    console.log('Found students:', students)
    return students
  } catch (error) {
    console.error('Error getting students:', error)
    throw error
  }
}

export const updateStudent = async (studentId: string, updates: Partial<Student>) => {
  await updateDoc(doc(db, 'students', studentId), {
    ...updates,
    updatedAt: serverTimestamp()
  })
}

export const deleteStudent = async (studentId: string) => {
  await deleteDoc(doc(db, 'students', studentId))
}

// Vehicle operations
export const createVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => {
  // Check if license plate already exists
  const existingVehicle = await getVehicleByLicensePlate(vehicleData.licensePlate)
  if (existingVehicle) {
    throw new Error(`License plate ${vehicleData.licensePlate} is already registered`)
  }

  const docRef = await addDoc(collection(db, 'vehicles'), {
    ...vehicleData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return docRef.id
}

// Check if license plate exists
export const getVehicleByLicensePlate = async (licensePlate: string) => {
  try {
    const q = query(
      collection(db, 'vehicles'),
      where('licensePlate', '==', licensePlate.toUpperCase().trim())
    )
    
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return null
    }
    
    const vehicleDoc = snapshot.docs[0]
    return { id: vehicleDoc.id, ...vehicleDoc.data() } as Vehicle
  } catch (error) {
    console.error('Error checking license plate:', error)
    return null
  }
}

export const getVehiclesByParent = async (parentId: string) => {
  console.log('Getting vehicles for parent:', parentId)
  try {
    // Temporarily remove orderBy to avoid index requirement while index builds
    const q = query(
      collection(db, 'vehicles'),
      where('parentId', '==', parentId)
    )
    const snapshot = await getDocs(q)
    const vehicles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle))
    // Sort in memory temporarily
    vehicles.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0
      const bTime = b.createdAt?.toMillis() || 0
      return bTime - aTime
    })
    console.log('Found vehicles:', vehicles)
    return vehicles
  } catch (error) {
    console.error('Error getting vehicles:', error)
    throw error
  }
}

export const updateVehicle = async (vehicleId: string, updates: Partial<Vehicle>) => {
  await updateDoc(doc(db, 'vehicles', vehicleId), {
    ...updates,
    updatedAt: serverTimestamp()
  })
}

export const deleteVehicle = async (vehicleId: string) => {
  await deleteDoc(doc(db, 'vehicles', vehicleId))
}

// Queue operations
export const addToQueue = async (queueData: Omit<QueueEntry, 'id' | 'enteredAt'>) => {
  const docRef = await addDoc(collection(db, 'queue'), {
    ...queueData,
    enteredAt: serverTimestamp()
  })
  return docRef.id
}

// Add vehicle and associated students to queue
export const addVehicleToQueue = async (vehicleId: string, parentId: string, schoolId: string) => {
  console.log('[QUEUE DEBUG] Adding vehicle to queue:', { vehicleId, parentId, schoolId })
  
  try {
    // Get vehicle details
    console.log('[QUEUE DEBUG] Fetching vehicle document...')
    const vehicleDoc = await getDoc(doc(db, 'vehicles', vehicleId))
    if (!vehicleDoc.exists()) {
      console.error('[QUEUE DEBUG] Vehicle not found:', vehicleId)
      throw new Error('Vehicle not found')
    }
    
    const vehicle = vehicleDoc.data()
    console.log('[QUEUE DEBUG] Vehicle data:', vehicle)
    
    const studentIds = vehicle.studentIds || []
    console.log('[QUEUE DEBUG] Student IDs from vehicle:', studentIds)
    
    if (studentIds.length === 0) {
      console.error('[QUEUE DEBUG] No students associated with vehicle')
      throw new Error('No students associated with this vehicle. Go to Vehicles page and edit this vehicle to associate students.')
    }
    
    // Check if any students are already in queue
    console.log('[QUEUE DEBUG] Checking for existing queue entries...')
    const existingQueueQuery = query(
      collection(db, 'queue'),
      where('schoolId', '==', schoolId),
      where('status', 'in', ['waiting', 'called']),
      where('studentId', 'in', studentIds)
    )
    const existingSnapshot = await getDocs(existingQueueQuery)
    
    if (!existingSnapshot.empty) {
      const existingStudents = existingSnapshot.docs.map(doc => {
        const data = doc.data()
        return data.studentId
      })
      console.log('[QUEUE DEBUG] Students already in queue:', existingStudents)
      
      // Get student names for error message
      const studentNames = []
      for (const studentId of existingStudents) {
        try {
          const studentDoc = await getDoc(doc(db, 'students', studentId))
          if (studentDoc.exists()) {
            studentNames.push(studentDoc.data().name)
          } else {
            studentNames.push(`Student ${studentId}`)
          }
        } catch (err) {
          studentNames.push(`Student ${studentId}`)
        }
      }
      
      throw new Error(`Already in queue: ${studentNames.join(', ')}. Remove from queue first before adding again.`)
    }
    
    // Verify students exist
    console.log('[QUEUE DEBUG] Verifying students exist...')
    for (const studentId of studentIds) {
      try {
        const studentDoc = await getDoc(doc(db, 'students', studentId))
        if (studentDoc.exists()) {
          console.log('[QUEUE DEBUG] Found student:', studentDoc.data().name)
        } else {
          console.warn('[QUEUE DEBUG] Student not found:', studentId)
        }
      } catch (studentErr) {
        console.warn('[QUEUE DEBUG] Error checking student:', studentId, studentErr)
      }
    }
    
    // Get current queue count for position
    console.log('[QUEUE DEBUG] Getting current queue size...')
    const queueSnapshot = await getDocs(query(
      collection(db, 'queue'),
      where('schoolId', '==', schoolId),
      where('status', 'in', ['waiting', 'called'])
    ))
    
    const currentQueueSize = queueSnapshot.size
    console.log('[QUEUE DEBUG] Current queue size:', currentQueueSize)
    
    const queueEntries = []
    
    // Add each student to queue
    console.log('[QUEUE DEBUG] Adding students to queue...')
    for (let i = 0; i < studentIds.length; i++) {
      const studentId = studentIds[i]
      const queueEntry = {
        studentId,
        parentId,
        schoolId,
        vehicleId,
        status: 'waiting' as const,
        queuePosition: currentQueueSize + i + 1,
        enteredAt: serverTimestamp()
      }
      
      console.log('[QUEUE DEBUG] Creating queue entry:', queueEntry)
      
      try {
        const docRef = await addDoc(collection(db, 'queue'), queueEntry)
        const entryWithId = { id: docRef.id, ...queueEntry }
        queueEntries.push(entryWithId)
        console.log('[QUEUE DEBUG] Successfully added queue entry:', docRef.id)
      } catch (addErr) {
        console.error('[QUEUE DEBUG] Failed to add queue entry:', addErr)
        throw addErr
      }
    }
    
    console.log('[QUEUE DEBUG] All students added to queue successfully:', queueEntries.length, 'entries')
    return queueEntries
    
  } catch (error) {
    console.error('[QUEUE DEBUG] Error adding vehicle to queue:', error)
    throw error
  }
}

// Remove vehicle and associated students from queue
export const removeVehicleFromQueue = async (vehicleId: string) => {
  console.log('Removing vehicle from queue:', vehicleId)
  
  try {
    // Find all queue entries for this vehicle
    const queueQuery = query(
      collection(db, 'queue'),
      where('vehicleId', '==', vehicleId),
      where('status', 'in', ['waiting', 'called'])
    )
    
    const snapshot = await getDocs(queueQuery)
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref))
    
    await Promise.all(deletePromises)
    console.log('Removed', snapshot.size, 'entries from queue')
    
    return snapshot.size
  } catch (error) {
    console.error('Error removing vehicle from queue:', error)
    throw error
  }
}

// Get vehicle by QR code data (updated to use license plate matching)
export const getVehicleByQRCode = async (qrCode: string) => {
  console.log('Looking up vehicle by QR code:', qrCode)
  return await getVehicleByQRData(qrCode)
}

// Check if vehicle is in queue
export const isVehicleInQueue = async (vehicleId: string) => {
  const queueQuery = query(
    collection(db, 'queue'),
    where('vehicleId', '==', vehicleId),
    where('status', 'in', ['waiting', 'called'])
  )
  
  const snapshot = await getDocs(queueQuery)
  return snapshot.size > 0
}

export const getQueueBySchool = (schoolId: string, callback: (entries: QueueEntry[]) => void) => {
  const q = query(
    collection(db, 'queue'),
    where('schoolId', '==', schoolId),
    where('status', 'in', ['waiting', 'called']),
    orderBy('queuePosition', 'asc')
  )
  
  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QueueEntry))
    callback(entries)
  })
}

export const getQueueByParent = (parentId: string, callback: (entries: QueueEntry[]) => void) => {
  const q = query(
    collection(db, 'queue'),
    where('parentId', '==', parentId),
    where('status', 'in', ['waiting', 'called']),
    orderBy('enteredAt', 'desc')
  )
  
  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QueueEntry))
    callback(entries)
  })
}

export const updateQueueEntry = async (entryId: string, updates: Partial<QueueEntry>) => {
  await updateDoc(doc(db, 'queue', entryId), updates)
}

export const removeFromQueue = async (entryId: string) => {
  await deleteDoc(doc(db, 'queue', entryId))
}

// Clear all queue entries for a school
export const clearAllQueue = async (schoolId: string) => {
  console.log('[CLEAR QUEUE] Starting queue clear for school:', schoolId)
  
  try {
    // Get all queue entries for the school
    const q = query(
      collection(db, 'queue'),
      where('schoolId', '==', schoolId)
    )
    
    const snapshot = await getDocs(q)
    console.log('[CLEAR QUEUE] Found', snapshot.size, 'entries to delete')
    
    if (snapshot.empty) {
      console.log('[CLEAR QUEUE] No queue entries found')
      return 0
    }
    
    // Delete all entries in batches
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref))
    await Promise.all(deletePromises)
    
    console.log('[CLEAR QUEUE] Successfully cleared', snapshot.size, 'queue entries')
    return snapshot.size
  } catch (error) {
    console.error('[CLEAR QUEUE] Error clearing queue:', error)
    throw error
  }
}

// School operations
export const createSchool = async (schoolData: Omit<School, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docRef = await addDoc(collection(db, 'schools'), {
    ...schoolData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return docRef.id
}

export const getSchools = async () => {
  const snapshot = await getDocs(collection(db, 'schools'))
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as School))
}

export const getSchool = async (schoolId: string) => {
  const docSnap = await getDoc(doc(db, 'schools', schoolId))
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as School
  }
  return null
}

// QR Code utilities
export const generateQRData = (type: 'student' | 'vehicle', identifier: string): string => {
  // For vehicles, use license plate as the identifier
  // For students, use student ID
  const cleanIdentifier = identifier.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return `KIDQUEUE_${type.toUpperCase()}_${cleanIdentifier}`
}

export const generateVehicleQRData = (licensePlate: string): string => {
  const cleanPlate = licensePlate.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const qrCode = `KIDQUEUE_VEHICLE_${cleanPlate}`
  console.log('[DEBUG] Generated QR code for license plate', licensePlate, '->', qrCode)
  return qrCode
}

export const parseQRData = (qrData: string) => {
  const parts = qrData.split('_')
  if (parts.length < 3 || parts[0] !== 'KIDQUEUE') {
    throw new Error('Invalid QR code format')
  }
  
  return {
    type: parts[1].toLowerCase() as 'student' | 'vehicle',
    identifier: parts[2], // This will be license plate for vehicles
  }
}

// Migration function to update old vehicles to new QR format
export const migrateVehicleQRCodes = async () => {
  console.log('[MIGRATION] Starting vehicle QR code migration...')
  
  try {
    const vehiclesQuery = query(collection(db, 'vehicles'))
    const snapshot = await getDocs(vehiclesQuery)
    
    const updatePromises: Promise<void>[] = []
    
    snapshot.docs.forEach(doc => {
      const vehicle = doc.data() as Vehicle
      const expectedQR = generateVehicleQRData(vehicle.licensePlate)
      
      if (vehicle.qrCode !== expectedQR) {
        console.log(`[MIGRATION] Updating vehicle ${vehicle.licensePlate}: ${vehicle.qrCode} -> ${expectedQR}`)
        updatePromises.push(
          updateDoc(doc.ref, { qrCode: expectedQR })
        )
      }
    })
    
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises)
      console.log(`[MIGRATION] Updated ${updatePromises.length} vehicles`)
    } else {
      console.log('[MIGRATION] No vehicles needed migration')
    }
    
    return updatePromises.length
  } catch (error) {
    console.error('[MIGRATION] Error migrating vehicles:', error)
    throw error
  }
}

// Get vehicle by license plate from QR code
export const getVehicleByQRData = async (qrData: string) => {
  console.log('[DEBUG] Starting QR lookup for:', qrData)
  
  try {
    const parsed = parseQRData(qrData)
    console.log('[DEBUG] Parsed QR data:', parsed)
    
    if (parsed.type !== 'vehicle') {
      throw new Error('QR code is not for a vehicle')
    }
    
    // The identifier in QR code is the cleaned license plate
    const cleanPlate = parsed.identifier
    console.log('[DEBUG] Clean plate from QR:', cleanPlate)
    
    // Try to find vehicle by exact qrCode match first (most efficient)
    console.log('[DEBUG] Trying exact QR code match...')
    try {
      const qrQuery = query(
        collection(db, 'vehicles'),
        where('qrCode', '==', qrData)
      )
      const qrSnapshot = await getDocs(qrQuery)
      console.log('[DEBUG] Exact match results:', qrSnapshot.size, 'documents')
      
      if (!qrSnapshot.empty) {
        const vehicleDoc = qrSnapshot.docs[0]
        const vehicleData = vehicleDoc.data()
        const vehicle = { id: vehicleDoc.id, ...vehicleData } as Vehicle
        console.log('[DEBUG] Found vehicle by exact match:', vehicle)
        return vehicle
      }
    } catch (qrErr) {
      console.warn('[DEBUG] QR code exact match failed:', qrErr)
    }
    
    // Let's also try to get some vehicles to see what's in the database
    console.log('[DEBUG] Getting sample vehicles to debug...')
    try {
      const sampleQuery = query(collection(db, 'vehicles'))
      const sampleSnapshot = await getDocs(sampleQuery)
      console.log('[DEBUG] Total vehicles in database:', sampleSnapshot.size)
      
      sampleSnapshot.docs.forEach((doc, index) => {
        const vehicleData = doc.data()
        console.log(`[DEBUG] Vehicle ${index}:`, {
          id: doc.id,
          licensePlate: vehicleData.licensePlate,
          qrCode: vehicleData.qrCode
        })
      })
    } catch (sampleErr) {
      console.warn('[DEBUG] Could not get sample vehicles:', sampleErr)
    }
    
    // Fallback: Search by constructed QR codes from license plates
    console.log('[DEBUG] Trying license plate variations...')
    const possibleLicensePlates = [
      cleanPlate,
      cleanPlate.replace(/(\w{3})(\w)/, '$1-$2'), // Add dash: ABC123 -> ABC-123
      cleanPlate.replace(/(\w{3})(\w)/, '$1 $2'), // Add space: ABC123 -> ABC 123  
      cleanPlate.replace(/(\w{2})(\w)/, '$1-$2'), // 2-char dash: AB123 -> AB-123
      cleanPlate.replace(/(\w{2})(\w)/, '$1 $2'), // 2-char space: AB123 -> AB 123
    ]
    
    console.log('[DEBUG] Possible license plates to try:', possibleLicensePlates)
    
    for (const plate of possibleLicensePlates) {
      const testQRCode = `KIDQUEUE_VEHICLE_${plate.toUpperCase().replace(/[^A-Z0-9]/g, '')}`
      console.log(`[DEBUG] Testing QR code: ${testQRCode}`)
      
      try {
        const plateQuery = query(
          collection(db, 'vehicles'),
          where('qrCode', '==', testQRCode)
        )
        const plateSnapshot = await getDocs(plateQuery)
        console.log(`[DEBUG] Results for ${testQRCode}:`, plateSnapshot.size, 'documents')
        
        if (!plateSnapshot.empty) {
          const vehicleDoc = plateSnapshot.docs[0]
          const vehicleData = vehicleDoc.data()
          const vehicle = { id: vehicleDoc.id, ...vehicleData } as Vehicle
          console.log('[DEBUG] Found vehicle by plate variation:', vehicle)
          return vehicle
        }
      } catch (plateErr) {
        console.warn(`[DEBUG] Failed to query for QR code ${testQRCode}:`, plateErr)
        continue
      }
    }
    
    console.error(`[DEBUG] No vehicle found with any variation of QR code: ${qrData}`)
    
    // Try migration as last resort
    console.log('[DEBUG] Attempting QR code migration...')
    try {
      const migrationCount = await migrateVehicleQRCodes()
      if (migrationCount > 0) {
        console.log('[DEBUG] Migration completed, retrying QR lookup...')
        // Retry the exact match after migration
        const retryQuery = query(
          collection(db, 'vehicles'),
          where('qrCode', '==', qrData)
        )
        const retrySnapshot = await getDocs(retryQuery)
        
        if (!retrySnapshot.empty) {
          const vehicleDoc = retrySnapshot.docs[0]
          const vehicleData = vehicleDoc.data()
          const vehicle = { id: vehicleDoc.id, ...vehicleData } as Vehicle
          console.log('[DEBUG] Found vehicle after migration:', vehicle)
          return vehicle
        }
      }
    } catch (migrationErr) {
      console.warn('[DEBUG] Migration failed:', migrationErr)
    }
    
    throw new Error(`No vehicle found with QR code: ${qrData}. Try adding a vehicle with license plate "${cleanPlate}" first.`)
  } catch (error) {
    console.error('[DEBUG] Error in QR data parsing:', error)
    throw error
  }
}
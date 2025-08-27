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
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from '../config/firebase'

export interface School {
  id: string
  name: string
  address: string
  phoneNumber?: string
  emailDomain?: string
  adminIds: string[]
  teacherIds: string[]
  timezone: string
  pickupStartTime?: string  // "14:30"
  pickupEndTime?: string    // "16:00"
  active: boolean
  settings: {
    allowParentQRManagement: boolean
    requireVehicleAssociation: boolean
    maxStudentsPerVehicle: number
    queueAutoReset: boolean
    notificationsEnabled: boolean
  }
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
}

export interface SchoolInvite {
  id: string
  schoolId: string
  email: string
  role: 'teacher' | 'admin'
  invitedBy: string
  invitedAt: Timestamp
  expiresAt: Timestamp
  used: boolean
  usedAt?: Timestamp
  usedBy?: string
}

// Create a new school
export const createSchool = async (schoolData: Omit<School, 'id' | 'createdAt' | 'updatedAt'>) => {
  console.log('Creating school:', schoolData)
  try {
    const docRef = await addDoc(collection(db, 'schools'), {
      ...schoolData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    console.log('School created with ID:', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('Error creating school:', error)
    throw error
  }
}

// Get all active schools
export const getActiveSchools = async (): Promise<School[]> => {
  console.log('Getting active schools')
  try {
    const q = query(
      collection(db, 'schools'),
      where('active', '==', true),
      orderBy('name', 'asc')
    )
    const snapshot = await getDocs(q)
    const schools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as School))
    console.log('Found active schools:', schools.length)
    return schools
  } catch (error) {
    console.error('Error getting active schools:', error)
    // Fallback without orderBy for index issues
    try {
      const q = query(collection(db, 'schools'), where('active', '==', true))
      const snapshot = await getDocs(q)
      const schools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as School))
      schools.sort((a, b) => a.name.localeCompare(b.name))
      return schools
    } catch (fallbackError) {
      console.error('Fallback query also failed:', fallbackError)
      return []
    }
  }
}

// Get schools where user is admin or teacher
export const getSchoolsForUser = async (userId: string): Promise<School[]> => {
  console.log('Getting schools for user:', userId)
  try {
    // Query for schools where user is admin
    const adminQuery = query(
      collection(db, 'schools'),
      where('adminIds', 'array-contains', userId),
      where('active', '==', true)
    )
    
    // Query for schools where user is teacher
    const teacherQuery = query(
      collection(db, 'schools'),
      where('teacherIds', 'array-contains', userId),
      where('active', '==', true)
    )
    
    const [adminSnapshot, teacherSnapshot] = await Promise.all([
      getDocs(adminQuery),
      getDocs(teacherQuery)
    ])
    
    const schoolsMap = new Map<string, School>()
    
    // Add admin schools
    adminSnapshot.docs.forEach(doc => {
      const school = { id: doc.id, ...doc.data() } as School
      schoolsMap.set(school.id, school)
    })
    
    // Add teacher schools (if not already added as admin)
    teacherSnapshot.docs.forEach(doc => {
      const school = { id: doc.id, ...doc.data() } as School
      if (!schoolsMap.has(school.id)) {
        schoolsMap.set(school.id, school)
      }
    })
    
    const schools = Array.from(schoolsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
    console.log('Found schools for user:', schools.length)
    return schools
  } catch (error) {
    console.error('Error getting schools for user:', error)
    return []
  }
}

// Get single school by ID
export const getSchoolById = async (schoolId: string): Promise<School | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'schools', schoolId))
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as School
    }
    return null
  } catch (error) {
    console.error('Error getting school:', error)
    return null
  }
}

// Update school
export const updateSchool = async (schoolId: string, updates: Partial<School>) => {
  console.log('Updating school:', schoolId, updates)
  try {
    await updateDoc(doc(db, 'schools', schoolId), {
      ...updates,
      updatedAt: serverTimestamp()
    })
    console.log('School updated successfully')
  } catch (error) {
    console.error('Error updating school:', error)
    throw error
  }
}

// Add user to school as teacher or admin
export const addUserToSchool = async (schoolId: string, userId: string, role: 'teacher' | 'admin') => {
  console.log(`Adding user ${userId} to school ${schoolId} as ${role}`)
  try {
    const school = await getSchoolById(schoolId)
    if (!school) throw new Error('School not found')
    
    const field = role === 'admin' ? 'adminIds' : 'teacherIds'
    const currentIds = school[field] || []
    
    if (!currentIds.includes(userId)) {
      const updatedIds = [...currentIds, userId]
      await updateDoc(doc(db, 'schools', schoolId), {
        [field]: updatedIds,
        updatedAt: serverTimestamp()
      })
      console.log(`User added to school as ${role}`)
    } else {
      console.log('User already has this role at school')
    }
  } catch (error) {
    console.error('Error adding user to school:', error)
    throw error
  }
}

// Remove user from school
export const removeUserFromSchool = async (schoolId: string, userId: string) => {
  console.log(`Removing user ${userId} from school ${schoolId}`)
  try {
    const school = await getSchoolById(schoolId)
    if (!school) throw new Error('School not found')
    
    const updatedAdminIds = (school.adminIds || []).filter(id => id !== userId)
    const updatedTeacherIds = (school.teacherIds || []).filter(id => id !== userId)
    
    await updateDoc(doc(db, 'schools', schoolId), {
      adminIds: updatedAdminIds,
      teacherIds: updatedTeacherIds,
      updatedAt: serverTimestamp()
    })
    console.log('User removed from school')
  } catch (error) {
    console.error('Error removing user from school:', error)
    throw error
  }
}

// Check if user has permission for school
export const checkSchoolPermission = async (schoolId: string, userId: string, requiredRole?: 'admin' | 'teacher'): Promise<{ hasPermission: boolean, userRole?: 'admin' | 'teacher' }> => {
  try {
    const school = await getSchoolById(schoolId)
    if (!school) return { hasPermission: false }
    
    const isAdmin = (school.adminIds || []).includes(userId)
    const isTeacher = (school.teacherIds || []).includes(userId)
    
    let userRole: 'admin' | 'teacher' | undefined
    if (isAdmin) userRole = 'admin'
    else if (isTeacher) userRole = 'teacher'
    
    let hasPermission = isAdmin || isTeacher
    
    // If specific role required, check for it
    if (requiredRole === 'admin') {
      hasPermission = isAdmin
    }
    
    return { hasPermission, userRole }
  } catch (error) {
    console.error('Error checking school permission:', error)
    return { hasPermission: false }
  }
}

// Create school invite
export const createSchoolInvite = async (inviteData: Omit<SchoolInvite, 'id' | 'invitedAt' | 'expiresAt'>) => {
  console.log('Creating school invite:', inviteData)
  try {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now
    
    const docRef = await addDoc(collection(db, 'schoolInvites'), {
      ...inviteData,
      invitedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      used: false
    })
    console.log('School invite created with ID:', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('Error creating school invite:', error)
    throw error
  }
}

// Get pending invites for email
export const getPendingInvitesForEmail = async (email: string): Promise<SchoolInvite[]> => {
  try {
    const q = query(
      collection(db, 'schoolInvites'),
      where('email', '==', email.toLowerCase()),
      where('used', '==', false)
    )
    const snapshot = await getDocs(q)
    const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolInvite))
    
    // Filter out expired invites
    const now = new Date()
    return invites.filter(invite => invite.expiresAt.toDate() > now)
  } catch (error) {
    console.error('Error getting pending invites:', error)
    return []
  }
}

// Accept school invite
export const acceptSchoolInvite = async (inviteId: string, userId: string) => {
  console.log('Accepting school invite:', inviteId, 'for user:', userId)
  try {
    const inviteDoc = await getDoc(doc(db, 'schoolInvites', inviteId))
    if (!inviteDoc.exists()) throw new Error('Invite not found')
    
    const invite = inviteDoc.data() as SchoolInvite
    
    if (invite.used) throw new Error('Invite already used')
    if (invite.expiresAt.toDate() < new Date()) throw new Error('Invite expired')
    
    // Add user to school
    await addUserToSchool(invite.schoolId, userId, invite.role)
    
    // Mark invite as used
    await updateDoc(doc(db, 'schoolInvites', inviteId), {
      used: true,
      usedAt: serverTimestamp(),
      usedBy: userId
    })
    
    console.log('School invite accepted successfully')
    return invite.schoolId
  } catch (error) {
    console.error('Error accepting school invite:', error)
    throw error
  }
}

// Default school for new users
export const createDefaultSchool = async (userId: string, userName: string): Promise<string> => {
  console.log('Creating default school for user:', userId)
  try {
    const schoolData: Omit<School, 'id' | 'createdAt' | 'updatedAt'> = {
      name: `${userName}'s School`,
      address: '',
      adminIds: [userId],
      teacherIds: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      active: true,
      createdBy: userId,
      settings: {
        allowParentQRManagement: true,
        requireVehicleAssociation: true,
        maxStudentsPerVehicle: 5,
        queueAutoReset: false,
        notificationsEnabled: true
      }
    }
    
    const schoolId = await createSchool(schoolData)
    console.log('Default school created:', schoolId)
    return schoolId
  } catch (error) {
    console.error('Error creating default school:', error)
    throw error
  }
}

export default {
  createSchool,
  getActiveSchools,
  getSchoolsForUser,
  getSchoolById,
  updateSchool,
  addUserToSchool,
  removeUserFromSchool,
  checkSchoolPermission,
  createSchoolInvite,
  getPendingInvitesForEmail,
  acceptSchoolInvite,
  createDefaultSchool
}
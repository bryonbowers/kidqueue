import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { School } from '../services/schoolService'
import { getSchoolsForUser, getSchoolById, getActiveSchools, createDefaultSchool } from '../services/schoolService'
import { useAuth } from './FirebaseAuthContext'
import { useAnalytics } from '../hooks/useAnalytics'

interface SchoolContextType {
  // Current school
  currentSchool: School | null
  setCurrentSchool: (school: School | null) => void
  
  // Available schools for user
  availableSchools: School[]
  isLoadingSchools: boolean
  
  // All active schools (for public display)
  allActiveSchools: School[]
  
  // School management
  refreshSchools: () => Promise<void>
  switchSchool: (schoolId: string) => Promise<void>
  
  // User's role at current school
  userRoleAtCurrentSchool: ('admin' | 'teacher' | 'parent') | null
  
  // Permissions
  canManageSchool: boolean
  canManageQueue: boolean
  canInviteUsers: boolean
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined)

export const useSchool = () => {
  const context = useContext(SchoolContext)
  if (context === undefined) {
    throw new Error('useSchool must be used within a SchoolProvider')
  }
  return context
}

interface SchoolProviderProps {
  children: ReactNode
}

export const SchoolProvider: React.FC<SchoolProviderProps> = ({ children }) => {
  const { user } = useAuth()
  const { trackFeatureUsed, trackNavigation } = useAnalytics()
  
  const [currentSchool, setCurrentSchoolState] = useState<School | null>(null)
  const [availableSchools, setAvailableSchools] = useState<School[]>([])
  const [allActiveSchools, setAllActiveSchools] = useState<School[]>([])
  const [isLoadingSchools, setIsLoadingSchools] = useState(true)
  
  // Load schools when user changes
  useEffect(() => {
    if (user) {
      loadUserSchools()
    } else {
      // Reset when user logs out
      setCurrentSchoolState(null)
      setAvailableSchools([])
      setAllActiveSchools([])
      setIsLoadingSchools(false)
    }
  }, [user])

  const loadUserSchools = async () => {
    if (!user) return
    
    setIsLoadingSchools(true)
    try {
      console.log('[SCHOOL CONTEXT] Loading schools for user:', user.id)
      
      // Load schools where user has role (admin/teacher)
      const userSchools = await getSchoolsForUser(user.id)
      console.log('[SCHOOL CONTEXT] User schools:', userSchools)
      
      // Load all active schools for potential joining
      const activeSchools = await getActiveSchools()
      console.log('[SCHOOL CONTEXT] All active schools:', activeSchools)
      
      setAvailableSchools(userSchools)
      setAllActiveSchools(activeSchools)
      
      // Handle current school selection
      await handleCurrentSchoolSelection(userSchools)
      
    } catch (error) {
      console.error('[SCHOOL CONTEXT] Error loading schools:', error)
    } finally {
      setIsLoadingSchools(false)
    }
  }

  const handleCurrentSchoolSelection = async (userSchools: School[]) => {
    if (!user) return
    
    // Check if user has a saved current school preference
    const savedSchoolId = localStorage.getItem(`kidqueue_current_school_${user.id}`)
    
    if (savedSchoolId) {
      // Verify saved school still exists and user has access
      const savedSchool = userSchools.find(s => s.id === savedSchoolId)
      if (savedSchool) {
        console.log('[SCHOOL CONTEXT] Restoring saved school:', savedSchool.name)
        setCurrentSchoolState(savedSchool)
        return
      }
    }
    
    // If no valid saved school, handle based on available schools
    if (userSchools.length === 0) {
      // User has no schools - create a default one for parents
      if (user.role === 'parent') {
        console.log('[SCHOOL CONTEXT] Creating default school for parent')
        try {
          const defaultSchoolId = await createDefaultSchool(user.id, user.name)
          const defaultSchool = await getSchoolById(defaultSchoolId)
          if (defaultSchool) {
            setCurrentSchoolState(defaultSchool)
            setAvailableSchools([defaultSchool])
            localStorage.setItem(`kidqueue_current_school_${user.id}`, defaultSchoolId)
          }
        } catch (error) {
          console.error('[SCHOOL CONTEXT] Error creating default school:', error)
        }
      } else {
        // Teachers/admins need to be invited to schools
        console.log('[SCHOOL CONTEXT] No schools available for teacher/admin')
        setCurrentSchoolState(null)
      }
    } else if (userSchools.length === 1) {
      // User has exactly one school - auto-select it
      console.log('[SCHOOL CONTEXT] Auto-selecting single school:', userSchools[0].name)
      setCurrentSchoolState(userSchools[0])
      localStorage.setItem(`kidqueue_current_school_${user.id}`, userSchools[0].id)
    } else {
      // User has multiple schools - let them choose (set to first for now)
      console.log('[SCHOOL CONTEXT] Multiple schools available, selecting first:', userSchools[0].name)
      setCurrentSchoolState(userSchools[0])
      localStorage.setItem(`kidqueue_current_school_${user.id}`, userSchools[0].id)
    }
  }

  const setCurrentSchool = (school: School | null) => {
    console.log('[SCHOOL CONTEXT] Setting current school:', school?.name || 'null')
    setCurrentSchoolState(school)
    
    if (user && school) {
      localStorage.setItem(`kidqueue_current_school_${user.id}`, school.id)
      trackFeatureUsed('school_selected', { 
        school_id: school.id, 
        school_name: school.name.substring(0, 20) 
      })
    } else if (user) {
      localStorage.removeItem(`kidqueue_current_school_${user.id}`)
    }
  }

  const refreshSchools = async () => {
    if (user) {
      await loadUserSchools()
    }
  }

  const switchSchool = async (schoolId: string) => {
    console.log('[SCHOOL CONTEXT] Switching to school:', schoolId)
    
    const school = availableSchools.find(s => s.id === schoolId) || 
                  allActiveSchools.find(s => s.id === schoolId)
    
    if (!school) {
      // Try to fetch school by ID
      try {
        const fetchedSchool = await getSchoolById(schoolId)
        if (fetchedSchool) {
          setCurrentSchool(fetchedSchool)
          trackNavigation('school_switch', schoolId, 'click')
        }
      } catch (error) {
        console.error('[SCHOOL CONTEXT] Error fetching school:', error)
        throw new Error('School not found')
      }
    } else {
      setCurrentSchool(school)
      trackNavigation('school_switch', school.id, 'click')
    }
  }

  // Determine user's role at current school
  const userRoleAtCurrentSchool = React.useMemo((): ('admin' | 'teacher' | 'parent') | null => {
    if (!currentSchool || !user) return null
    
    if ((currentSchool.adminIds || []).includes(user.id)) return 'admin'
    if ((currentSchool.teacherIds || []).includes(user.id)) return 'teacher'
    if (user.role === 'parent') return 'parent'
    
    return null
  }, [currentSchool, user])

  // Permission calculations
  const canManageSchool = React.useMemo(() => {
    return userRoleAtCurrentSchool === 'admin'
  }, [userRoleAtCurrentSchool])

  const canManageQueue = React.useMemo(() => {
    return userRoleAtCurrentSchool === 'admin' || userRoleAtCurrentSchool === 'teacher'
  }, [userRoleAtCurrentSchool])

  const canInviteUsers = React.useMemo(() => {
    return userRoleAtCurrentSchool === 'admin'
  }, [userRoleAtCurrentSchool])

  const value = {
    currentSchool,
    setCurrentSchool,
    availableSchools,
    isLoadingSchools,
    allActiveSchools,
    refreshSchools,
    switchSchool,
    userRoleAtCurrentSchool,
    canManageSchool,
    canManageQueue,
    canInviteUsers,
  }

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>
}

export default SchoolContext
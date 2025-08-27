import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { 
  User, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider, facebookProvider } from '../config/firebase'

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithFacebook: () => Promise<void>
  login: (token: string) => void
  logout: () => Promise<void>
}

interface UserProfile {
  id: string
  email: string
  name: string
  role: 'parent' | 'teacher' | 'admin'
  schoolId?: string // Legacy field, may not be used
  createdAt: any
  updatedAt: any
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser)
      
      if (firebaseUser) {
        // Get or create user profile in Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        
        if (userDoc.exists()) {
          const profileData = userDoc.data()
          setUser({
            ...profileData,
            id: profileData.uid || firebaseUser.uid
          } as UserProfile)
        } else {
          // Create new user profile
          const newProfile: UserProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
            role: 'parent', // Default role
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }
          
          await setDoc(doc(db, 'users', firebaseUser.uid), newProfile)
          setUser(newProfile)
        }
      } else {
        setUser(null)
      }
      
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error('Google sign in error:', error)
      throw error
    }
  }

  const signInWithFacebook = async () => {
    try {
      await signInWithPopup(auth, facebookProvider)
    } catch (error) {
      console.error('Facebook sign in error:', error)
      throw error
    }
  }

  const login = (token: string) => {
    // For Firebase, this is handled by onAuthStateChanged
    // This method exists for compatibility
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  const value = {
    user,
    isLoading,
    signInWithGoogle,
    signInWithFacebook,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
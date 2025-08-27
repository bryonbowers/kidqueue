import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
interface User {
  id: string
  email: string
  name: string
  role: 'parent' | 'teacher' | 'admin'
  schoolId: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (token: string) => void
  logout: () => void
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
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('kidqueue_token')
    if (storedToken) {
      verifyToken(storedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUser(data.data)
          setToken(token)
        } else {
          localStorage.removeItem('kidqueue_token')
        }
      } else {
        localStorage.removeItem('kidqueue_token')
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      localStorage.removeItem('kidqueue_token')
    } finally {
      setIsLoading(false)
    }
  }

  const login = (newToken: string) => {
    localStorage.setItem('kidqueue_token', newToken)
    verifyToken(newToken)
  }

  const logout = () => {
    localStorage.removeItem('kidqueue_token')
    setUser(null)
    setToken(null)
  }

  const value = {
    user,
    token,
    isLoading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
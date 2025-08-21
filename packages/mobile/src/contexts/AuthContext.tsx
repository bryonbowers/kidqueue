import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@kidqueue/shared';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredToken();
  }, []);

  const loadStoredToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('kidqueue_token');
      if (storedToken) {
        await verifyToken(storedToken);
      }
    } catch (error) {
      console.error('Error loading stored token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.data);
          setToken(token);
          await AsyncStorage.setItem('kidqueue_token', token);
        } else {
          await AsyncStorage.removeItem('kidqueue_token');
        }
      } else {
        await AsyncStorage.removeItem('kidqueue_token');
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      await AsyncStorage.removeItem('kidqueue_token');
    }
  };

  const login = async (newToken: string) => {
    await AsyncStorage.setItem('kidqueue_token', newToken);
    await verifyToken(newToken);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('kidqueue_token');
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
}

interface Asset {
  id: number;
  name: string;
  isStock: boolean;
  ticker?: string;
  shares?: number;
  currentPrice?: number;
  purchasePrice?: number;
  balance?: number;
  apy?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  syncLocalAssets: () => Promise<void>;
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

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    if (savedToken) {
      setToken(savedToken);
      // Verify token is still valid
      verifyToken(savedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (authToken: string) => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token is invalid, clear it
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const syncLocalAssets = async (): Promise<void> => {
    if (!token) return;

    try {
      // Load assets from localStorage
      const storedAssets = localStorage.getItem('portfolio_assets');
      if (!storedAssets) return;

      const localAssets: Asset[] = JSON.parse(storedAssets);
      if (localAssets.length === 0) return;

      // Convert assets to backend format (remove id field)
      const assetsForBackend = localAssets.map(({ id, ...asset }) => asset);

      // Save to backend
      const response = await fetch('http://localhost:8000/api/portfolio/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ assets: assetsForBackend })
      });

      if (response.ok) {
        console.log('Local assets synced to database successfully');
        // Clear local storage after successful sync
        localStorage.removeItem('portfolio_assets');
      } else {
        console.error('Failed to sync local assets to database');
      }
    } catch (error) {
      console.error('Error syncing local assets:', error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(data.access_token);
        localStorage.setItem('auth_token', data.access_token);
        
        // Sync local assets to database after successful login
        await syncLocalAssets();
        
        return true;
      } else {
        const errorData = await response.json();
        console.error('Login failed:', errorData);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
        
        // If registration returns a token immediately, set it and sync assets
        if (data.access_token) {
          setToken(data.access_token);
          localStorage.setItem('auth_token', data.access_token);
          
          // Sync local assets to database after successful registration
          await syncLocalAssets();
        }
        
        return true;
      } else {
        const errorData = await response.json();
        console.error('Registration failed:', errorData);
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('portfolio_assets');
    
    // Call logout endpoint
    if (token) {
      fetch('http://localhost:8000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(console.error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token,
    syncLocalAssets,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

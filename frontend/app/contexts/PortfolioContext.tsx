"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getApiUrl } from '../config/api';

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

interface PortfolioContextType {
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  isLoading: boolean;
  hasLoadedFromStorage: boolean;
  loadAssetsFromStorage: () => Asset[];
  saveAssetsToStorage: (assets: Asset[]) => void;
  loadPortfolioFromBackend: () => Promise<void>;
  savePortfolioToBackend: () => Promise<void>;
  reloadAssetsFromStorage: () => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

interface PortfolioProviderProps {
  children: ReactNode;
}

// Local storage utilities
const STORAGE_KEY = 'portfolio_assets';

const loadAssetsFromStorage = (): Asset[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const assets = stored ? JSON.parse(stored) : [];
    return assets;
  } catch (error) {
    console.error('Error loading assets from localStorage:', error);
    return [];
  }
};

const saveAssetsToStorage = (assets: Asset[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  } catch (error) {
    console.error('Error saving assets to localStorage:', error);
  }
};

export function PortfolioProvider({ children }: PortfolioProviderProps) {
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load assets from backend when authenticated, localStorage when not
  useEffect(() => {
    if (isAuthenticated && token) {
      // When user becomes authenticated, sync local assets first, then load from backend
      const syncAndLoadAssets = async () => {
        setIsLoading(true);
        try {
          // Check if there are local assets to sync
          const storedAssets = loadAssetsFromStorage();
          if (storedAssets.length > 0) {
            // Sync local assets to backend
            const assetsForBackend = storedAssets.map(({ id, ...asset }) => asset);
            const syncResponse = await fetch(getApiUrl('/api/portfolio/save'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ assets: assetsForBackend })
            });
            
            if (syncResponse.ok) {
              console.log('Local assets synced to database successfully');
              // Clear local storage after successful sync
              saveAssetsToStorage([]);
            }
          }
          
          // Load the complete portfolio from backend (including synced assets)
          await loadPortfolioFromBackend();
        } catch (error) {
          console.error('Error syncing and loading assets:', error);
          // Fallback to loading from backend only
          await loadPortfolioFromBackend();
        } finally {
          setIsLoading(false);
        }
      };
      
      syncAndLoadAssets();
    } else if (!isAuthenticated && !isAuthLoading && !token) {
      // Always load from localStorage if not authenticated and no token
      // This ensures assets are loaded on every page navigation when not logged in
      const storedAssets = loadAssetsFromStorage();
      setAssets(storedAssets);
      setHasLoadedFromStorage(true);
      setIsLoading(false);
    }
  }, [isAuthenticated, token, isAuthLoading]);

  // Reset flags and clear assets when authentication state changes
  useEffect(() => {
    if (!isAuthenticated) {
      setHasLoadedFromStorage(false);
      setAssets([]); // Clear assets when user logs out
      setIsLoading(false); // Reset loading state when user logs out
    }
  }, [isAuthenticated, token]);

  // Save assets to backend when authenticated, localStorage when not
  useEffect(() => {
    if (isAuthenticated && token) {
      // Save to backend when authenticated (including empty portfolio)
      savePortfolioToBackend();
    } else if (!isAuthenticated && !isAuthLoading) {
      // Save to localStorage if not authenticated (regardless of hasLoadedFromStorage flag)
      saveAssetsToStorage(assets);
    }
  }, [assets, isAuthenticated, token, isAuthLoading]);

  // Handle page visibility changes to reload assets when navigating back to the app
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !isAuthenticated && !isAuthLoading) {
        // Only reload if we haven't loaded from storage yet or if there's a significant difference
        const storedAssets = loadAssetsFromStorage();
        if (storedAssets.length > 0 && (!hasLoadedFromStorage || Math.abs(storedAssets.length - assets.length) > 0)) {
          // Preserve scroll position before updating assets
          const scrollPosition = window.scrollY;
          
          setAssets(storedAssets);
          setHasLoadedFromStorage(true);
          
          // Restore scroll position after a brief delay
          setTimeout(() => {
            window.scrollTo(0, scrollPosition);
          }, 50);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, isAuthLoading, assets.length, hasLoadedFromStorage]);

  const loadPortfolioFromBackend = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(getApiUrl('/api/portfolio'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const backendAssets = data.assets.map((asset: { [key: string]: unknown }, index: number) => ({
          ...asset,
          id: index + 1 // Generate local IDs
        }));
        setAssets(backendAssets);
      }
    } catch (error) {
      console.error('Error loading portfolio from backend:', error);
    }
  };

  const savePortfolioToBackend = async () => {
    if (!token) return;
    
    try {
      const assetsForBackend = assets.map(({ id, ...asset }) => asset);
      const response = await fetch(getApiUrl('/api/portfolio/save'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ assets: assetsForBackend })
      });
      
      if (!response.ok) {
        console.error('Failed to save portfolio to backend');
      }
    } catch (error) {
      console.error('Error saving portfolio to backend:', error);
    }
  };

  const reloadAssetsFromStorage = () => {
    if (!isAuthenticated && !isAuthLoading) {
      const storedAssets = loadAssetsFromStorage();
      setAssets(storedAssets);
      setHasLoadedFromStorage(true);
    }
  };

  const value: PortfolioContextType = {
    assets,
    setAssets,
    isLoading,
    hasLoadedFromStorage,
    loadAssetsFromStorage,
    saveAssetsToStorage,
    loadPortfolioFromBackend,
    savePortfolioToBackend,
    reloadAssetsFromStorage
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}

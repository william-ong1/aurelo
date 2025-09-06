"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface ScrollContextType {
  scrollPositions: Record<string, number>;
  saveScrollPosition: (path: string, position: number) => void;
  getScrollPosition: (path: string) => number;
  restoreScrollPosition: (path: string) => void;
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined);

interface ScrollProviderProps {
  children: ReactNode;
}

export function ScrollProvider({ children }: ScrollProviderProps) {
  const [scrollPositions, setScrollPositions] = useState<Record<string, number>>({});
  const pathname = usePathname();

  const saveScrollPosition = (path: string, position: number) => {
    setScrollPositions(prev => ({
      ...prev,
      [path]: position
    }));
  };

  const getScrollPosition = (path: string) => {
    return scrollPositions[path] || 0;
  };

  const restoreScrollPosition = (path: string) => {
    const position = scrollPositions[path] || 0;
    window.scrollTo(0, position);
  };

  // Save scroll position on scroll
  useEffect(() => {
    const handleScroll = () => {
      saveScrollPosition(pathname, window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  // Restore scroll position when pathname changes
  useEffect(() => {
    const timer = setTimeout(() => {
      restoreScrollPosition(pathname);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [pathname, restoreScrollPosition]);

  const value: ScrollContextType = {
    scrollPositions,
    saveScrollPosition,
    getScrollPosition,
    restoreScrollPosition
  };

  return (
    <ScrollContext.Provider value={value}>
      {children}
    </ScrollContext.Provider>
  );
}

export function useScroll() {
  const context = useContext(ScrollContext);
  if (context === undefined) {
    throw new Error('useScroll must be used within a ScrollProvider');
  }
  return context;
}

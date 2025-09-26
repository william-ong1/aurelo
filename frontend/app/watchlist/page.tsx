"use client";
import React, { useState, useEffect } from 'react';
import WatchlistSection from '../components/WatchlistSection';
import { useAuth } from '../contexts/AuthContext';

export default function WatchlistPage() {
  const { isLoading: isAuthLoading } = useAuth();
  const [isPageReady, setIsPageReady] = useState(false);

  // Set page as ready after authentication check is complete
  useEffect(() => {
    if (!isAuthLoading) {
      setIsPageReady(true);
    }
  }, [isAuthLoading]);

  // Show loading state while checking authentication
  if (isAuthLoading) {
    return (
      <div></div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {isPageReady && (
        <main className="mx-auto px-2 sm:px-6 lg:px-8 max-w-6xl 2xl:max-w-7xl">
          <WatchlistSection />
        </main>
      )}
    </div>
  );
}

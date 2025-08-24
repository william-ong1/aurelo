"use client";
import React, { useState, useEffect } from 'react';
import TradingSection from '../components/TradingSection';
import { useAuth } from '../contexts/AuthContext';

export default function TradingPage() {
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
    <div className="min-h-screen bg-gray-50">
      {/* Only render content after authentication is checked */}
      {isPageReady && (
        <main className="mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-6xl 2xl:max-w-7xl">
          <section>
            <TradingSection />
          </section>
        </main>
      )}
    </div>
  );
}



"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import WhiteboardJournal from '../components/WhiteboardJournal';

export default function JournalPage() {
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
        <main className="">
          <WhiteboardJournal />
        </main>
      )}
    </div>
  );
}
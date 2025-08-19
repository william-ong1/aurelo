"use client";
import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UserProfileProps {
  onLogout: () => void;
}

export default function UserProfile({ onLogout }: UserProfileProps) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <button
      onClick={onLogout}
      className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-red-600 hover:text-red-700 transition-colors cursor-pointer px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg"
    >
    <LogOut className='w-3 h-3 sm:w-5 sm:h-5' />
      Sign Out
    </button>
  );
}

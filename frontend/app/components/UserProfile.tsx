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
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors cursor-pointer"
    >
      <LogOut size={16} />
      Sign Out
    </button>
  );
}

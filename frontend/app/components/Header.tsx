"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';

interface HeaderProps {
  onLogout?: () => void;
  onMenuClick?: () => void;
}

export default function Header({ onLogout, onMenuClick }: HeaderProps) {
  const { isAuthenticated, logout } = useAuth();
  const { showAuthModal } = useAuthModal();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    if (onLogout) {
      onLogout();
    }
  };

  const handleShowAuthModal = () => {
    showAuthModal();
  };

  return (
    <header className="fixed top-0 w-full z-40 bg-white/80 dark:bg-black/70 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-800/70 shadow-sm lg:sticky" suppressHydrationWarning>
      <div className="container pl-4 pr-2 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-12">
          {/* Branding (left on mobile and desktop) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-3">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 bg-clip-text text-transparent tracking-tight drop-shadow-sm">
                Aurelo
              </h1>
              {/* Beta badge */}
                <span className="px-2 py-1 text-[9px] sm:text-[10px] leading-none font-bold rounded-full bg-gradient-to-br from-orange-500 via-orange-400 to-rose-500 text-white shadow-lg border border-orange-300/50 dark:border-orange-400/60 ring-1 ring-white/20 dark:ring-white/10 relative overflow-hidden tracking-wider uppercase">
                  <span className="relative z-10 drop-shadow-sm">Beta</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  <div className="absolute -inset-y-1 -left-2 w-1/3 bg-white/20 blur-[3px] -skew-x-12 animate-pulse"></div>
                </span>
            </div>
            {/* Mobile tagline */}
            {/* <p className="sm:hidden text-[10px] text-black dark:text-white font-medium -mt-0.5">
              Your finances, simplified.
            </p> */}
            {/* <div className="hidden sm:block border-l border-gray-200 h-6"></div> */}
          </div>

          {/* Mobile Hamburger (right on mobile), hidden on md+ where desktop nav shows */}
          <div className="md:hidden">
            <button
              onClick={onMenuClick}
              className="px-2 py-2 rounded-lg cursor-pointer transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-200/90" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}

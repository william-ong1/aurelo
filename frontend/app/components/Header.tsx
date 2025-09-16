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
    <header className="fixed top-0 w-full z-40 bg-white/80 dark:bg-black/70 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm lg:sticky" suppressHydrationWarning>
      <div className="container pl-4 pr-2 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-14 sm:h-20">
          {/* Branding (left on mobile and desktop) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-3">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-500 tracking-tight">
                Aurelo
              </h1>
              {/* Mobile-only Beta badge */}
              <span className="sm:hidden px-1.5 py-0.5 text-[9px] leading-none font-semibold rounded-full border bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-gray-700">
                Beta
              </span>
            </div>
            {/* Mobile tagline */}
            {/* <p className="sm:hidden text-[10px] text-black dark:text-white font-medium -mt-0.5">
              Your finances, simplified.
            </p> */}
            {/* <div className="hidden sm:block border-l border-gray-200 h-6"></div> */}
            <p className="hidden sm:block text-xs sm:text-sm text-black font-medium">
              Your finances, simplified.
            </p>
          </div>

          {/* Mobile Hamburger (right on mobile), hidden on md+ where desktop nav shows */}
          <div className="md:hidden">
            <button
              onClick={onMenuClick}
              className="px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-200/90" />
            </button>
          </div>

          {/* Nav */}
          <nav className="hidden sm:flex items-center gap-1 bg-gray-100 backdrop-blur-sm rounded-full p-1 border border-gray-200/90">
            <Link
              href="/portfolio"
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all ${
                pathname === '/' || pathname.startsWith('/portfolio')
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-300'
                  : 'text-black hover:text-gray-800 hover:bg-white/80'
              }`}
            >
              Portfolio
            </Link>
            <Link
              href="/trading"
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all ${
                pathname.startsWith('/trading')
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-300'
                  : 'text-black hover:text-gray-800 hover:bg-white/80'
              }`}
            >
              Trading
            </Link>
          </nav>
          
          {/* Auth Section - Desktop Only */}
          <div className="hidden sm:flex items-center">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-black hover:text-gray-800 transition-colors cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-50"
              >
                <LogOut className='w-4 h-4 sm:w-5 sm:h-5' />
                Sign Out
              </button>
            ) : (
              <button
                onClick={handleShowAuthModal}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors cursor-pointer px-3 py-2 rounded-lg hover:bg-blue-50"
              >
                <LogIn className='w-4 h-4 sm:w-5 sm:h-5' />
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  onShowAuthModal: () => void;
  onLogout?: () => void;
}

export default function Header({ onShowAuthModal, onLogout }: HeaderProps) {
  const { isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between h-12 sm:h-20">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-500 tracking-tight">
                Aurelo
              </h1>
            </div>
            <div className="m:block border-l border-gray-200 h-6"></div>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">
              Your finances, simplified.
            </p>
          </div>

          {/* Nav */}
          <nav className="hidden sm:flex items-center gap-1 bg-gray-100 backdrop-blur-sm rounded-full p-1 border border-gray-200/90">
            <Link
              href="/portfolio"
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all ${
                pathname === '/' || pathname.startsWith('/portfolio')
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-300'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/80'
              }`}
            >
              Portfolio
            </Link>
            <Link
              href="/trading"
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all ${
                pathname.startsWith('/trading')
                  ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-300'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-white/80'
              }`}
            >
              Trading
            </Link>
          </nav>
          
          {/* Auth Section */}
          <div className="flex items-center">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-50"
              >
                <LogOut className='w-4 h-4 sm:w-5 sm:h-5' />
                Sign Out
              </button>
            ) : (
              <button
                onClick={onShowAuthModal}
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

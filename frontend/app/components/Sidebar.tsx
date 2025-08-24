"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  onShowAuthModal: () => void;
  onLogout?: () => void;
}

export default function Sidebar({ onShowAuthModal, onLogout }: SidebarProps) {
  const { isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
  };

  const isPortfolioActive = pathname === '/' || pathname.startsWith('/portfolio');
  const isTradingActive = pathname.startsWith('/trading');
  const isWatchlistActive = pathname.startsWith('/watchlist');

  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-white/80 backdrop-blur-sm border-r border-gray-200/60 shadow-sm z-40 flex flex-col">
      {/* Brand */}
      <div className="px-4 sm:px-5 pt-4 sm:pt-8 pb-3 border-b border-gray-200/60">
        <div className="flex items-center gap-2">
          <h1 className="text-xl 2xl:text-3xl font-bold text-amber-500 tracking-tight">Aurelo</h1>
          <span className="px-1.5 py-0.5 text-[9px] 2xl:text-[11px] leading-none font-semibold rounded-full bg-orange-100 text-orange-700 border border-orange-200">Beta</span>
        </div>
        <p className="mt-0 text-[.7rem] 2xl:text-[.9rem] text-gray-600">Your finances, simplified.</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 sm:px-3 py-3 space-y-1">
        <Link
          href="/"
          className={`block px-3 py-2 rounded-lg text-xs 2xl:text-base font-medium transition-all ${
            isPortfolioActive
              ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-300'
              : 'text-gray-700 hover:text-gray-900 hover:bg-white/80'
          }`}
        >
          Portfolio
        </Link>
        <Link
          href="/trading"
          className={`block px-3 py-2 rounded-lg text-xs 2xl:text-base font-medium transition-all ${
            isTradingActive
              ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-300'
              : 'text-gray-700 hover:text-gray-900 hover:bg-white/80'
          }`}
        >
          Trading
        </Link>
        <Link
          href="/watchlist"
          className={`block px-3 py-2 rounded-lg text-xs 2xl:text-base font-medium transition-all ${
            isWatchlistActive
              ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-300'
              : 'text-gray-700 hover:text-gray-900 hover:bg-white/80'
          }`}
        >
          <div className="flex items-center gap-2">
            Watchlist
          </div>
        </Link>
      </nav>

      {/* Auth */}
      <div className="px-3 sm:px-4 py-2 border-t border-gray-200/60">
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-xs 2xl:text-base font-medium text-red-600 hover:text-red-700 transition-colors cursor-pointer py-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        ) : (
          <button
            onClick={onShowAuthModal}
            className="w-full flex items-center justify-center gap-2 text-xs 2xl:text-base font-medium text-blue-600 hover:text-blue-700 transition-colors cursor-pointer py-2"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
        )}
      </div>
    </aside>
  );
}



"use client";
import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut, Eye, PieChart, BarChart3, Star, BookOpen, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';

interface SidebarProps {
  onLogout?: () => void;
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const { isAuthenticated, logout } = useAuth();
  const { showAuthModal } = useAuthModal();
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [isHydrated, setIsHydrated] = React.useState(false);

  // Initialize dark mode state from the already-set HTML class
  useEffect(() => {
    setIsHydrated(true);
    // Small delay to ensure the script has run
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };
    
    // Check immediately and also after a small delay
    checkTheme();
    const timeoutId = setTimeout(checkTheme, 10);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
  };

  const handleShowAuthModal = () => {
    showAuthModal();
  };

  // Toggle dark mode function
  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
      
      // Update theme-color meta tag
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', '#ffffff');
      }
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
      
      // Update theme-color meta tag
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', '#000000');
      }
    }
  };

  const isPortfolioActive = pathname === '/' || pathname.startsWith('/portfolio');
  const isTradingActive = pathname.startsWith('/trading');
  const isWatchlistActive = pathname.startsWith('/watchlist');
  const isJournalActive = pathname.startsWith('/journal');

  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-white dark:bg-black backdrop-blur-sm border-r border-gray-200 dark:border-gray-800/70 shadow-sm z-40 flex flex-col transition-colors select-none">
      {/* Brand */}
      <div className="px-4 sm:px-5 pt-4 sm:pt-8 pb-3 border-b border-gray-200 dark:border-gray-800/70">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl 2xl:text-3xl font-bold bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 bg-clip-text text-transparent tracking-tight drop-shadow-sm">Aurelo</h1>
            <span className="px-2 py-1 text-[9px] 2xl:text-[11px] leading-none font-bold rounded-full bg-gradient-to-br from-orange-500 via-orange-400 to-rose-500 text-white shadow-lg border border-orange-300/50 dark:border-orange-400/60 ring-1 ring-white/20 dark:ring-white/10 relative overflow-hidden tracking-wider uppercase">
              <span className="relative z-10 drop-shadow-sm">Beta</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              <div className="absolute -inset-y-1 -left-2 w-1/3 bg-white/20 blur-[3px] -skew-x-12 animate-pulse"></div>
            </span>
        </div>
        <p className="mt-0 text-[.7rem] 2xl:text-[.9rem] text-black dark:text-white">
          Your finances, simplified.
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 sm:px-3 py-3 space-y-1">
        <Link
          href="/"
          className={`relative block px-3 py-2 rounded-lg text-xs 2xl:text-base font-medium transition-all ${
            isPortfolioActive
              ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 shadow-sm'
              : 'text-black dark:text-white hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:shadow-sm'
          }`}
        >
          {isPortfolioActive && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r-sm"></div>
          )}
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Portfolio
          </div>
        </Link>
        <Link
          href="/trading"
          className={`relative block px-3 py-2 rounded-lg text-xs 2xl:text-base font-medium transition-all ${
            isTradingActive
              ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 shadow-sm'
              : 'text-black dark:text-white hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:shadow-sm'
          }`}
        >
          {isTradingActive && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r-sm"></div>
          )}
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Trading
          </div>
        </Link>
        <Link
          href="/watchlist"
          className={`relative block px-3 py-2 rounded-lg text-xs 2xl:text-base font-medium transition-all ${
            isWatchlistActive
              ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 shadow-sm'
              : 'text-black dark:text-white hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:shadow-sm'
          }`}
        >
          {isWatchlistActive && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r-sm"></div>
          )}
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            Watchlist
          </div>
        </Link>
        <Link
          href="/journal"
          className={`relative block px-3 py-2 rounded-lg text-xs 2xl:text-base font-medium transition-all ${
            isJournalActive
              ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 shadow-sm'
              : 'text-black dark:text-white hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/40 hover:shadow-sm'
          }`}
        >
          {isJournalActive && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r-sm"></div>
          )}
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Journal
          </div>
        </Link>
        
        {/* Dark Mode Toggle */}
        <div className="relative block w-full px-3 py-2 rounded-lg text-xs 2xl:text-base font-medium text-black dark:text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isHydrated && isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              <span>Dark Mode</span>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors -mr-3 cursor-pointer ${
                isHydrated && isDarkMode ? 'bg-amber-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  isHydrated && isDarkMode ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Auth */}
      <div className="px-3 sm:px-4 py-2 border-t border-gray-200 dark:border-gray-800/70">
        {isAuthenticated ? (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-xs 2xl:text-base font-medium transition-colors cursor-pointer py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        ) : (
          <button
            onClick={handleShowAuthModal}
            className="w-full flex items-center justify-center gap-2 text-xs 2xl:text-base font-medium transition-colors cursor-pointer py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
        )}
      </div>
    </aside>
  );
}
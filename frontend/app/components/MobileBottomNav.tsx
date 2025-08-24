"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PieChart, TrendingUp, Eye } from 'lucide-react';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const isPortfolio = pathname === '/' || pathname.startsWith('/portfolio');
  const isTrading = pathname.startsWith('/trading');
  const isWatchlist = pathname.startsWith('/watchlist');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200/70 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-stretch justify-between h-14">
          <Link
            href="/"
            className={`flex-1 flex items-center justify-center transition-colors ${
              isPortfolio ? 'text-gray-900' : 'text-gray-600 hover:text-gray-800'
            }`}
            aria-label="Portfolio"
          >
            <div className="flex flex-col items-center justify-center gap-0">
              <PieChart className="w-4 h-4" />
              <span className="text-[10px] leading-none">Portfolio</span>
            </div>
          </Link>
          <div className="w-px bg-gray-200/70 my-2" aria-hidden="true" />
          <Link
            href="/trading"
            className={`flex-1 flex items-center justify-center transition-colors ${
              isTrading ? 'text-gray-900' : 'text-gray-600 hover:text-gray-800'
            }`}
            aria-label="Trading"
          >
            <div className="flex flex-col items-center justify-center gap-0">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] leading-none">Trading</span>
            </div>
          </Link>
          <div className="w-px bg-gray-200/70 my-2" aria-hidden="true" />
          <Link
            href="/watchlist"
            className={`flex-1 flex items-center justify-center transition-colors ${
              isWatchlist ? 'text-gray-900' : 'text-gray-600 hover:text-gray-800'
            }`}
            aria-label="Watchlist"
          >
            <div className="flex flex-col items-center justify-center gap-0">
              <Eye className="w-4 h-4" />
              <span className="text-[10px] leading-none">Watchlist</span>
            </div>
          </Link>
        </div>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}



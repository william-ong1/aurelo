"use client";
import React from 'react';

export default function PerformanceSection() {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[10px] sm:text-xs 2xl:text-sm font-medium text-gray-600 uppercase tracking-wide">Performance</h3>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="flex items-center bg-gray-100 backdrop-blur-sm rounded-full p-1 border border-gray-200/90 gap-1">
            {(['1D', '1W', '1M', '3M', '1Y', 'ALL'] as const).map((period) => (
              <button
                key={period}
                disabled
                className={`px-1.5 sm:px-2 2xl:px-3 py-.7 sm:py-1 2xl:py-1.5 text-[.5rem] sm:text-[.6rem] 2xl:text-[.8rem] font-medium rounded-full transition-all duration-200 cursor-not-allowed ${
                  period === '1M'
                    ? 'text-gray-900 bg-white shadow-sm ring-1 ring-gray-300 font-semibold'
                    : 'text-gray-400'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="">
        <div className="flex items-center justify-between mb-6">
          <div> </div>
          <div className="text-right">
            <div className="text-lg sm:text-xl 2xl:text-2xl font-bold text-gray-400">$0</div>
          </div>
        </div>
        
        {/* Mock Chart */}
        <div className="h-48 relative">
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="text-xl sm:text-2xl 2xl:text-3xl font-bold text-gray-400 tracking-wider mb-16">COMING SOON</div>
            </div>
          </div>
          
          {/* Mock Chart Line */}
          <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 400 200" preserveAspectRatio="none">
            <path
              d="M0,180 Q50,150 100,160 T200,140 T300,120 T400,100"
              stroke="#d1d5db"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5,5"
            />
            <path
              d="M0,180 Q50,150 100,160 T200,140 T300,120 T400,100"
              stroke="#e5e7eb"
              strokeWidth="1"
              fill="url(#gradient)"
              opacity="0.2"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.2"/>
                <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        
        <div className="mt-4 flex items-center justify-between text-[10px] sm:text-xs 2xl:text-sm text-gray-400">
          <span>Start: $0</span>
          <span>1M period</span>
          <span>Current: $0</span>
        </div>
      </div>
    </div>
  );
}

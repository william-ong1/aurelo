"use client";
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Trade {
  id: number;
  date: string;
  ticker: string;
  trade_type: 'sell';
  shares: number;
  price: number;
  realized_pnl?: number;
  percent_diff?: number;
  notes?: string;
}

interface TradeCalendarProps {
  trades: Trade[];
}

export default function TradeCalendar({ trades }: TradeCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getPnlColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-700';
    if (pnl < 0) return 'text-red-700';
    return 'text-gray-600';
  };

  const getDayBackgroundColor = (pnl: number) => {
    if (pnl > 0) return 'bg-green-50 border-green-200';
    if (pnl < 0) return 'bg-red-50 border-red-200';
    return 'bg-white border-gray-100';
  };

  const getPnlIntensity = (pnl: number) => {
    const absPnl = Math.abs(pnl);
    if (absPnl > 1000) return 'font-bold';
    if (absPnl > 500) return 'font-semibold';
    return 'font-medium';
  };

  // Group trades by date
  const tradesByDate = trades.reduce((acc, trade) => {
    const date = trade.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(trade);
    return acc;
  }, {} as Record<string, Trade[]>);

  // Calculate daily P&L and percentage return
  const dailyStats = Object.entries(tradesByDate).reduce((acc, [date, dayTrades]) => {
    const totalPnl = dayTrades.reduce((sum, trade) => sum + (trade.realized_pnl || 0), 0);
    
    // Calculate total amount invested (sum of all trade values)
    const totalInvested = dayTrades.reduce((sum, trade) => {
      // For realized P&L trades, we need to estimate the original investment
      // Since we don't have the original investment amount, we'll use the P&L percentage
      // to estimate the original position value
      if (trade.percent_diff && trade.percent_diff !== 0) {
        // Original value = P&L / (percentage / 100)
        const originalValue = Math.abs(trade.realized_pnl || 0) / (Math.abs(trade.percent_diff) / 100);
        return sum + originalValue;
      }
      // Fallback: assume a reasonable position size if no percentage data
      return sum + Math.abs(trade.realized_pnl || 0) * 10; // Assume 10% return on average
    }, 0);
    
    const percentageReturn = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    
    acc[date] = {
      pnl: totalPnl,
      percentageReturn: percentageReturn,
      totalInvested: totalInvested
    };
    return acc;
  }, {} as Record<string, { pnl: number; percentageReturn: number; totalInvested: number }>);

  // Calendar logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());

  const days = [];
  const currentDateObj = new Date(startDate);

  while (currentDateObj <= lastDayOfMonth || currentDateObj.getDay() !== 0) {
    days.push(new Date(currentDateObj));
    currentDateObj.setDate(currentDateObj.getDate() + 1);
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-200">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">P&L Calendar</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-0 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-0 py-1 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToNextMonth}
            className="p-0 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Month/Year Display */}
      <div className="text-center mb-2">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
          {monthNames[month]} {year}
        </h2>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {dayNames.map((day) => (
          <div key={day} className="p-2 text-center">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {day}
            </span>
          </div>
        ))}

        {/* Calendar Days */}
        {days.map((day, index) => {
          const dateString = day.toISOString().split('T')[0];
          const isCurrentMonth = day.getMonth() === month;
          const isToday = day.toDateString() === new Date().toDateString();
          const dayStats = dailyStats[dateString];
          const hasTrades = dayStats && dayStats.pnl !== 0;

          return (
            <div
              key={index}
              className={`relative p-1 sm:p-2 min-h-[40px] sm:min-h-[0px] border rounded-lg transition-all ${
                isCurrentMonth 
                  ? hasTrades 
                    ? getDayBackgroundColor(dayStats.pnl)
                    : 'bg-white border-gray-100'
                  : 'bg-gray-50 border-gray-100'
              } ${isToday ? 'ring-2 ring-blue-200' : ''}`}
            >
              {/* Date Number */}
              <div className={`text-[.5rem] sm:text-xs font-medium mb-1 ${
                isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
              }`}>
                {day.getDate()}
              </div>

              {/* P&L and Percentage Display */}
              {hasTrades && (
                <div className={`text-center ${getPnlColor(dayStats.pnl)} ${getPnlIntensity(dayStats.pnl)}`}>
                  <div className="text-[.45rem] sm:text-sm font-semibold">
                    {formatCurrency(dayStats.pnl)} ({dayStats.percentageReturn > 0 ? '+' : ''}{dayStats.percentageReturn.toFixed(1)}%)
                  </div>
                </div>
              )}

              {/* Trade Count Indicator */}
              {tradesByDate[dateString] && tradesByDate[dateString].length > 1 && (
                <div className="absolute top-0.5 right-0.5">
                  <div className="text-[.5rem] sm:text-xs font-semibold text-gray-800 bg-white shadow-sm px-1 py-0.3 sm:px-1.5 sm:py-0.5 rounded-sm border border-gray-300">
                    {tradesByDate[dateString].length}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
              <span className='text-[.6rem] sm:text-xs'>Profit</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
              <span className='text-[.6rem] sm:text-xs'>Loss</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="text-[.6rem] sm:text-xs font-semibold text-gray-800 bg-white shadow-sm px-1 py-0.3 mr-1 rounded-sm border border-gray-300">
                #
              </div>
              <span className='text-[.6rem] sm:text-xs'> Number of Trades</span>
            </div>
          </div>
          <div className="text-right text-[.6rem] sm:text-xs text-gray-500">
            <div className="font-medium">Today: {new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

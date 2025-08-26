"use client";
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, DollarSign, Percent, ToggleLeft, ToggleRight } from 'lucide-react';

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

// Utility function to format large numbers with K and M notation
const formatLargeNumber = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `$${(absValue / 1000000).toFixed(1)}M`;
  } else if (absValue >= 1000) {
    return `$${(absValue / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

export default function TradeCalendar({ trades }: TradeCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hasInitialized, setHasInitialized] = useState(false);
  const [displayMode, setDisplayMode] = useState<'price' | 'percentage' | 'r'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tradeCalendarDisplayMode');
      return (saved as 'price' | 'percentage' | 'r') || 'price';
    }
    return 'price';
  });
  const [rValue, setRValue] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tradeCalendarRValue');
      return saved ? parseFloat(saved) : 1;
    }
    return 1;
  });

  // Only auto-scroll to today on first mount, not on re-renders
  React.useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true);
      // Don't auto-scroll to today on mount
    }
  }, [hasInitialized]);

  const formatCurrency = (amount: number) => {
    return formatLargeNumber(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatR = (value: number) => {
    return `${value.toFixed(1)}R`;
  };

  const getPnlColor = (pnl: number) => {
    if (pnl > 0) return 'text-emerald-600';
    if (pnl < 0) return 'text-rose-600';
    return 'text-slate-600';
  };

  const getDayBackgroundColor = (pnl: number) => {
    if (pnl > 0) return 'bg-emerald-50 border-emerald-200';
    if (pnl < 0) return 'bg-rose-50 border-rose-200';
    return 'bg-white border-slate-100';
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
    
    // Calculate R value based on dollar profit/loss
    const rReturn = rValue > 0 ? totalPnl / rValue : 0;
    
    acc[date] = {
      pnl: totalPnl,
      percentageReturn: percentageReturn,
      rReturn: rReturn,
      totalInvested: totalInvested
    };
    return acc;
  }, {} as Record<string, { pnl: number; percentageReturn: number; rReturn: number; totalInvested: number }>);

  // Calendar logic - only weekdays
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  // Find the first Monday of the month (or the first day if it's a Monday)
  const startDate = new Date(firstDayOfMonth);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysToSubtract = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Monday = 1, Sunday = 0
  startDate.setDate(startDate.getDate() - daysToSubtract);

  const days = [];
  const currentDateObj = new Date(startDate);

  // Generate calendar days (only weekdays)
  while (currentDateObj <= lastDayOfMonth || currentDateObj.getDay() !== 6) {
    // Only include weekdays (Monday = 1, Tuesday = 2, ..., Friday = 5)
    if (currentDateObj.getDay() >= 1 && currentDateObj.getDay() <= 5) {
      days.push(new Date(currentDateObj));
    }
    currentDateObj.setDate(currentDateObj.getDate() + 1);
  }

  // Calculate weekly stats
  const weeklyStats = new Map<string, { pnl: number; trades: number; percentageReturn: number; totalInvested: number }>();
  
  days.forEach((day) => {
    const weekStart = new Date(day);
    const dayOfWeek = day.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 1, Sunday = 0
    weekStart.setDate(weekStart.getDate() - daysToSubtract);
    const weekKey = weekStart.toISOString().split('T')[0];
    
    const dateString = day.toISOString().split('T')[0];
    const dayStats = dailyStats[dateString];
    
    if (!weeklyStats.has(weekKey)) {
      weeklyStats.set(weekKey, { pnl: 0, trades: 0, percentageReturn: 0, totalInvested: 0 });
    }
    
    if (dayStats) {
      const weekData = weeklyStats.get(weekKey)!;
      weekData.pnl += dayStats.pnl;
      weekData.trades += tradesByDate[dateString]?.length || 0;
      weekData.totalInvested += dayStats.totalInvested;
    }
  });

  // Calculate weekly percentage return based on total invested
  weeklyStats.forEach((weekData) => {
    if (weekData.totalInvested > 0) {
      weekData.percentageReturn = (weekData.pnl / weekData.totalInvested) * 100;
    }
  });

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Week'];

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const toggleDisplayMode = () => {
    if (displayMode === 'price') {
      setDisplayMode('percentage');
      localStorage.setItem('tradeCalendarDisplayMode', 'percentage');
    } else if (displayMode === 'percentage') {
      setDisplayMode('r');
      localStorage.setItem('tradeCalendarDisplayMode', 'r');
    } else {
      setDisplayMode('price');
      localStorage.setItem('tradeCalendarDisplayMode', 'price');
    }
  };

  const handleRValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setRValue(0);
      localStorage.setItem('tradeCalendarRValue', '0');
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        setRValue(numValue);
        localStorage.setItem('tradeCalendarRValue', numValue.toString());
      }
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 pt-3 shadow-sm border border-slate-200 flex-1 flex flex-col">
      {/* Calendar Header */}
              <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] sm:text-xs 2xl:text-sm font-medium text-gray-600 uppercase tracking-wide">P&L Calendar</h3>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-50 rounded-md p-0.5 mr-2">
              <button
                onClick={() => {
                  setDisplayMode('price');
                  localStorage.setItem('tradeCalendarDisplayMode', 'price');
                }}
                className={`flex items-center justify-center w-6 h-5 rounded-sm transition-all duration-200 ${
                  displayMode === 'price' 
                    ? 'bg-white text-slate-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-600'
                }`}
              >
                <DollarSign className="h-2.5 w-2.5" />
              </button>
              <button
                onClick={() => {
                  setDisplayMode('percentage');
                  localStorage.setItem('tradeCalendarDisplayMode', 'percentage');
                }}
                className={`flex items-center justify-center w-6 h-5 rounded-sm transition-all duration-200 ${
                  displayMode === 'percentage' 
                    ? 'bg-white text-slate-700 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-600'
                }`}
              >
                <Percent className="h-2.5 w-2.5" />
              </button>
              <div className="flex">
                <button
                  onClick={() => {
                    setDisplayMode('r');
                    localStorage.setItem('tradeCalendarDisplayMode', 'r');
                  }}
                  className={`flex items-center justify-center w-6 h-5 transition-all duration-200 ${
                    displayMode === 'r' 
                      ? 'bg-white text-slate-700 shadow-sm rounded-l-sm' 
                      : 'text-slate-500 hover:text-slate-600 rounded-sm'
                  }`}
                >
                  <span className="text-[.6rem] font-bold">R</span>
                </button>
                {displayMode === 'r' && (
                  <input
                    type="number"
                    value={rValue === 0 ? '' : rValue}
                    onChange={handleRValueChange}
                    className="w-8 h-5 text-[.6rem] text-center border-0 rounded-r-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none leading-none py-0 px-0 font-medium shadow-sm"
                    min="0"
                    step="0.1"
                  />
                )}
              </div>
            </div>
            <button
              onClick={goToPreviousMonth}
              className="text-slate-400 hover:text-slate-600 transition-all duration-200 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="w-16 text-center px-0 py-1.5 text-[10px] sm:text-xs 2xl:text-sm font-medium text-gray-600 uppercase tracking-wide">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={goToNextMonth}
              className="text-slate-400 hover:text-slate-600 transition-all duration-200 rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-6 gap-1 flex-1">
        {/* Day Headers */}
        {dayNames.map((day) => (
          <div key={day} className="p-2 text-center">
            <span className="text-[.6rem] font-semibold text-slate-500 uppercase tracking-wider">
              {day}
            </span>
          </div>
        ))}

        {/* Calendar Days */}
        {(() => {
          const calendarDays = [];
          let weekIndex = 0;
          
          for (let i = 0; i < days.length; i += 5) {
            const weekDays = days.slice(i, i + 5);
            
            // Add the 5 weekdays
            weekDays.forEach((day, dayIndex) => {
              const dateString = day.toISOString().split('T')[0];
              const isCurrentMonth = day.getMonth() === month;
              const isToday = day.toDateString() === new Date().toDateString();
              const dayStats = dailyStats[dateString];
              const hasTrades = dayStats && dayStats.pnl !== 0;
              const sign = hasTrades ? (dayStats.pnl > 0 ? '+' : dayStats.pnl < 0 ? '-' : '') : '';

              calendarDays.push(
                <div
                  key={`day-${i + dayIndex}`}
                  className={`relative p-2 pb-1 min-h-[60px] border rounded-md transition-all duration-200 flex flex-col justify-between ${
                    isCurrentMonth 
                      ? hasTrades 
                        ? getDayBackgroundColor(dayStats.pnl)
                        : 'bg-white border-slate-100'
                      : 'bg-slate-50 border-slate-100'
                  } ${isToday ? 'ring-1 ring-blue-300 ring-offset-1' : ''}`}
                >
                  {/* Date Number */}
                  <div className={`text-[.6rem] font-semibold text-left ${
                    isCurrentMonth ? 'text-slate-900' : 'text-slate-400'
                  }`}>
                    {day.getDate()}
                  </div>

                  {/* P&L and Percentage Display */}
                  {hasTrades && (
                    <div className={`text-right ${getPnlColor(dayStats.pnl)} font-medium`} >
                      <div className="text-[.75rem] uppercase">
                        {sign}{displayMode === 'price' 
                          ? formatCurrency(Math.abs(dayStats.pnl))
                          : displayMode === 'percentage'
                          ? formatPercent(Math.abs(dayStats.percentageReturn))
                          : rValue > 0 ? formatR(Math.abs(dayStats.rReturn)) : '0.0R'
                        }
                      </div>
                      {/* Trade Count as gray text underneath */}
                      {tradesByDate[dateString] && tradesByDate[dateString].length > 0 && (
                        <div className="text-[.55rem] text-gray-500 font-medium -mt-0.5">
                          {tradesByDate[dateString].length} trades
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            });
            
            // Add weekly recap column
            const weekStart = new Date(weekDays[0]);
            const weekKey = weekStart.toISOString().split('T')[0];
            const weekData = weeklyStats.get(weekKey);
            const hasWeekData = weekData && (weekData.pnl !== 0 || weekData.trades > 0);
            const weekSign = hasWeekData ? (weekData.pnl > 0 ? '+' : weekData.pnl < 0 ? '-' : '') : '';
            
            calendarDays.push(
              <div
                key={`week-${weekIndex}`}
                className={`relative p-2 pb-1 min-h-[60px] border rounded-md transition-all duration-200 flex flex-col justify-between ${
                  hasWeekData 
                    ? getDayBackgroundColor(weekData.pnl)
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                {/* Week Label */}
                <div className="text-[.6rem] font-semibold text-slate-500 text-left">
                  Week {weekIndex + 1}
                </div>

                {/* Weekly P&L and Percentage Display */}
                {hasWeekData && (
                  <div className={`text-right ${getPnlColor(weekData.pnl)} font-medium`}>
                    <div className="text-[.75rem] uppercase">
                      {weekSign}{displayMode === 'price' 
                        ? formatCurrency(Math.abs(weekData.pnl))
                        : displayMode === 'percentage'
                        ? formatPercent(Math.abs(weekData.percentageReturn))
                        : rValue > 0 ? formatR(Math.abs(weekData.pnl / rValue)) : '0.0R'
                      }
                    </div>
                    {/* Weekly Trade Count */}
                    {weekData.trades > 0 && (
                      <div className="text-[.55rem] text-gray-500 font-medium -mt-0.5">
                        {weekData.trades} trades
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
            
            weekIndex++;
          }
          
          return calendarDays;
        })()}
      </div>

      {/* Legend */}
      <div className="mt-2 pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div> </div>
          {/* <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              <div className="w-2 h-2 bg-emerald-50 border border-emerald-200 rounded"></div>
              <span className="text-[.6rem] font-medium text-slate-600">Profit</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-2 h-2 bg-rose-50 border border-rose-200 rounded"></div>
              <span className="text-[.6rem] font-medium text-slate-600">Loss</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[.55rem] font-medium text-gray-500">Multiple trades shown as gray text</span>
            </div>
          </div> */}
          <div className="text-[.55rem] text-slate-500 text-right">
            <div className="font-medium">Today: {new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

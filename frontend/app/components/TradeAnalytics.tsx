"use client";
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Target, DollarSign, Percent, Calendar, BarChart3, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import TradeCalendar from './TradeCalendar';

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

interface TradeAnalytics {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  success_rate: number;
  total_pnl: number;
  average_pnl: number;
  monthly_performance: Record<string, {
    total_pnl: number;
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    success_rate: number;
  }>;
}

interface TradeAnalyticsProps {
  trades: Trade[];
  analytics: TradeAnalytics;
}

// Utility function to format large numbers with K and M notation
const formatLargeNumber = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (absValue >= 1000000) {
    return `${sign}$${(absValue / 1000000).toFixed(2)}M`;
  } else if (absValue >= 1000) {
    return `${sign}$${(absValue / 1000).toFixed(2)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

// Tooltip component
const InfoTooltip = ({ children, tooltip }: { children: React.ReactNode; tooltip: string }) => {
  const [showTooltip, setShowTooltip] = useState(false);
    
  return (
    <div className="relative inline-block">
      <div className="inline-flex items-center gap-1">
        {children}
        <div 
          className="relative cursor-help"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <Info className="h-3 w-3 text-gray-400 hover:text-black dark:text-white" />
          {showTooltip && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 px-2 py-1.5 bg-gray-900 text-gray-100 text-[12px] rounded-lg shadow-sm z-10 whitespace-nowrap opacity-90">
              {tooltip}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-gray-700"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function TradeAnalytics({ trades, analytics }: TradeAnalyticsProps) {
  const { token } = useAuth();
  const [isAnalyticsReady, setIsAnalyticsReady] = useState(false);

  const parseLocalDate = (dateString: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date(dateString);
  };

  // Set analytics as ready after a short delay to ensure calculations are complete
  useEffect(() => {
    if (trades.length > 0 && analytics.total_trades > 0) {
      const timer = setTimeout(() => {
        setIsAnalyticsReady(true);
      }, 50); // Small delay to ensure all calculations are complete
      return () => clearTimeout(timer);
    } else if (trades.length === 0) {
      setIsAnalyticsReady(true); // Show empty state immediately if no trades
    }
  }, [trades, analytics]);

  const formatCurrency = (amount: number) => {
    return formatLargeNumber(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getPnlColor = (pnl: number) => {
    return pnl >= 0 ? 'text-emerald-600' : 'text-rose-600';
  };

  const getPnlBgColor = (pnl: number) => {
    return pnl >= 0 ? 'bg-green-50' : 'bg-red-50';
  };

  const getPnlBorderColor = (pnl: number) => {
    return pnl >= 0 ? 'border-green-200' : 'border-red-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  };

  // Calculate additional analytics
  const getTopPerformer = () => {
    if (trades.length === 0) return { ticker: 'N/A', pnl: 0 };
    
    const tickerPerformance = trades.reduce((acc, trade) => {
      if (!acc[trade.ticker]) {
        acc[trade.ticker] = 0;
      }
      acc[trade.ticker] += trade.realized_pnl || 0;
      return acc;
    }, {} as Record<string, number>);
    
    const topTicker = Object.entries(tickerPerformance)
      .sort(([,a], [,b]) => b - a)[0];
    
    return { ticker: topTicker[0], pnl: topTicker[1] };
  };

  const getMostTraded = () => {
    if (trades.length === 0) return { ticker: 'N/A', count: 0 };
    
    const tickerCount = trades.reduce((acc, trade) => {
      acc[trade.ticker] = (acc[trade.ticker] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostTraded = Object.entries(tickerCount)
      .sort(([,a], [,b]) => b - a)[0];
    
    return { ticker: mostTraded[0], count: mostTraded[1] };
  };

  const getUniqueTickers = () => {
    return new Set(trades.map(t => t.ticker)).size;
  };

  const getAverageWinLoss = () => {
    if (trades.length === 0) return { avgWin: 0, avgLoss: 0, avgWinPercent: 0, avgLossPercent: 0 };
    
    const wins = trades.filter(t => (t.realized_pnl || 0) > 0);
    const losses = trades.filter(t => (t.realized_pnl || 0) < 0);
    
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.realized_pnl || 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + (t.realized_pnl || 0), 0) / losses.length : 0;
    
    const avgWinPercent = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.percent_diff || 0), 0) / wins.length : 0;
    const avgLossPercent = losses.length > 0 ? losses.reduce((sum, t) => sum + (t.percent_diff || 0), 0) / losses.length : 0;
    
    return { avgWin, avgLoss, avgWinPercent, avgLossPercent };
  };

  // Risk and performance analytics
  const getRiskMetrics = () => {
    if (trades.length === 0) return { profitFactor: 0, riskRewardRatio: 0, avgPositionReturn: 0, avgPercentReturn: 0 };
    
    const wins = trades.filter(t => (t.realized_pnl || 0) > 0);
    const losses = trades.filter(t => (t.realized_pnl || 0) < 0);
    
    const grossProfit = wins.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.realized_pnl || 0), 0));
    
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
    
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
    
    // Calculate average position return
    const avgPositionReturn = trades.length > 0 
      ? trades.reduce((sum, trade) => sum + (trade.realized_pnl ?? 0), 0) / trades.length 
      : 0;
    
    // Calculate dollar-weighted average percentage return
    let totalWeightedReturn = 0;
    let totalPositionSize = 0;
    
    trades.forEach(trade => {
      // Estimate position size from P&L and percentage
      let positionSize = 0;
      if (trade.percent_diff && trade.percent_diff !== 0) {
        positionSize = Math.abs((trade.realized_pnl || 0) / (trade.percent_diff / 100));
      } else {
        // Fallback: estimate position size if no percentage data
        positionSize = Math.abs(trade.realized_pnl || 0) * 10; // Assume 10% return on average
      }
      
      // Weight the percentage return by position size
      totalWeightedReturn += (trade.percent_diff || 0) * positionSize;
      totalPositionSize += positionSize;
    });
    
    const avgPercentReturn = totalPositionSize > 0 ? totalWeightedReturn / totalPositionSize : 0;
    
    return { profitFactor, riskRewardRatio, avgPositionReturn, avgPercentReturn };
  };

    const getBehavioralMetrics = () => {
    if (trades.length === 0) return { 
      maxConsecutiveWins: 0, 
      maxConsecutiveLosses: 0, 
      bestDay: 'N/A',
      worstDay: 'N/A',
      dayPerformance: {}
    };

    // Sort trades by date
    const sortedTrades = trades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate consecutive wins/losses
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    
    sortedTrades.forEach(trade => {
      const pnl = trade.realized_pnl || 0;
      if (pnl > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxConsecutiveWins) {
          maxConsecutiveWins = currentWinStreak;
        }
      } else if (pnl < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxConsecutiveLosses) {
          maxConsecutiveLosses = currentLossStreak;
        }
      }
    });

    // Performance by day of week - calculate once for both best and worst
    const dayPerformance = trades.reduce((acc, trade) => {
      try {
        const tradeDate = new Date(trade.date);
        if (isNaN(tradeDate.getTime())) {
          console.warn('Invalid date:', trade.date);
          return acc;
        }
        
        const day = tradeDate.toLocaleDateString('en-US', { weekday: 'long' });
        if (!acc[day]) {
          acc[day] = { total: 0, count: 0 };
        }
        
        acc[day].total += trade.realized_pnl || 0;
        acc[day].count++;
      } catch (error) {
        console.warn('Error parsing date:', trade.date, error);
      }
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    // Find best and worst days - only include days with actual trades
    const dayEntries = Object.entries(dayPerformance).filter(([, data]) => data.count > 0);
    const bestDay = dayEntries.length > 0 
      ? dayEntries.sort(([,a], [,b]) => b.total - a.total)[0]?.[0] || 'N/A'
      : 'N/A';
      
    const worstDay = dayEntries.length > 0 
      ? dayEntries.sort(([,a], [,b]) => a.total - b.total)[0]?.[0] || 'N/A'
      : 'N/A';

    return {
      maxConsecutiveWins,
      maxConsecutiveLosses,
      bestDay,
      worstDay,
      dayPerformance // Include the raw data for additional analysis if needed
    };
  };

  // If you need separate functions, you can extract them like this:
  const getBestDay = () => {
    const metrics = getBehavioralMetrics();
    return metrics.bestDay;
  };

  const getWorstDay = () => {
    const metrics = getBehavioralMetrics();
    return metrics.worstDay;
  };

  const getMaxDrawdown = () => {
    if (trades.length === 0) return 0;
    
    // Group trades by date and calculate daily P&L
    const dailyPnl = trades.reduce((acc, trade) => {
      try {
        const tradeDate = new Date(trade.date);
        if (isNaN(tradeDate.getTime())) {
          return acc;
        }
        
        const dateKey = tradeDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        if (!acc[dateKey]) {
          acc[dateKey] = 0;
        }
        acc[dateKey] += trade.realized_pnl || 0;
      } catch (error) {
        console.warn('Error parsing date:', trade.date, error);
      }
      return acc;
    }, {} as Record<string, number>);
    
    // Sort by date and calculate running totals
    const sortedDays = Object.entries(dailyPnl).sort(([a], [b]) => a.localeCompare(b));
    
    let runningTotal = 0;
    let peak = 0;
    let maxDrawdown = 0;
    
    sortedDays.forEach(([date, dailyPnl]) => {
      runningTotal += dailyPnl;
      
      // Update peak if we hit a new high
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      
      // Calculate drawdown from peak
      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });
    
    return maxDrawdown;
  };

  const getMaxRunup = () => {
    if (trades.length === 0) return 0;
    
    // Group trades by date and calculate daily P&L
    const dailyPnl = trades.reduce((acc, trade) => {
      try {
        const tradeDate = new Date(trade.date);
        if (isNaN(tradeDate.getTime())) {
          return acc;
        }
        
        const dateKey = tradeDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        if (!acc[dateKey]) {
          acc[dateKey] = 0;
        }
        acc[dateKey] += trade.realized_pnl || 0;
      } catch (error) {
        console.warn('Error parsing date:', trade.date, error);
      }
      return acc;
    }, {} as Record<string, number>);
    
    // Sort by date and calculate running totals
    const sortedDays = Object.entries(dailyPnl).sort(([a], [b]) => a.localeCompare(b));
    
    let runningTotal = 0;
    let trough = 0;
    let maxRunup = 0;
    
    sortedDays.forEach(([date, dailyPnl]) => {
      runningTotal += dailyPnl;
      
      // Update trough if we hit a new low
      if (runningTotal < trough) {
        trough = runningTotal;
      }
      
      // Calculate runup from trough
      const runup = runningTotal - trough;
      if (runup > maxRunup) {
        maxRunup = runup;
      }
    });
    
    return maxRunup;
  };

  const getPositionSizing = () => {
    if (trades.length === 0) return { avgPositionSize: 0, largestPosition: 0, concentration: 0 };
    
    // Estimate position size from P&L and percentage
    const positionSizes = trades.map(trade => {
      if (trade.percent_diff && trade.percent_diff !== 0) {
        return Math.abs((trade.realized_pnl || 0) / (trade.percent_diff / 100));
      }
      return Math.abs(trade.realized_pnl || 0) * 10; // Rough estimate
    });
    
    const avgPositionSize = positionSizes.reduce((sum, size) => sum + size, 0) / positionSizes.length;
    const largestPosition = Math.max(...positionSizes);
    
    // Calculate concentration (top ticker as % of total)
    const tickerTotals = trades.reduce((acc, trade) => {
      acc[trade.ticker] = (acc[trade.ticker] || 0) + Math.abs(trade.realized_pnl || 0);
      return acc;
    }, {} as Record<string, number>);
    
    const totalValue = Object.values(tickerTotals).reduce((sum, val) => sum + val, 0);
    const topTickerValue = Math.max(...Object.values(tickerTotals));
    const concentration = totalValue > 0 ? (topTickerValue / totalValue) * 100 : 0;
    
    return { avgPositionSize, largestPosition, concentration };
  };

  // Calculate total invested and percentage gain
  const getTotalInvestedAndGain = () => {
    if (trades.length === 0) return { totalInvested: 0, percentageGain: 0 };
    
    // Calculate maximum capital deployed at any one time
    // Sort trades by date to simulate sequential trading
    const sortedTrades = trades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let maxCapitalDeployed = 0;
    let currentCapital = 0;
    
    sortedTrades.forEach(trade => {
      // Estimate position size for this trade
      let positionSize = 0;
      if (trade.percent_diff && trade.percent_diff !== 0) {
        positionSize = Math.abs((trade.realized_pnl || 0) / (trade.percent_diff / 100));
      } else {
        positionSize = Math.abs(trade.realized_pnl || 0) * 10; // Rough estimate
      }
      
      // Add to current capital (simulating using available capital)
      currentCapital += positionSize;
      maxCapitalDeployed = Math.max(maxCapitalDeployed, currentCapital);
      
      // After trade, capital becomes available again (minus P&L)
      currentCapital = Math.max(0, currentCapital - positionSize + (trade.realized_pnl || 0));
    });
    
    // Use maximum capital deployed as the "total invested" base
    const totalInvested = maxCapitalDeployed;
    
    // Calculate percentage gain based on maximum capital deployed
    const percentageGain = totalInvested > 0 ? (analytics.total_pnl / totalInvested) * 100 : 0;
    
    return { totalInvested, percentageGain };
  };

  // Calculate dollar-weighted average return for each month
  const getMonthlyDollarWeightedReturns = () => {
    if (trades.length === 0) return {};
    
    // Group trades by month
    const monthlyTrades = trades.reduce((acc, trade) => {
      try {
        const tradeDate = new Date(trade.date);
        if (isNaN(tradeDate.getTime())) {
          return acc;
        }
        
        const monthKey = `${tradeDate.getFullYear()}-${(tradeDate.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!acc[monthKey]) {
          acc[monthKey] = [];
        }
        acc[monthKey].push(trade);
      } catch (error) {
        console.warn('Error parsing date:', trade.date, error);
      }
      return acc;
    }, {} as Record<string, Trade[]>);
    
    // Calculate dollar-weighted average return for each month
    const monthlyReturns = Object.entries(monthlyTrades).reduce((acc, [monthKey, monthTrades]) => {
      let totalWeightedReturn = 0;
      let totalPositionSize = 0;
      
      monthTrades.forEach(trade => {
        // Estimate position size from P&L and percentage
        let positionSize = 0;
        if (trade.percent_diff && trade.percent_diff !== 0) {
          positionSize = Math.abs((trade.realized_pnl || 0) / (trade.percent_diff / 100));
        } else {
          // Fallback: estimate position size if no percentage data
          positionSize = Math.abs(trade.realized_pnl || 0) * 10; // Assume 10% return on average
        }
        
        // Weight the percentage return by position size
        totalWeightedReturn += (trade.percent_diff || 0) * positionSize;
        totalPositionSize += positionSize;
      });
      
      acc[monthKey] = totalPositionSize > 0 ? totalWeightedReturn / totalPositionSize : 0;
      return acc;
    }, {} as Record<string, number>);
    
    return monthlyReturns;
  };

  const topPerformer = getTopPerformer();
  const mostTraded = getMostTraded();
  const uniqueTickers = getUniqueTickers();
  const { avgWin, avgLoss, avgWinPercent, avgLossPercent } = getAverageWinLoss();
  const { profitFactor, riskRewardRatio, avgPositionReturn, avgPercentReturn } = getRiskMetrics();
  const { maxConsecutiveWins, maxConsecutiveLosses, bestDay } = getBehavioralMetrics();
  const { avgPositionSize, largestPosition, concentration } = getPositionSizing();
  const { totalInvested, percentageGain } = getTotalInvestedAndGain();
  const monthlyDollarWeightedReturns = getMonthlyDollarWeightedReturns();

  return (
    <>
      {/* Analytics and Calendar Layout */}
      <div className="pt-7 md:p-0 grid grid-cols-1 xl:grid-cols-2 gap-4 mb-0">
        {/* Daily P&L Calendar */}
        <div className="flex flex-col h-full">
          <TradeCalendar trades={trades} />
        </div>

        {/* Analytics Cards - 2x3 Grid */}
        <div className="flex flex-col h-full">
          <div className="grid grid-cols-2 gap-4 gap-x-2 lg:gap-x-4 mb-4">
            {/* Overall Performance */}
            <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70">
              <div className="mb-3">
                <h3 className="text-[11px] lg:text-xs font-medium text-black dark:text-white uppercase tracking-wide">Overall</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-gray-500" />
                    <span className="text-[11px] lg:text-xs text-gray-600 dark:text-gray-300">This Month</span>
                  </div>
                  <span className={`text-xs lg:text-sm font-bold ${getPnlColor(trades.filter(t => {
                    const tradeDate = parseLocalDate(t.date);
                    const now = new Date();
                    return tradeDate.getMonth() === now.getMonth() && tradeDate.getFullYear() === now.getFullYear();
                  }).reduce((sum, t) => sum + (t.realized_pnl || 0), 0))}`}>
                    {formatCurrency(trades.filter(t => {
                      const tradeDate = parseLocalDate(t.date);
                      const now = new Date();
                      return tradeDate.getMonth() === now.getMonth() && tradeDate.getFullYear() === now.getFullYear();
                    }).reduce((sum, t) => sum + (t.realized_pnl || 0), 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3 text-gray-500" />
                    <span className="text-[11px] lg:text-xs text-gray-600 dark:text-gray-300">All Time</span>
                  </div>
                  <span className={`text-xs lg:text-sm font-bold ${getPnlColor(analytics.total_pnl)}`}>
                    {formatCurrency(analytics.total_pnl)}
                  </span>
                </div>
              </div>
            </div>

            {/* Win/Loss Analysis */}
            <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70">
              <div className="mb-3">
                <h3 className="text-[11px] lg:text-xs font-medium text-black dark:text-white uppercase tracking-wide">Performance</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                      <div className="w-2 h-2 bg-rose-600 rounded-full"></div>
                    </div>
                    <span className="text-[11px] lg:text-xs text-gray-600 dark:text-gray-300">Wins/Losses</span>
                  </div>
                  <span className="text-xs lg:text-sm font-bold text-gray-900 dark:text-gray-100">
                    {analytics.winning_trades}/{analytics.losing_trades}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Percent className="h-3 w-3 text-gray-500" />
                    <span className="text-[11px] lg:text-xs text-gray-600 dark:text-gray-300">Win Rate</span>
                  </div>
                  <span className="text-xs lg:text-sm font-bold text-emerald-600">
                    {formatPercent(analytics.success_rate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Risk/Reward Analysis */}
            <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70">
              <div className="mb-3">
                <h3 className="text-[11px] lg:text-xs font-medium text-black dark:text-white uppercase tracking-wide">Efficiency</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3 text-gray-500" />
                    <span className="text-[11px] lg:text-xs text-gray-600 dark:text-gray-300">Profit Factor</span>
                  </div>
                  <span className={`text-xs lg:text-sm font-bold ${profitFactor >= 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {profitFactor.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Target className="h-3 w-3 text-gray-500" />
                    <span className="text-[11px] lg:text-xs text-gray-600 dark:text-gray-300">Risk/Reward</span>
                  </div>
                  <span className={`text-xs lg:text-sm font-bold ${riskRewardRatio >= 1 ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {riskRewardRatio.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>


            {/* Trade Quality */}
            <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70">
              <div className="mb-3">
                <h3 className="text-[11px] lg:text-xs font-medium text-black dark:text-white uppercase tracking-wide"> Average Returns</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                    <span className="text-[11px] lg:text-xs text-gray-600 dark:text-gray-300"> Win</span>
                  </div>
                  <span className="text-xs lg:text-sm font-bold text-emerald-600">
                    {formatCurrency(avgWin)} ({avgWinPercent > 0 ? '+' : ''}{avgWinPercent.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-rose-600 rounded-full"></div>
                    <span className="text-[11px] lg:text-xs text-gray-600 dark:text-gray-300"> Loss</span>
                  </div>
                  <span className="text-xs lg:text-sm font-bold text-rose-600">
                    {formatCurrency(Math.abs(avgLoss))} ({avgLossPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
            
            {/* Risk Management */}
            <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70">
              <div className="mb-3">
                <h3 className="text-[11px] lg:text-xs font-medium text-black dark:text-white uppercase tracking-wide">Position Size</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3 text-gray-500" />
                    <span className="text-[11px] lg:text-xs text-gray-600 dark:text-gray-300">Avg Position</span>
                  </div>
                  <span className="text-xs lg:text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(avgPositionSize)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Percent className="h-3 w-3 text-gray-500" />
                    <span className="text-[11px] lg:text-xs text-gray-600 dark:text-gray-300">Avg Return</span>
                  </div>
                  <span className={`text-xs lg:text-sm font-bold ${avgPercentReturn > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatPercent(avgPercentReturn)}
                  </span>
                </div>
              </div>
            </div>

            {/* Drawdown Analysis */}
            <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70">
              <div className="mb-3">
                <h3 className="text-[11px] lg:text-xs font-medium text-black dark:text-white uppercase tracking-wide">Risk Profile</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                    <span className="text-[11px] lg:text-xs text-gray-600 dark:text-gray-300">Max Runup</span>
                  </div>
                  <span className="text-xs lg:text-sm font-bold text-emerald-600">
                    {formatCurrency(getMaxRunup())}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-3 w-3 text-rose-500" />
                    <span className="text-[11px] lg:text-xs text-gray-600 dark:text-gray-300">Max Drawdown</span>
                  </div>
                  <span className="text-xs lg:text-sm font-bold text-rose-600">
                    {formatCurrency(getMaxDrawdown())}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Performance */}
          <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70 flex-1 flex flex-col">
            <div className="mb-2">
              <h3 className="text-[11px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Monthly Performance</h3>
            </div>
            <div className={`overflow-y-auto flex-1 ${Object.keys(analytics.monthly_performance).length > 2 ? 'max-h-[115px]' : ''}`}>
              <table className="w-full">
                <thead className="sticky top-0 bg-white dark:bg-black">
                  <tr className="border-b border-gray-200 dark:border-gray-800/70">
                    <th className="text-left py-3 pl-0 pr-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-gray-500 hidden sm:block" />
                        Month
                      </div>
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                      <div className="flex items-center justify-end gap-1.5">
                        <Target className="h-3 w-3 text-gray-500 hidden sm:block" />
                        Trades
                      </div>
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                      <div className="flex items-center justify-end gap-1.5">
                        <Percent className="h-3 w-3 text-gray-500 hidden sm:block" />
                        Win Rate
                      </div>
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                      <div className="flex items-center justify-end gap-1.5">
                        <TrendingUp className="h-3 w-3 text-gray-500 hidden sm:block" />
                        Avg Return
                      </div>
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                      <div className="flex items-center justify-end gap-1.5">
                        <DollarSign className="h-3 w-3 text-gray-500 hidden sm:block" />
                        Total P&L
                      </div>
                    </th>
                  </tr>
                </thead>
                  <tbody>
                    {(() => {
                      const months = Object.entries(analytics.monthly_performance)
                        .sort(([a], [b]) => b.localeCompare(a));
                    
                    const monthCount = months.length;
                    
                    if (monthCount === 0) {
                      // No data - show 2 empty rows
                      return [
                        <tr key="empty-1" className="border-b border-gray-200 dark:border-gray-900">
                          <td className="py-2 sm:py-2 pl-0 pr-2 sm:pr-4 text-[12px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-gray-100">-</td>
                          <td className="py-2 sm:py-2 px-2 sm:px-4 text-[12px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 text-right">-</td>
                          <td className="py-2 sm:py-2 px-2 sm:px-4 text-[12px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 text-right">-</td>
                          <td className="py-2 sm:py-2 px-2 sm:px-4 text-[12px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 text-right">-</td>
                          <td className="py-2 sm:py-2 px-2 sm:px-4 text-[12px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-gray-100 text-right">-</td>
                        </tr>,
                        <tr key="empty-2" className="border-b border-gray-200 dark:border-gray-900">
                          <td className="py-2 sm:py-2 pl-0 pr-2 sm:pr-4 text-[12px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-gray-100">-</td>
                          <td className="py-2 sm:py-2 px-2 sm:px-4 text-[12px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 text-right">-</td>
                          <td className="py-2 sm:py-2 px-2 sm:px-4 text-[12px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 text-right">-</td>
                          <td className="py-2 sm:py-2 px-2 sm:px-4 text-[12px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 text-right">-</td>
                          <td className="py-2 sm:py-2 px-2 sm:px-4 text-[12px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-gray-100 text-right">-</td>
                        </tr>
                      ];
                    }
                    
                    return months.map(([monthKey, data], index) => {
                      const avgReturn = monthlyDollarWeightedReturns[monthKey] || 0;
                      return (
                        <tr key={monthKey} className="border-b border-gray-200 dark:border-gray-900">
                          <td className="py-3 pl-0 pr-2 text-[11px] sm:text-xs font-medium text-gray-900 dark:text-gray-100">
                            {formatMonth(monthKey)}
                          </td>
                          <td className="py-3 px-2 text-[11px] sm:text-xs text-gray-900 dark:text-gray-100 text-right">
                            <span className="font-medium">{data.total_trades}</span>
                          </td>
                          <td className="py-3 px-2 text-[11px] sm:text-xs text-right">
                            <span className={`font-medium ${data.success_rate >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {formatPercent(data.success_rate)}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-[11px] sm:text-xs text-right">
                            <span className={`font-medium ${avgReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {formatPercent(avgReturn)}
                            </span>
                          </td>
                          <td className={`py-3 px-2 text-[11px] sm:text-xs font-medium text-right ${getPnlColor(data.total_pnl)}`}>
                            {formatCurrency(data.total_pnl)}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

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
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 px-2 py-1.5 bg-gray-900 text-gray-100 text-[10px] rounded-md shadow-sm z-10 whitespace-nowrap opacity-90">
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
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
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
    
    // Calculate average percentage return
    const avgPercentReturn = trades.length > 0 
      ? trades.reduce((sum, trade) => sum + (trade.percent_diff ?? 0), 0) / trades.length 
      : 0;
    
    return { profitFactor, riskRewardRatio, avgPositionReturn, avgPercentReturn };
  };

  const getBehavioralMetrics = () => {
    if (trades.length === 0) return { maxConsecutiveWins: 0, maxConsecutiveLosses: 0, bestDay: 'N/A' };
    
    // Sort trades by date
    const sortedTrades = trades.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
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
    
    // Performance by day of week
    const dayPerformance = trades.reduce((acc, trade) => {
      const day = new Date(trade.date).toLocaleDateString('en-US', { weekday: 'long' });
      if (!acc[day]) {
        acc[day] = { total: 0, count: 0 };
      }
      acc[day].total += trade.realized_pnl || 0;
      acc[day].count++;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);
    
    const bestDay = Object.entries(dayPerformance)
      .sort(([,a], [,b]) => (b.total / b.count) - (a.total / a.count))[0];
    
    return { 
      maxConsecutiveWins, 
      maxConsecutiveLosses, 
      bestDay: bestDay ? bestDay[0] : 'N/A' 
    };
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

  const topPerformer = getTopPerformer();
  const mostTraded = getMostTraded();
  const uniqueTickers = getUniqueTickers();
  const { avgWin, avgLoss, avgWinPercent, avgLossPercent } = getAverageWinLoss();
  const { profitFactor, riskRewardRatio, avgPositionReturn, avgPercentReturn } = getRiskMetrics();
  const { maxConsecutiveWins, maxConsecutiveLosses, bestDay } = getBehavioralMetrics();
  const { avgPositionSize, largestPosition, concentration } = getPositionSizing();
  const { totalInvested, percentageGain } = getTotalInvestedAndGain();

  return (
    <>
      {/* Analytics and Calendar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-0">
        {/* Daily P&L Calendar */}
        <div className="flex flex-col h-full">
          <TradeCalendar trades={trades} />
        </div>

        {/* Analytics Cards - 2x3 Grid */}
        <div className="flex flex-col h-full">
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Overall Performance */}
            <div className="bg-white dark:bg-black rounded-lg p-4 shadow-sm border border-slate-200 dark:border-gray-700">
              <div>
                <h3 className="text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Overall</h3>
              </div>
              <div className="space-y-1 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] sm:text-xs 2xl:text-sm text-black dark:text-white">This Month</span>
                  <span className={`text-[10px] sm:text-sm 2xl:text-base font-semibold ${getPnlColor(trades.filter(t => {
                    const tradeDate = new Date(t.date);
                    const now = new Date();
                    return tradeDate.getMonth() === now.getMonth() && tradeDate.getFullYear() === now.getFullYear();
                  }).reduce((sum, t) => sum + (t.realized_pnl || 0), 0))}`}>
                    {formatCurrency(trades.filter(t => {
                      const tradeDate = new Date(t.date);
                      const now = new Date();
                      return tradeDate.getMonth() === now.getMonth() && tradeDate.getFullYear() === now.getFullYear();
                    }).reduce((sum, t) => sum + (t.realized_pnl || 0), 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] sm:text-xs 2xl:text-sm text-black dark:text-white">All Time</span>
                  <span className={`text-[10px] sm:text-sm 2xl:text-base font-semibold ${getPnlColor(analytics.total_pnl)}`}>
                    {formatCurrency(analytics.total_pnl)}
                  </span>
                </div>
              </div>
            </div>

            {/* Win/Loss Analysis */}
            <div className="bg-white dark:bg-black rounded-lg p-4 shadow-sm border border-slate-200 dark:border-gray-700" >
              <div>
                <h3 className="text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Win/Loss</h3>
              </div>
              <div className="space-y-1 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] sm:text-xs 2xl:text-sm text-black dark:text-white" >Wins/Losses</span>
                  <span className="text-[10px] sm:text-sm 2xl:text-base font-semibold text-gray-900 dark:text-gray-100">
                    {analytics.winning_trades}/{analytics.losing_trades}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] sm:text-xs 2xl:text-sm text-black dark:text-white">Success Rate</span>
                  <span className="text-[10px] sm:text-sm 2xl:text-base font-semibold text-green-600">
                    {formatPercent(analytics.success_rate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Risk/Reward Analysis */}
            <div className="bg-white dark:bg-black rounded-xl p-4 shadow-sm border border-slate-200 dark:border-gray-700">
              <div className="mb-2">
                <h3 className="text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Risk/Reward</h3>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <InfoTooltip tooltip="Gross profit divided by gross loss. Above 1.0 means profitable trading.">
                    <span className="text-[10px] sm:text-xs 2xl:text-sm text-black dark:text-white">Profit Factor</span>
                  </InfoTooltip>
                  <span className="text-[10px] sm:text-sm 2xl:text-base font-semibold text-gray-900 dark:text-gray-100">
                    {profitFactor.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <InfoTooltip tooltip="Average win divided by average loss. Higher ratio = better risk management.">
                    <span className="text-[10px] sm:text-xs 2xl:text-sm text-black dark:text-white">Risk/Reward</span>
                  </InfoTooltip>
                  <span className="text-[10px] sm:text-sm 2xl:text-base font-semibold text-gray-900 dark:text-gray-100">
                    {riskRewardRatio.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Risk Management */}
            <div className="bg-white dark:bg-black rounded-xl p-4 shadow-sm border border-slate-200 dark:border-gray-700">
              <div className="mb-2">
                <h3 className="text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Risk Management</h3>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <InfoTooltip tooltip="Average dollar amount invested per trade (estimated from P&L and percentage).">
                    <span className="text-[10px] sm:text-xs 2xl:text-sm text-black dark:text-white">Avg Position</span>
                  </InfoTooltip>
                  <span className="text-[10px] sm:text-sm 2xl:text-base font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(avgPositionSize)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <InfoTooltip tooltip="Average percentage return per trade across all positions.">
                    <span className="text-[10px] sm:text-xs 2xl:text-sm text-black dark:text-white">Avg Position Return</span>
                  </InfoTooltip>
                  <span className={`text-[10px] sm:text-sm 2xl:text-base font-semibold ${avgPercentReturn > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(avgPercentReturn)}
                  </span>
                </div>
              </div>
            </div>

            {/* Trade Quality */}
            <div className="bg-white dark:bg-black rounded-lg p-4 shadow-sm border border-slate-200 dark:border-gray-700">
              <div className="mb-3">
                <h3 className="text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Trade Quality</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <InfoTooltip tooltip="Average win on profitable trades and respective percentage of position size.">
                    <span className="text-[10px] sm:text-xs 2xl:text-sm text-black dark:text-white">Avg Win</span>
                  </InfoTooltip>
                  <span className="text-[10px] sm:text-sm 2xl:text-base font-semibold text-green-600">
                    {formatCurrency(avgWin)} ({avgWinPercent > 0 ? '+' : ''}{avgWinPercent.toFixed(1)}%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <InfoTooltip tooltip="Average loss on losing trades and respective percentage of position size.">
                    <span className="text-[10px] sm:text-xs 2xl:text-sm text-black dark:text-white">Avg Loss</span>
                  </InfoTooltip>
                  <span className="text-[10px] sm:text-sm 2xl:text-base font-semibold text-red-600">
                    {formatCurrency(Math.abs(avgLoss))} ({avgLossPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Trading Activity */}
            <div className="bg-white dark:bg-black rounded-lg p-4 shadow-sm border border-slate-200 dark:border-gray-700">
              <div className="mb-3">
                <h3 className="text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Trading Activity</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] sm:text-xs 2xl:text-sm text-black dark:text-white">Total Trades</span>
                  <span className="text-[10px] sm:text-sm 2xl:text-base font-semibold text-gray-900 dark:text-gray-100">
                    {analytics.total_trades}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] sm:text-xs 2xl:text-sm text-black dark:text-white">Unique Tickers</span>
                  <span className="text-[10px] sm:text-sm 2xl:text-base font-semibold text-gray-900 dark:text-gray-100">
                    {uniqueTickers}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Performance */}
          <div className="bg-white dark:bg-black rounded-lg p-4 shadow-sm border border-slate-200 dark:border-gray-700 flex-1 flex flex-col">
            <div className="mb-3">
              <h3 className="text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Monthly Performance</h3>
            </div>
            <div className={`overflow-y-auto flex-1 ${Object.keys(analytics.monthly_performance).length > 2 ? 'max-h-[115px]' : ''}`}>
              <table className="w-full">
                                  <thead className="sticky top-0 bg-white dark:bg-black">
                    <tr className="border-b border-slate-200 dark:border-gray-800/80">
                      <th className="text-left py-2 sm:py-2 pl-0 pr-2 sm:pr-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white">Month</th>
                      <th className="text-right py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white">Trades</th>
                      <th className="text-right py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white">Win Rate</th>
                      <th className="text-right py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white">Total P&L</th>
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
                        <tr key="empty-1" className="border-b border-slate-200 dark:border-gray-800/80">
                          <td className="py-2 sm:py-2 pl-0 pr-2 sm:pr-4 text-[10px] sm:text-xs 2xl:text-sm font-semibold text-gray-900 dark:text-gray-100">-</td>
                          <td className="py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 text-right">-</td>
                          <td className="py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 text-right">-</td>
                          <td className="py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">-</td>
                        </tr>,
                        <tr key="empty-2" className="border-b border-slate-200 dark:border-gray-800/80">
                          <td className="py-2 sm:py-2 pl-0 pr-2 sm:pr-4 text-[10px] sm:text-xs 2xl:text-sm font-semibold text-gray-900 dark:text-gray-100">-</td>
                          <td className="py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 text-right">-</td>
                          <td className="py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 text-right">-</td>
                          <td className="py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-semibold text-gray-900 dark:text-gray-100 text-right">-</td>
                        </tr>
                      ];
                    }
                    
                    return months.map(([monthKey, data], index) => (
                      <tr key={monthKey} className="border-b border-slate-200 dark:border-gray-800/80">
                        <td className="py-2 sm:py-2 pl-0 pr-2 sm:pr-4 text-[10px] sm:text-xs 2xl:text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatMonth(monthKey)}
                        </td>
                        <td className="py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 text-right">
                          {data.total_trades}
                        </td>
                        <td className="py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 text-right">
                          {formatPercent(data.success_rate)}
                        </td>
                        <td className={`py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-semibold text-right ${getPnlColor(data.total_pnl)}`}>
                          {formatCurrency(data.total_pnl)}
                        </td>
                      </tr>
                    ));
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

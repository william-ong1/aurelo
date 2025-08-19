"use client";
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Target, DollarSign, Percent, Calendar, BarChart3 } from 'lucide-react';
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

export default function TradeAnalytics({ trades, analytics }: TradeAnalyticsProps) {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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

  return (
    <>
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        {/* Overall Performance */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Overall</h3>
            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">This Month</span>
              <span className={`text-sm sm:text-lg font-semibold ${getPnlColor(trades.filter(t => {
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
              <span className="text-xs sm:text-sm text-gray-600">All Time</span>
              <span className={`text-sm sm:text-lg font-semibold ${getPnlColor(analytics.total_pnl)}`}>
                {formatCurrency(analytics.total_pnl)}
              </span>
            </div>
          </div>
        </div>

        {/* Average Per Trade */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Per Trade</h3>
            <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">Avg %</span>
              <span className="text-sm sm:text-lg font-semibold text-gray-900">
                {trades.length > 0 ? formatPercent(trades.reduce((sum, trade) => sum + (trade.percent_diff || 0), 0) / trades.length) : '0%'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">Avg Value</span>
              <span className={`text-sm sm:text-lg font-semibold ${getPnlColor(analytics.average_pnl)}`}>
                {formatCurrency(analytics.average_pnl)}
              </span>
            </div>
          </div>
        </div>

        {/* Win/Loss */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Win/Loss</h3>
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">Wins/Losses</span>
              <span className="text-sm sm:text-lg font-semibold text-gray-900">
                {analytics.winning_trades}/{analytics.losing_trades}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">Success Rate</span>
              <span className="text-sm sm:text-lg font-semibold text-green-600">
                {formatPercent(analytics.success_rate)}
              </span>
            </div>
          </div>
        </div>

        {/* Best/Worst Trade */}
        <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Trade Range</h3>
            <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">Best</span>
              <span className="text-sm sm:text-lg font-semibold text-green-600">
                {trades.length > 0 ? formatCurrency(Math.max(...trades.map(t => t.realized_pnl || 0))) : '$0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-600">Worst</span>
              <span className="text-sm sm:text-lg font-semibold text-red-600">
                {trades.length > 0 ? formatCurrency(Math.min(...trades.map(t => t.realized_pnl || 0))) : '$0'}
              </span>
            </div>
          </div>
        </div>
      </div>



      {/* Daily P&L Calendar */}
      <div className="mb-0 sm:mb-6">
        <TradeCalendar trades={trades} />
      </div>

      {/* Monthly Performance */}
      {Object.keys(analytics.monthly_performance).length > 0 && (
        <div className="bg-white rounded-xl p-3 sm:p-5 shadow-sm border border-gray-200 sm:mb-6 mt-6">
          <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Monthly Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600">Month</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600">Trades</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600">Win Rate</th>
                  <th className="text-right py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium text-gray-600">Total P&L</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(analytics.monthly_performance)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([monthKey, data]) => (
                    <tr key={monthKey} className="border-b border-gray-100">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-gray-900">{formatMonth(monthKey)}</td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-900 text-right">{data.total_trades}</td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm text-gray-900 text-right">
                        {formatPercent(data.success_rate)}
                      </td>
                      <td className={`py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-semibold text-right ${getPnlColor(data.total_pnl)}`}>
                        {formatCurrency(data.total_pnl)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


    </>
  );
}

"use client";
import React, { useState } from 'react';
import { Edit2, Trash2, Plus, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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

interface TradeListProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (tradeId: number) => void;
  onAdd: () => void;
}

export default function TradeList({ trades, onEdit, onDelete, onAdd }: TradeListProps) {
  const { token } = useAuth();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const formatDate = (dateString: string) => {
    // Parse the date string as YYYY-MM-DD format to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed in JavaScript
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPnlColor = (pnl: number) => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-sm sm:text-lg font-semibold text-gray-900">Trade History</h3>
        <button
          onClick={onAdd}
          className="p-1 pr-2 rounded-lg transition-colors text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
          title="Add Trade"
        >
          <Plus className='w-4 h-4 sm:w-6 sm:h-6' />
        </button>
      </div>
      
      <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 sm:mb-6">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-2 sm:py-3 px-3 sm:px-6 text-xs sm:text-sm font-medium text-gray-600">Date</th>
              <th className="text-left py-2 sm:py-3 px-3 sm:px-6 text-xs sm:text-sm font-medium text-gray-600">Ticker</th>
              <th className="text-right py-2 sm:py-3 px-3 sm:px-6 text-xs sm:text-sm font-medium text-gray-600">P&L</th>
              <th className="text-right py-2 sm:py-3 px-3 sm:px-6 text-xs sm:text-sm font-medium text-gray-600">% Diff</th>
              <th className="text-center py-2 sm:py-3 px-3 sm:px-6 text-xs sm:text-sm font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {trades.length > 0 ? (
              trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm text-gray-900">
                    {formatDate(trade.date)}
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-6">
                    <span className="text-xs sm:text-sm font-semibold text-gray-900">{trade.ticker}</span>
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-semibold text-right">
                    <span className={getPnlColor(trade.realized_pnl || 0)}>
                      {formatCurrency(trade.realized_pnl || 0)}
                    </span>
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm font-semibold text-right">
                    <span className={getPnlColor(trade.percent_diff || 0)}>
                      {formatPercent(trade.percent_diff || 0)}
                    </span>
                  </td>
                  <td className="py-3 sm:py-4 px-3 sm:px-6 text-center">
                    <div className="flex items-center justify-center gap-1 sm:gap-2">
                      <button
                        onClick={() => onEdit(trade)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit trade"
                      >
                        <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this trade?')) {
                            onDelete(trade.id);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete trade"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-6 sm:py-8 px-3 sm:px-6 text-center text-xs sm:text-sm text-gray-500">
                  No trades yet. Click the + button to add your first trade.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

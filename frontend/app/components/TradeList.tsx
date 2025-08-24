"use client";
import React, { useState, useMemo } from 'react';
import { Edit2, Trash2, Plus, Calendar, TrendingUp, TrendingDown, Download, ChevronUp, ChevronDown } from 'lucide-react';
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

type SortField = 'date' | 'ticker' | 'realized_pnl' | 'percent_diff';
type SortDirection = 'asc' | 'desc';

interface TradeListProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (tradeId: number) => void;
  onAdd: () => void;
}

export default function TradeList({ trades, onEdit, onDelete, onAdd }: TradeListProps) {
  const { token } = useAuth();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [displayCount, setDisplayCount] = useState(5);
  const [showSelector, setShowSelector] = useState(false);
  
  // Available options for trade display
  const getDisplayOptions = () => {
    const options: (number | string)[] = [5, 10, 25, 50, 100];
    const maxTrades = sortedTrades.length;
    
    // Filter options based on total trades
    const filteredOptions = options.filter(option => 
      option === 'all' || (typeof option === 'number' && option <= maxTrades)
    );
    
    // Always add "All" option if not already present
    if (!filteredOptions.includes('all')) {
      filteredOptions.push('all');
    }
    
    return filteredOptions;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'ticker':
          aValue = a.ticker.toLowerCase();
          bValue = b.ticker.toLowerCase();
          break;
        case 'realized_pnl':
          aValue = a.realized_pnl || 0;
          bValue = b.realized_pnl || 0;
          break;
        case 'percent_diff':
          aValue = a.percent_diff || 0;
          bValue = b.percent_diff || 0;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [trades, sortField, sortDirection]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp className="h-3 w-3 opacity-30" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-3 w-3" /> : 
      <ChevronDown className="h-3 w-3" />;
  };

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

  const escapeCsv = (value: unknown) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const exportToCsv = () => {
    const headers = [
      'Date',
      'Ticker',
      'Type',
      'Shares',
      'Price',
      'Realized P&L',
      '% Diff',
      'Notes',
      'ID'
    ];

    const rows = [...trades]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((t) => [
        t.date,
        t.ticker,
        t.trade_type,
        t.shares,
        t.price,
        t.realized_pnl ?? '',
        t.percent_diff ?? '',
        t.notes ?? '',
        t.id
      ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    link.download = `trades-${ts}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="bg-white rounded-lg p-4 pb-2 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] sm:text-xs 2xl:text-sm font-medium text-gray-600 uppercase tracking-wide">Trade History</h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={exportToCsv}
              className="p-0.5 pr-1.5 rounded-md transition-colors text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
              title="Export CSV"
            >
              <Download className='w-3 h-3 sm:w-4 sm:h-4 2xl:w-5 2xl:h-5' />
            </button>
            <button
              onClick={onAdd}
              className="p-0.5 pr-1.5 rounded-md transition-colors text-gray-400 hover:text-gray-600 transition-all cursor-pointer"
              title="Add Trade"
            >
              <Plus className='w-3 h-3 sm:w-4 sm:h-4 2xl:w-5 2xl:h-5' />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="sticky top-0 bg-white select-none">
              <tr className="border-b border-gray-200">
                <th 
                  className="text-left py-1.5 sm:py-1.5 pl-0 pr-2 sm:pr-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800 transition-colors select-none w-1/5"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {getSortIcon('date')}
                  </div>
                </th>
                <th 
                  className="text-left py-1.5 sm:py-1.5 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800 transition-colors select-none w-1/5"
                  onClick={() => handleSort('ticker')}
                >
                  <div className="flex items-center gap-1">
                    Ticker
                    {getSortIcon('ticker')}
                  </div>
                </th>
                <th 
                  className="text-right py-1.5 sm:py-1.5 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800 transition-colors select-none w-1/5"
                  onClick={() => handleSort('realized_pnl')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    P&L
                    {getSortIcon('realized_pnl')}
                  </div>
                </th>
                <th 
                  className="text-right py-1.5 sm:py-1.5 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800 transition-colors select-none w-1/5"
                  onClick={() => handleSort('percent_diff')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    % Diff
                    {getSortIcon('percent_diff')}
                  </div>
                </th>
                <th className="text-center py-1.5 sm:py-1.5 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-gray-600 select-none w-1/5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTrades.length > 0 ? (
                sortedTrades.slice(0, displayCount).map((trade) => (
                  <tr key={trade.id} className="border-b border-gray-100">
                    <td className="py-1.5 sm:py-1.5 pl-0 pr-2 sm:pr-4 text-[10px] sm:text-xs 2xl:text-sm text-gray-900">
                      {formatDate(trade.date)}
                    </td>
                    <td className="py-1.5 sm:py-1.5 px-2 sm:px-4">
                      <span className="text-[10px] sm:text-xs 2xl:text-sm font-semibold text-gray-900">{trade.ticker}</span>
                    </td>
                    <td className="py-1.5 sm:py-1.5 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-semibold text-right">
                      <span className={getPnlColor(trade.realized_pnl || 0)}>
                        {formatCurrency(trade.realized_pnl || 0)}
                      </span>
                    </td>
                    <td className="py-1.5 sm:py-1.5 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-semibold text-right">
                      <span className={getPnlColor(trade.percent_diff || 0)}>
                        {formatPercent(trade.percent_diff || 0)}
                      </span>
                    </td>
                    <td className="py-2 sm:py-2 px-2 sm:px-4 text-center">
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <button
                          onClick={() => onEdit(trade)}
                          className="p-0.5 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit trade"
                        >
                          <Edit2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this trade?')) {
                              onDelete(trade.id);
                            }
                          }}
                          className="p-0.5 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete trade"
                        >
                          <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 sm:py-8 px-3 sm:px-6 text-center text-[10px] sm:text-xs 2xl:text-sm text-gray-500">
                    No trades yet. Click the + button to add your first trade.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Trade Count Footer */}
        {sortedTrades.length > 0 && (
          <div className="flex justify-end mt-1">
                <div className="flex items-center gap-1">
                <span className="text-[.6rem] text-slate-500">Showing</span>
                <div className="relative flex items-center">
                  <select
                    value={displayCount === sortedTrades.length ? 'all' : displayCount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDisplayCount(value === 'all' ? sortedTrades.length : parseInt(value));
                    }}
                    className={`text-[.6rem] text-slate-500 bg-transparent border-none outline-none cursor-pointer hover:text-slate-600 transition-colors appearance-none ${displayCount === 5 ? 'pr-0' : displayCount === 100 ? 'pr-3' : 'pr-2'}`}
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="100">100</option>
                    <option value="all">all</option>
                  </select>
                  <ChevronDown className="absolute right-0 h-2.5 w-2.5 text-slate-400 pointer-events-none" />
                </div>
                <span className="text-[.6rem] text-slate-500">trades</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

"use client";
import React, { useState, useMemo } from 'react';
import { Edit2, Trash2, Plus, Download, ChevronUp, ChevronDown, Calendar, Tag, DollarSign, Percent, Settings } from 'lucide-react';
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
  const [sortField, setSortField] = useState<SortField>(() => {
    // Load sort field preference from localStorage on component mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tradeListSortField');
      if (saved && ['date', 'ticker', 'realized_pnl', 'percent_diff'].includes(saved)) {
        return saved as SortField;
      }
    }
    return 'date';
  });
  const [sortDirection, setSortDirection] = useState<SortDirection>(() => {
    // Load sort direction preference from localStorage on component mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tradeListSortDirection');
      if (saved && ['asc', 'desc'].includes(saved)) {
        return saved as SortDirection;
      }
    }
    return 'desc';
  });
  const [displayCount, setDisplayCount] = useState<number | 'all' | 'today'>(5);
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
    let newSortDirection: SortDirection;
    
    if (sortField === field) {
      newSortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      setSortField(field);
      newSortDirection = 'desc';
    }
    
    setSortDirection(newSortDirection);
    
    // Save preferences to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('tradeListSortField', field);
      localStorage.setItem('tradeListSortDirection', newSortDirection);
    }
  };

  const isToday = (dateString: string) => {
    const today = new Date();
    // Use local date instead of UTC to avoid timezone issues
    const todayString = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0');
    const isTodayResult = dateString === todayString;
    console.log('isToday check:', { dateString, todayString, isTodayResult });
    return isTodayResult;
  };

  const sortedTrades = useMemo(() => {
    // Filter trades if "today" is selected
    let filteredTrades = [...trades];
    if (displayCount === 'today') {
      filteredTrades = trades.filter(trade => isToday(trade.date));
    }
    
    // Sort the filtered trades
    return filteredTrades.sort((a, b) => {
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
  }, [trades, sortField, sortDirection, displayCount]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp className="h-3 w-3 opacity-30" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-3 w-3" /> : 
      <ChevronDown className="h-3 w-3" />;
  };

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

  const formatCurrency = (amount: number) => {
    return formatLargeNumber(amount);
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
    return pnl >= 0 ? 'text-emerald-600' : 'text-rose-600';
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
      'Realized P&L',
      '% Return',
      'Notes',
      'ID'
    ];

    const rows = [...trades]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((t) => [
        t.date,
        t.ticker,
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
      <div className="bg-white dark:bg-black rounded-lg shadow-sm px-3 py-3 pb-2 sm:px-4 sm:py-4 sm:pb-2 border border-gray-200 dark:border-gray-800/70">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Trade History</h3>
          <div className="flex items-center gap-2.5 sm:gap-2">
            <button
              onClick={exportToCsv}
              className="p-0.5 pr-1.5 rounded-lg transition-colors text-gray-400 hover:text-black dark:hover:text-white dark:text-white transition-all cursor-pointer"
              title="Export CSV"
            >
              <Download className='w-4 h-4 sm:w-4.5 sm:h-4.5 2xl:w-5 2xl:h-5' />
            </button>
            <button
              onClick={onAdd}
              className="p-0.5 pr-1.5 rounded-lg transition-colors text-gray-400 hover:text-black dark:hover:text-white dark:text-white transition-all cursor-pointer"
              title="Add Trade"
            >
              <Plus className='w-4 h-4 sm:w-4.5 sm:h-4.5 2xl:w-5 2xl:h-5' />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="sticky top-0 bg-white dark:bg-black select-none">
              <tr className="border-b border-gray-200 dark:border-gray-800/70">
                <th 
                  className="text-left py-3 pl-0 pr-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 transition-colors select-none w-1/5"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-gray-500 hidden sm:block" />
                    Date
                    {getSortIcon('date')}
                  </div>
                </th>
                <th 
                  className="text-left py-3 px-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 transition-colors select-none w-1/5"
                  onClick={() => handleSort('ticker')}
                >
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-3 w-3 text-gray-500 hidden sm:block" />
                    Name
                    {getSortIcon('ticker')}
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 transition-colors select-none w-1/5"
                  onClick={() => handleSort('realized_pnl')}
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    <DollarSign className="h-3 w-3 text-gray-500 hidden sm:block" />
                    P&L
                    {getSortIcon('realized_pnl')}
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 transition-colors select-none w-1/5"
                  onClick={() => handleSort('percent_diff')}
                >
                  <div className="flex items-center gap-1.5 justify-center">
                    <Percent className="h-3 w-3 text-gray-500 hidden sm:block" />
                    Return
                    {getSortIcon('percent_diff')}
                  </div>
                </th>
                <th className="text-right py-3 px-2 text-xs font-medium text-gray-700 dark:text-gray-300 select-none w-1/6">
                  <div className="flex items-center justify-end gap-1.5">
                    <Settings className="h-3 w-3 text-gray-500 hidden sm:block" />
                    Actions
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedTrades.length > 0 ? (
                (displayCount === 'today' ? sortedTrades : sortedTrades.slice(0, typeof displayCount === 'number' ? displayCount : sortedTrades.length)).map((trade) => (
                  <tr key={trade.id} className="border-b border-gray-200 dark:border-gray-900">
                    <td className="py-3 pl-0 pr-2 text-[10px] md:text-[11px] lg:text-xs text-gray-900 dark:text-gray-100">
                      <div className="overflow-x-auto scrollbar-hide">
                        <span className="whitespace-nowrap">{formatDate(trade.date)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="overflow-x-auto scrollbar-hide">
                        <span className="text-[10px] md:text-[11px] lg:text-xs font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">{trade.ticker}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-[10px] md:text-[11px] lg:text-xs font-medium text-center">
                      <span className={getPnlColor(trade.realized_pnl || 0)}>
                        {formatCurrency(trade.realized_pnl || 0)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-[10px] md:text-[11px] lg:text-xs font-medium text-center">
                      <span className={getPnlColor(trade.percent_diff || 0)}>
                        {formatPercent(trade.percent_diff || 0)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
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
                          className="p-0.5 text-gray-400 hover:text-rose-600 transition-colors"
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
                  <td colSpan={5} className="py-6 sm:py-8 px-3 sm:px-6 text-center text-xs text-gray-900 dark:text-gray-100">
                    No trades yet. Click the + button to add your first trade.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Trade Count Footer */}
        <div className="flex justify-end items-center mt-2" >
          {/* Trade Count */}
          <div className="flex items-center gap-1">
            <span className="text-[.6rem] text-gray-500 dark:text-gray-300">Showing</span>
            <div className="relative flex items-center">
              <select
                value={displayCount === 'today' ? 'today' : displayCount === 'all' ? 'all' : displayCount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'all') {
                    setDisplayCount('all');
                  } else if (value === 'today') {
                    setDisplayCount('today');
                  } else {
                    setDisplayCount(parseInt(value));
                  }
                }}
                className={`text-[.6rem] text-gray-500 dark:text-gray-300 bg-transparent border-none outline-none cursor-pointer hover:text-gray-600 dark:hover:text-gray-100 transition-colors appearance-none ${displayCount === 5 ? 'pr-0' : displayCount === 100 ? 'pr-3' : displayCount === "today" ? 'pr-3' : 'pr-2'}`}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="100">100</option>
                <option value="all">all</option>
                <option value="today">today</option>
              </select>
              <ChevronDown className="absolute right-0 h-2.5 w-2.5 text-gray-400 pointer-events-none" />
            </div>
            <span className="text-[.6rem] text-gray-500 dark:text-gray-300">trades</span>
          </div>
        </div>
      </div>
    </>
  );
}

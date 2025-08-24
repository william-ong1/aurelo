"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, ExternalLink, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import WatchlistModal from './WatchlistModal';
import { getApiUrl } from '../config/api';

interface WatchlistItem {
  id: number;
  ticker: string;
  notes?: string;
  chart_link?: string;
  created_at: string;
}

type SortField = 'ticker' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function WatchlistSection() {
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Load watchlist when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      loadWatchlist();
    } else {
      setWatchlist([]);
      setIsLoadingWatchlist(false);
    }
  }, [isAuthenticated, token]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedWatchlist = useMemo(() => {
    return [...watchlist].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'ticker':
          aValue = a.ticker.toLowerCase();
          bValue = b.ticker.toLowerCase();
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
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
  }, [watchlist, sortField, sortDirection]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp className="h-3 w-3 opacity-30" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-3 w-3" /> : 
      <ChevronDown className="h-3 w-3" />;
  };

  const loadWatchlist = async () => {
    if (!token) return;
    
    setIsLoadingWatchlist(true);
    try {
      const response = await fetch(getApiUrl('/api/watchlist'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWatchlist(data.watchlist || []);
      } else {
        console.error('Failed to load watchlist');
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
    } finally {
      setIsLoadingWatchlist(false);
    }
  };

  const handleSaveItem = async (itemData: { ticker: string; notes?: string; chart_link?: string }) => {
    if (!token) {
      alert('Please sign in to manage your watchlist');
      return;
    }
    
    setIsLoading(true);
    try {
      if (editingItem) {
        // Update existing item
        const response = await fetch(getApiUrl(`/api/watchlist/${editingItem.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(itemData)
        });
        
        if (response.ok) {
          await loadWatchlist();
        } else {
          alert('Failed to update watchlist item. Please try again.');
        }
      } else {
        // Create new item
        const response = await fetch(getApiUrl('/api/watchlist'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(itemData)
        });
        
        if (response.ok) {
          await loadWatchlist();
        } else {
          alert('Failed to add watchlist item. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error saving watchlist item:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
      closeModal();
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!isAuthenticated) {
      alert('Please sign in to delete watchlist items');
      return;
    }
    
    if (!token) return;
    
    if (!window.confirm('Confirm removal from watchlist?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(getApiUrl(`/api/watchlist/${itemId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        await loadWatchlist();
      } else {
        alert('Failed to remove watchlist item. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting watchlist item:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: WatchlistItem) => {
    if (!isAuthenticated) {
      alert('Please sign in to edit watchlist items');
      return;
    }
    setEditingItem(item);
    setShowModal(true);
  };

  const handleAdd = () => {
    if (!isAuthenticated) {
      alert('Please sign in to add watchlist items');
      return;
    }
    setEditingItem(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const getChartLink = (item: WatchlistItem) => {
    return item.chart_link || `https://www.tradingview.com/chart/${item.ticker}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      {/* Loading State for Authentication or Watchlist - Centered without background */}
      {(isAuthLoading || isLoadingWatchlist) && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-xs sm:text-sm 2xl:text-base text-gray-600 font-medium">
              {isAuthLoading ? 'Checking authentication...' : 'Loading watchlist...'}
            </p>
            <p className="text-[10px] sm:text-xs 2xl:text-sm text-gray-500 mt-1">
              {isAuthLoading ? 'Verifying your login status' : 'Retrieving your watchlist data'}
            </p>
          </div>
        </div>
      )}

      {/* Content - Only show after authentication and watchlist are loaded */}
      {!isAuthLoading && !isLoadingWatchlist && (
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] sm:text-xs 2xl:text-sm font-medium text-gray-600 uppercase tracking-wide">Watchlist</h3>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAdd}
              disabled={!isAuthenticated}
              className={`p-0.5 pr-1.5 rounded-md transition-colors text-gray-400 hover:text-gray-600 transition-all cursor-pointer ${
                !isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title={!isAuthenticated ? "Sign in to add items" : "Add to Watchlist"}
            >
              <Plus className='w-3 h-3 sm:w-4 sm:h-4 2xl:w-5 2xl:h-5' />
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white select-none">
              <tr className="border-b border-gray-200">
                <th 
                  className="text-left py-2 sm:py-2 pl-0 pr-2 sm:pr-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800 transition-colors select-none"
                  onClick={() => handleSort('ticker')}
                >
                  <div className="flex items-center gap-1">
                    Ticker
                    {getSortIcon('ticker')}
                  </div>
                </th>
                <th className="text-left py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-gray-600 select-none">Notes</th>
                <th className="text-center py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-gray-600 select-none">Chart</th>
                <th 
                  className="text-left py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800 transition-colors select-none"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Added
                    {getSortIcon('created_at')}
                  </div>
                </th>
                <th className="text-center py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-gray-600 select-none">Actions</th>
              </tr>
            </thead>
            <tbody>
              
              {sortedWatchlist.length > 0 ? (
                sortedWatchlist.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-2 sm:py-2 pl-0 pr-2 sm:pr-4 text-[10px] sm:text-xs 2xl:text-sm text-gray-900">
                      <span className="font-semibold">{item.ticker}</span>
                    </td>
                    <td className="py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm text-gray-600 max-w-xs">
                      <div className="break-words" title={item.notes || ''}>
                        {item.notes || '-'}
                      </div>
                    </td>
                    <td className="py-2 sm:py-2 px-2 sm:px-4 text-center">
                      <a
                        href={getChartLink(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-[10px] sm:text-xs 2xl:text-sm font-medium"
                      >
                        <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        View
                      </a>
                    </td>
                    <td className="py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm text-gray-500">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="py-2 sm:py-2 px-2 sm:px-4 text-center">
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-0.5 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit item"
                        >
                          <Edit2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-0.5 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete item"
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
                    No watchlist items yet. Click the + button to add your first item.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Watchlist Modal */}
      <WatchlistModal
        isOpen={showModal}
        onClose={closeModal}
        onSave={handleSaveItem}
        editingItem={editingItem}
        isLoading={isLoading}
      />

    </div>
  );
}

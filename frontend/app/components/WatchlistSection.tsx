"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, ExternalLink, Eye, ChevronUp, ChevronDown, Tag, Clock, StickyNote, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import WatchlistModal from './WatchlistModal';
import { getApiUrl } from '../config/api';

interface WatchlistItem {
  id: number;
  ticker: string;
  notes?: string;
  chart_link?: string;
  created_at: string;
  updated_at?: string;
}

type SortField = 'ticker' | 'updated_at';
type SortDirection = 'asc' | 'desc';

export default function WatchlistSection() {
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { showAuthModal } = useAuthModal();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true);
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isEditMode, setIsEditMode] = useState(false);

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
        case 'updated_at':
          // Use updated_at if available, otherwise fall back to created_at
          const aDate = a.updated_at || a.created_at;
          const bDate = b.updated_at || b.created_at;
          aValue = new Date(aDate).getTime();
          bValue = new Date(bDate).getTime();
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
        console.log('Failed to load watchlist');
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
    } finally {
      setIsLoadingWatchlist(false);
    }
  };

  const handleSaveItem = async (itemData: { ticker: string; notes?: string; chart_link?: string }) => {
    if (!token) {
      showAuthModal();
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
      showAuthModal();
      return;
    }
    
    if (!token) return;
    
    if (!window.confirm('Remove from watchlist?')) {
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
      showAuthModal();
      return;
    }
    setEditingItem(item);
    setShowModal(true);
  };

  const handleAdd = () => {
    if (!isAuthenticated) {
      showAuthModal();
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
            <p className="text-xs sm:text-sm 2xl:text-base text-black dark:text-white font-medium">
              {isAuthLoading ? 'Checking authentication...' : 'Loading watchlist...'}
            </p>
            {/* <p className="text-[12px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 mt-1">
              {isAuthLoading ? 'Verifying your login status' : 'Retrieving your watchlist'}
            </p> */}
          </div>
        </div>
      )}

      {/* Content - Only show after authentication and watchlist are loaded */}
      {!isAuthLoading && !isLoadingWatchlist && (
        <div className="pb-10 pt-16 md:py-10">
        <div className="bg-white dark:bg-black rounded-md shadow-sm px-3 py-3 pb-3 sm:px-4 sm:py-4 sm:pb-4 border border-gray-200 dark:border-gray-800/70">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Watchlist</h3>
          <div className="flex items-center gap-2.5 sm:gap-1">
            <button
              onClick={() => {if (watchlist.length > 0) {setIsEditMode(!isEditMode)}}}
              disabled={watchlist.length === 0}
              className={`p-1 sm:p-1.5 rounded-lg transition-all duration-200 ${
                watchlist.length === 0
                  ? 'text-gray-200 dark:text-gray-600 cursor-not-allowed'
                  : isEditMode && watchlist.length > 0
                  ? 'text-gray-900 dark:text-gray-100 bg-white dark:bg-black shadow-sm ring-1 ring-gray-300 cursor-pointer' 
                  : 'text-gray-400 hover:text-black dark:hover:text-white dark:text-white transition-all cursor-pointer'
              }`}
              title={watchlist.length === 0 ? "No items to edit" : isEditMode && watchlist.length > 0 ? "Exit Edit Mode" : "Edit Watchlist"}
            >
              <Edit2 className='w-3.5 h-3.5 2xl:w-5 2xl:h-5' />
            </button>
            <button
              onClick={handleAdd}
              disabled={isEditMode && watchlist.length > 0}
              className={`p-1 sm:p-1.5 rounded-lg transition-colors ${
                isEditMode && watchlist.length > 0
                  ? 'text-gray-200 dark:text-gray-600 cursor-not-allowed' 
                  : 'text-gray-400 hover:text-black dark:hover:text-white dark:text-white transition-all cursor-pointer'
              }`}
              title={isEditMode && watchlist.length > 0 ? "Exit edit mode to add items" : "Add to Watchlist"}
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
                      className="text-left py-3 pl-0 pr-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 transition-colors select-none w-1/4"
                      onClick={() => handleSort('ticker')}
                    >
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3 w-3 text-gray-500 hidden sm:block" />
                        Ticker
                        {getSortIcon('ticker')}
                      </div>
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-gray-700 dark:text-gray-300 select-none w-1/4">
                      <div className="flex items-center gap-1.5">
                        <StickyNote className="h-3 w-3 text-gray-500 hidden sm:block" />
                        Notes
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 text-xs font-medium text-gray-700 dark:text-gray-300 select-none w-1/4">
                      <div className="flex items-center justify-center gap-1.5">
                        <ExternalLink className="h-3 w-3 text-gray-500 hidden sm:block" />
                        Chart
                      </div>
                    </th>
                    <th 
                      className="text-right py-3 px-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 transition-colors select-none w-1/4"
                      onClick={() => !isEditMode && handleSort('updated_at')}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        {isEditMode ? (
                          <>
                            <Settings className="h-3 w-3 text-gray-500 hidden sm:block" />
                            Actions
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 text-gray-500 hidden sm:block" />
                            <span className="whitespace-nowrap"> Modified</span>
                            {getSortIcon('updated_at')}
                          </>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
            <tbody>
              
              {sortedWatchlist.length > 0 ? (
                sortedWatchlist.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 dark:border-gray-900">
                    <td className="py-3 pl-0 pr-2 text-[11px] md:text-[12px] lg:text-xs text-gray-900 dark:text-gray-100 w-1/4">
                      <span className="font-medium whitespace-nowrap">{item.ticker}</span>
                    </td>
                    <td className="py-3 px-2 text-[11px] md:text-[12px] lg:text-xs text-black dark:text-white w-1/2">
                      <div className="break-words whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto" title={item.notes || ''}>
                        {item.notes || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center w-1/4">
                      <a
                        href={getChartLink(item)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-[11px] md:text-[12px] lg:text-xs font-medium"
                      >
                        <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        View
                      </a>
                    </td>
                    <td className="py-3 px-2 text-[11px] md:text-[12px] lg:text-xs text-gray-900 dark:text-gray-100 w-1/4 text-right">
                      {!isEditMode ? (
                        formatDate(item.updated_at || item.created_at)
                      ) : (
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-0.5 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit item"
                          >
                            <Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-0.5 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete item"
                          >
                            <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="pt-5 pb-2 px-3 sm:px-6 text-center text-xs text-gray-900 dark:text-gray-100">
                    No items in your watchlist.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

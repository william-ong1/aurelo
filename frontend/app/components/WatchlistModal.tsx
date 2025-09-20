"use client";
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { disableBodyScroll, enableBodyScroll } from '../utils/scrollLock';

interface WatchlistItem {
  id: number;
  ticker: string;
  notes?: string;
  chart_link?: string;
  created_at: string;
}

interface WatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { ticker: string; notes?: string; chart_link?: string }) => void;
  editingItem: WatchlistItem | null;
  isLoading?: boolean;
}

export default function WatchlistModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingItem, 
  isLoading = false 
}: WatchlistModalProps) {
  const [formData, setFormData] = useState({
    ticker: '',
    notes: '',
    chart_link: ''
  });

  // Reset form when editing item changes
  useEffect(() => {
    if (editingItem) {
      setFormData({
        ticker: editingItem.ticker,
        notes: editingItem.notes || '',
        chart_link: editingItem.chart_link || ''
      });
    } else {
      setFormData({
        ticker: '',
        notes: '',
        chart_link: ''
      });
    }
  }, [editingItem]);

  // Clear form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        ticker: '',
        notes: '',
        chart_link: ''
      });
    }
  }, [isOpen]);

  // Handle body scroll locking
  useEffect(() => {
    if (isOpen) {
      disableBodyScroll();
    } else {
      enableBodyScroll();
    }

    // Cleanup on unmount
    return () => {
      enableBodyScroll();
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.ticker.trim()) {
      alert('Please enter a ticker symbol');
      return;
    }

    // Convert ticker to uppercase and remove spaces
    const cleanTicker = formData.ticker.trim().toUpperCase().replace(/\s+/g, '');
    
    onSave({
      ticker: cleanTicker,
      notes: formData.notes.trim() || "",
      chart_link: formData.chart_link.trim() || ""
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-all p-3 sm:p-4">
      <div className="bg-white dark:bg-black backdrop-blur-sm rounded-lg shadow-2xl p-3 sm:p-6 w-full max-w-sm mx-auto border border-gray-200 dark:border-gray-800/70 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-lg 2xl:text-lg font-medium text-black dark:text-white">
            {editingItem ? 'Edit Watchlist Item' : 'Add to Watchlist'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Ticker Symbol */}
          <div>
            <label htmlFor="ticker" className="block text-[12px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white mb-1">
              Ticker Symbol *
            </label>
            <input
              type="text"
              id="ticker"
              name="ticker"
              value={formData.ticker}
              onChange={(e) => {
                const { name, value } = e.target;
                setFormData(prev => ({
                  ...prev,
                  [name]: value.toUpperCase()
                }));
              }}
              disabled={isLoading}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-800/70 rounded-lg focus:outline-none focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white hover:border-black dark:hover:border-white transition-all text-sm bg-white dark:bg-black text-black dark:text-white"
              placeholder="e.g., AAPL"
              maxLength={10}
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-[12px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white mb-1">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              disabled={isLoading}
              rows={3}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-800/70 rounded-lg focus:outline-none focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white hover:border-black dark:hover:border-white transition-all text-xs resize-none bg-white dark:bg-black text-black dark:text-white"
              placeholder="e.g. Technical analysis, support/resistance levels, entry/exit points ..."
              maxLength={500}
            />
            <p className="text-[10px] sm:text-[11px] 2xl:text-sm text-gray-900 dark:text-gray-400">
              {formData.notes.length}/500 characters
            </p>
          </div>

          {/* Chart Link */}
          <div>
            <label htmlFor="chart_link" className="block text-[12px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white mb-1">
              Custom Chart Link (Optional)
            </label>
            <input
              type="url"
              id="chart_link"
              name="chart_link"
              value={formData.chart_link}
              onChange={handleInputChange}
              disabled={isLoading}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-800/70 rounded-lg focus:outline-none focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white hover:border-black dark:hover:border-white transition-all text-xs bg-white dark:bg-black text-black dark:text-white"
              placeholder="https://www.tradingview.com/chart/..."
            />
            <p className="text-[10px] sm:text-[11px] 2xl:text-sm text-gray-900 dark:text-gray-400 mt-1">
              Leave empty to use default TradingView chart
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex flex-row gap-2 sm:gap-3 pt-2 sm:pt-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-2 sm:px-3 py-1.5 border border-gray-300 dark:border-gray-800/70 text-black dark:text-white rounded-lg hover:bg-gray-100 dark:bg-black dark:hover:bg-gray-900 font-medium transition-colors cursor-pointer text-[10px] sm:text-[12px] 2xl:text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.ticker.trim()}
              className="flex-1 px-2 sm:px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer text-[10px] sm:text-[12px] 2xl:text-sm"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span className="text-[12px] sm:text-xs 2xl:text-sm">{editingItem ? 'Updating...' : 'Adding...'}</span>
                </div>
              ) : (
                editingItem ? 'Update Item' : 'Add to Watchlist'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

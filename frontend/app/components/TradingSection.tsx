"use client";
import React, { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import TradeList from './TradeList';
import TradeAnalytics from './TradeAnalytics';
import TradeModal from './TradeModal';
import { getApiUrl } from '../config/api';

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

interface ParsedTrade {
  date: string;
  ticker: string;
  realized_pnl?: number;
  percent_diff?: number;
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

export default function TradingSection() {
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { showAuthModal } = useAuthModal();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [analytics, setAnalytics] = useState<TradeAnalytics>({
    total_trades: 0,
    winning_trades: 0,
    losing_trades: 0,
    success_rate: 0,
    total_pnl: 0,
    average_pnl: 0,
    monthly_performance: {}
  });
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTrades, setIsLoadingTrades] = useState(true);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [tradesLoaded, setTradesLoaded] = useState(false);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  // Load trades and analytics when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      loadTrades();
      loadAnalytics();
    } else {
      setTrades([]);
      setAnalytics({
        total_trades: 0,
        winning_trades: 0,
        losing_trades: 0,
        success_rate: 0,
        total_pnl: 0,
        average_pnl: 0,
        monthly_performance: {}
      });
      setIsLoadingTrades(false);
      setTradesLoaded(false);
      setAnalyticsLoaded(false);
    }
  }, [isAuthenticated, token]);

  // Check if both trades and analytics are loaded, then add small delay for calculations
  useEffect(() => {
    if (tradesLoaded && analyticsLoaded) {
      const timer = setTimeout(() => {
        setIsLoadingTrades(false);
      }, 50); // Small delay to ensure all calculations are complete
      return () => clearTimeout(timer);
    }
  }, [tradesLoaded, analyticsLoaded]);

  const loadTrades = async () => {
    if (!token) return;
    
    setIsLoadingTrades(true);
    setTradesLoaded(false);
    console.log('Loading trades...');
    try {
      const response = await fetch(getApiUrl('/api/trades'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Load trades response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded trades data:', data);
        setTrades(data.trades || []);
      } else {
        const errorText = await response.text();
        console.error('Failed to load trades:', errorText);
      }
    } catch (error) {
      console.error('Error loading trades:', error);
    } finally {
      setTradesLoaded(true);
    }
  };

  const loadAnalytics = async () => {
    if (!token) return;
    
    setAnalyticsLoaded(false);
    try {
      const response = await fetch(getApiUrl('/api/trades/analytics'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setAnalyticsLoaded(true);
    }
  };

  const handleSaveTrade = async (tradeData: { date: string; ticker: string; realized_pnl?: number; percent_diff?: number }) => {
    console.log('Token available:', !!token);
    console.log('User authenticated:', isAuthenticated);
    if (!token) {
      console.error('No token available');
      showAuthModal();
      return;
    }
    
    // Convert to full Trade structure
    const fullTradeData = {
      ...tradeData,
      trade_type: 'sell' as const,
      shares: 0, // Default values for required fields
      price: 0
    };
    console.log('Saving trade data:', fullTradeData);
    setIsLoading(true);
    try {
      if (editingTrade) {
        // Update existing trade
        console.log('Updating existing trade:', editingTrade.id);
        const response = await fetch(getApiUrl(`/api/trades/${editingTrade.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(fullTradeData)
        });
        
        console.log('Update response status:', response.status);
        if (response.ok) {
          console.log('Trade updated successfully');
          await loadTrades();
          await loadAnalytics();
        } else {
          const errorText = await response.text();
          console.error('Update failed:', errorText);
          alert('Failed to update trade. Please try again.');
        }
      } else {
        // Create new trade
        console.log('Creating new trade');
        console.log('Request headers:', {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.substring(0, 20)}...`
        });
        
        // Show duplicate checking animation
        setIsCheckingDuplicates(true);
        
        const response = await fetch(getApiUrl('/api/trades'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(fullTradeData)
        });
        
        console.log('Create response status:', response.status);
        if (response.ok) {
          const result = await response.json();
          if (result.is_duplicate) {
            console.log('Duplicate trade detected - using existing trade');
            alert('This trade already exists and was not added.');
          } else {
            console.log('Trade created successfully');
          }
          await loadTrades();
          await loadAnalytics();
        } else {
          const errorText = await response.text();
          console.error('Create failed:', errorText);
          if (response.status === 500) {
            alert('Database error. Please make sure the trades table is created in your Supabase database. Check the SETUP_SUPABASE.md file for instructions.');
          } else {
            alert('Failed to create trade. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('Error saving trade:', error);
      alert('Failed to save trade. Please try again.');
    } finally {
      setIsLoading(false);
      setIsCheckingDuplicates(false);
    }
  };

  const handleAddParsedTrades = async (parsedTrades: ParsedTrade[]) => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      let addedCount = 0;
      let skippedCount = 0;
      
      // Add all parsed trades
      for (const parsedTrade of parsedTrades) {
        // Show duplicate checking animation for each trade
        setIsCheckingDuplicates(true);
        
        // Convert ParsedTrade to full Trade structure
        const tradeData = {
          ...parsedTrade,
          trade_type: 'sell' as const,
          shares: 0, // Default values for required fields
          price: 0,
          is_image_upload: true // Mark as image upload for duplicate checking
        };
        console.log('Sending trade data:', tradeData);
        const response = await fetch(getApiUrl('/api/trades'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(tradeData)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Response for trade:', result);
          // Check if this was a duplicate
          if (result.is_duplicate) {
            console.log('Trade marked as duplicate');
            skippedCount++;
          } else {
            console.log('Trade added successfully');
            addedCount++;
          }
        } else {
          console.error('Failed to add trade:', await response.text());
        }
        
        // Hide duplicate checking animation after each trade
        setIsCheckingDuplicates(false);
      }
      
      await loadTrades();
      await loadAnalytics();
      
      // Show feedback to user
      if (skippedCount > 0) {
        alert(`Added ${addedCount} new trades. Skipped ${skippedCount} duplicate trades.`);
      } else {
        alert(`Successfully added ${addedCount} trades.`);
      }
    } catch (error) {
      console.error('Error adding parsed trades:', error);
      alert('Failed to add some trades. Please try again.');
    } finally {
      setIsLoading(false);
      setIsCheckingDuplicates(false);
    }
  };

  const handleEditTrade = (trade: Trade) => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    setEditingTrade(trade);
    setShowTradeModal(true);
  };

  const handleDeleteTrade = async (tradeId: number) => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    if (!token) return;
    
    try {
      const response = await fetch(getApiUrl(`/api/trades/${tradeId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        await loadTrades();
        await loadAnalytics();
      }
    } catch (error) {
      console.error('Error deleting trade:', error);
      alert('Failed to delete trade. Please try again.');
    }
  };

  const handleAddTrade = () => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    setEditingTrade(null);
    setShowTradeModal(true);
  };

  const closeTradeModal = () => {
    setShowTradeModal(false);
    setEditingTrade(null);
  };

  // if (!isAuthenticated) {
  //   return (
  //     <div className="bg-white dark:bg-black rounded-lg p-8 shadow-sm border border-gray-200 dark:border-gray-800/70 text-center">
  //       <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
  //         <BarChart3 className="h-8 w-8 text-gray-400" />
  //       </div>
  //       <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Sign in to track trades</h3>
  //       <p className="text-black dark:text-white">
  //         Create an account or sign in to start tracking your trading performance and view detailed analytics.
  //       </p>
  //     </div>
  //   );
  // }

  return (
    <div>
      {/* Loading State for Authentication or Trades - Centered without background */}
      {(isAuthLoading || isLoadingTrades) && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-xs sm:text-sm 2xl:text-base text-black dark:text-white font-medium">
              {isAuthLoading ? 'Checking authentication...' : 'Loading trades...'}
            </p>
            <p className="text-[12px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 mt-1">
              {isAuthLoading ? 'Verifying your login status' : 'Retrieving your trading data'}
            </p>
          </div>
        </div>
      )}

      {/* Duplicate Check Loading State */}
      {isCheckingDuplicates && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-black backdrop-blur-sm rounded-lg shadow-2xl p-6 w-full max-w-sm mx-auto border border-gray-200 dark:border-gray-800/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm 2xl:text-base text-black dark:text-white font-medium">
                Checking for duplicates...
              </p>
              <p className="text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 mt-1">
                Verifying this trade doesn't already exist
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content - Only show after authentication and trades are loaded */}
      {!isAuthLoading && !isLoadingTrades && (
        <div className="py-8">
          {/* Header */}
          {/* <div className="flex flex-row justify-between items-center gap-4 mb-0">
            <div className="flex items-center gap-3">
              <h2 className="text-base text-lg 2xl:text-2xl font-medium text-gray-800">Trading Dashboard</h2>
            </div>
          </div>

          <p className="text-xs 2xl:text-sm -mt-0 text-black dark:text-white mb-6">Track your trades and analyze trading performance over time</p> */}

          {/* Trade List Content */}
          {/* <div className="pt-1 mb-4">
            <TradeList
              trades={trades}
              onEdit={handleEditTrade}
              onDelete={handleDeleteTrade}
              onAdd={handleAddTrade}
            />
          </div> */}

          {/* Analytics Content */}
          <div className="pt-1 mb-4">
            <TradeAnalytics trades={trades} analytics={analytics} />
          </div>

          <TradeList
            trades={trades}
            onEdit={handleEditTrade}
            onDelete={handleDeleteTrade}
            onAdd={handleAddTrade}
          />
        </div>
      )}

      {/* Trade Modal */}
      <TradeModal
        isOpen={showTradeModal}
        onClose={closeTradeModal}
        onSave={handleSaveTrade}
        editingTrade={editingTrade}
        onAddParsedTrades={handleAddParsedTrades}
      />
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { useRealTime } from '../contexts/RealTimeContext';

interface Asset {
  id: number;
  name: string;
  isStock: boolean;
  ticker?: string;
  shares?: number;
  currentPrice?: number;
  purchasePrice?: number;
  balance?: number;
  apy?: number;
}

interface RealTimePrices {
  [ticker: string]: number;
}

interface PortfolioValue {
  totalValue: number;
  stockValue: number;
  cashValue: number;
  previousStockValue: number;
  change: number;
  changePercent: number;
}

interface RealTimePortfolioProps {
  assets: Asset[];
}

export default function RealTimePortfolio({ assets }: RealTimePortfolioProps) {
  const { realTimePrices, lastUpdated, isLoading, error, fetchPrices } = useRealTime();
  const [portfolioValue, setPortfolioValue] = useState<PortfolioValue | null>(null);

  // Get stock tickers from assets
  const getStockTickers = useCallback(() => {
    return assets
      .filter(asset => asset.isStock && asset.ticker)
      .map(asset => asset.ticker!)
      .filter((ticker, index, arr) => arr.indexOf(ticker) === index); // Remove duplicates
  }, [assets]);

  // Calculate portfolio value with real-time prices
  const calculatePortfolioValue = useCallback((prices: RealTimePrices): PortfolioValue => {
    const stockAssets = assets.filter(asset => asset.isStock);
    const cashAssets = assets.filter(asset => !asset.isStock);
    
    // Calculate stock value with real-time prices
    const stockValue = stockAssets.reduce((total, asset) => {
      if (asset.ticker && prices[asset.ticker] && asset.shares) {
        return total + (asset.shares * prices[asset.ticker]);
      }
      // Fallback to stored price if real-time price not available
      return total + (asset.shares || 0) * (asset.currentPrice || 0);
    }, 0);
    
    // Calculate cash value
    const cashValue = cashAssets.reduce((total, asset) => total + (asset.balance || 0), 0);
    
    const totalValue = stockValue + cashValue;
    
    // Calculate previous stock value (using stored prices)
    const previousStockValue = stockAssets.reduce((total, asset) => 
      total + (asset.shares || 0) * (asset.currentPrice || 0), 0
    );
    
    const change = stockValue - previousStockValue;
    const changePercent = previousStockValue > 0 ? (change / previousStockValue) * 100 : 0;
    
    return {
      totalValue,
      stockValue,
      cashValue,
      previousStockValue,
      change,
      changePercent
    };
  }, [assets]);

  // Fetch real-time prices
  const fetchRealTimePrices = useCallback(async (forceRefresh = false) => {
    const tickers = getStockTickers();
    if (tickers.length === 0) {
      setPortfolioValue(calculatePortfolioValue({}));
      return;
    }

    await fetchPrices(tickers, forceRefresh);
  }, [getStockTickers, calculatePortfolioValue, fetchPrices]);

  // Initial load and auto-refresh
  useEffect(() => {
    fetchRealTimePrices();
    
    // Set up auto-refresh every 5 minutes
    const interval = setInterval(() => {
      fetchRealTimePrices();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchRealTimePrices]);

  // Update portfolio value when assets or real-time prices change
  useEffect(() => {
    if (realTimePrices && Object.keys(realTimePrices).length > 0) {
      setPortfolioValue(calculatePortfolioValue(realTimePrices));
    } else {
      // Calculate with stored prices if no real-time data
      setPortfolioValue(calculatePortfolioValue({}));
    }
  }, [assets, realTimePrices, calculatePortfolioValue]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date);
  };

  if (!portfolioValue) {
    return (
      <div className="mt-6 sm:mt-8 rounded-lg p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 shadow-lg">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-black dark:text-white">Loading portfolio data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 sm:mt-8 rounded-lg p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-medium text-gray-800 dark:text-gray-200">Real-Time Portfolio</h2>
        <button
          onClick={() => fetchRealTimePrices(true)}
          disabled={isLoading}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all ${
            isLoading
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
          }`}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          <span className="text-sm font-medium">
            {isLoading ? 'Updating...' : 'Refresh'}
          </span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-gray-800/70 rounded-lg">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Portfolio Value */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-800/70">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-black dark:text-white uppercase tracking-wide">Total Value</h3>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(portfolioValue.totalValue)}
            </div>
            <div className="flex items-center gap-2">
              {portfolioValue.change >= 0 ? (
                <TrendingUp size={16} className="text-green-500" />
              ) : (
                <TrendingDown size={16} className="text-red-500" />
              )}
              <span className={`text-sm font-medium ${
                portfolioValue.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(portfolioValue.change)} ({formatPercent(portfolioValue.changePercent)})
              </span>
            </div>
          </div>
        </div>

        {/* Stock Value */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-800/70">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-black dark:text-white uppercase tracking-wide">Stock Value</h3>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="text-lg sm:text-xl font-medium text-gray-900 dark:text-gray-100">
              {formatCurrency(portfolioValue.stockValue)}
            </div>
            <div className="text-sm text-black dark:text-white">
              {assets.filter(a => a.isStock).length} positions
            </div>
          </div>
        </div>

        {/* Cash Value */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-800/70">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-black dark:text-white uppercase tracking-wide">Cash Value</h3>
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="text-lg sm:text-xl font-medium text-gray-900 dark:text-gray-100">
              {formatCurrency(portfolioValue.cashValue)}
            </div>
            <div className="text-sm text-black dark:text-white">
              {assets.filter(a => !a.isStock).length} accounts
            </div>
          </div>
        </div>

        {/* Allocation */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-5 shadow-sm border border-gray-100 dark:border-gray-800/70">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-black dark:text-white uppercase tracking-wide">Allocation</h3>
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-black dark:text-white">Stocks</span>
              <span className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">
                {portfolioValue.totalValue > 0 ? ((portfolioValue.stockValue / portfolioValue.totalValue) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-black dark:text-white">Cash</span>
              <span className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">
                {portfolioValue.totalValue > 0 ? ((portfolioValue.cashValue / portfolioValue.totalValue) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="mt-4 sm:mt-6 flex items-center justify-center sm:justify-end gap-2 text-sm text-gray-900 dark:text-gray-100">
          <Clock size={14} />
          <span>Last updated: {formatTime(lastUpdated)}</span>
        </div>
      )}
    </div>
  );
}

import React from 'react';
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

interface PositionAnalyticsProps {
  assets: Asset[];
  isLoadingAssets?: boolean;
}

export default function PositionAnalytics({ assets, isLoadingAssets = false }: PositionAnalyticsProps) {
  const { realTimePrices, isLoading, failedTickers } = useRealTime();
  
  // Check if we have real-time prices for all valid stock assets (exclude invalid tickers)
  const stockAssets = assets.filter(asset => asset.isStock);
  const validStockAssetsWithTickers = stockAssets.filter(asset => 
    asset.ticker && !failedTickers.includes(asset.ticker)
  );
  const hasAllPrices = validStockAssetsWithTickers.length === 0 || validStockAssetsWithTickers.every(asset => realTimePrices[asset.ticker!]);
  const isInitialLoading = isLoading || !hasAllPrices;
  
  const cashAssets = assets.filter(asset => !asset.isStock);
  
  // Use real-time prices for stock values
  const totalStockValue = stockAssets.reduce((total, asset) => {
    if (asset.ticker && realTimePrices[asset.ticker] && asset.shares) {
      return total + (asset.shares * realTimePrices[asset.ticker]);
    }
    // Fallback to stored price
    return total + ((asset.shares || 0) * (asset.currentPrice || 0));
  }, 0);
  
  const totalCashValue = cashAssets.reduce((total, asset) => total + (asset.balance || 0), 0);
  const totalPortfolioValue = totalStockValue + totalCashValue;
  
  const cashAllocation = totalPortfolioValue > 0 ? (totalCashValue / totalPortfolioValue) * 100 : 0;
  const stockAllocation = totalPortfolioValue > 0 ? (totalStockValue / totalPortfolioValue) * 100 : 0;
  
  const weightedAPY = cashAssets.length > 0 && totalCashValue > 0 
    ? cashAssets.reduce((total, asset) => total + ((asset.apy || 0) * (asset.balance || 0)), 0) / totalCashValue 
    : 0;
  
  const monthlyInterest = totalCashValue * (weightedAPY / 12);
  const annualInterest = totalCashValue * weightedAPY;

  // Show loading state while fetching initial prices or retrieving assets
  if ((isInitialLoading && validStockAssetsWithTickers.length > 0) || isLoadingAssets) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 sm:mb-8">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-800">Portfolio Analytics</h2>
          <div className="text-xs sm:text-sm text-gray-500 font-medium">
            Loading...
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Loading cards */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="w-24 h-3 bg-gray-200 rounded"></div>
                <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
              </div>
              <div className="space-y-2">
                <div className="w-20 h-6 bg-gray-200 rounded"></div>
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-4 sm:p-8">
      <div className="flex flex-row items-center justify-between gap-2 mb-4 sm:mb-8">
        <h2 className="text-base sm:text-xl lg:text-2xl font-semibold text-gray-800">Portfolio Analytics</h2>
        <div className="text-xs sm:text-sm text-gray-500 font-medium">
          Total Value: ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

        {/* Total Value */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Total Value</h3>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-base sm:text-2xl font-bold text-gray-900">
                ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Portfolio Value</div>
            </div>
            <div className="flex gap-4">
              <div>
                <div className="text-sm sm:text-lg font-semibold text-gray-900">${totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                <div className="text-xs sm:text-sm text-gray-600">Stocks</div>
              </div>
              <div>
                <div className="text-sm sm:text-lg font-semibold text-gray-900">${totalCashValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                <div className="text-xs sm:text-sm text-gray-600">Cash</div>
              </div>
            </div>
          </div>
        </div>

        {/* Cash Interest */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Cash Interest</h3>
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-base sm:text-2xl font-bold text-gray-900">
                {(weightedAPY * 100).toFixed(2)}%
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Weighted APY</div>
            </div>
            <div className="flex gap-4">
              <div>
                <div className="text-sm sm:text-lg font-semibold text-gray-900">${monthlyInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-xs sm:text-sm text-gray-600">Monthly</div>
              </div>
              <div>
                <div className="text-sm sm:text-lg font-semibold text-gray-900">${annualInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-xs sm:text-sm text-gray-600">Annual</div>
              </div>
            </div>
          </div>
        </div>

        {/* Asset Count */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Assets</h3>
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-base sm:text-2xl font-bold text-gray-900">
                {assets.length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Total Assets</div>
            </div>
            <div className="flex gap-4">
              <div>
                <div className="text-sm sm:text-lg font-semibold text-gray-900">{stockAssets.length}</div>
                <div className="text-xs sm:text-sm text-gray-600">Stocks</div>
              </div>
              <div>
                <div className="text-sm sm:text-lg font-semibold text-gray-900">{cashAssets.length}</div>
                <div className="text-xs sm:text-sm text-gray-600">Cash</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Portfolio Breakdown */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Breakdown</h3>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-base sm:text-2xl font-bold text-gray-900">
                {stockAllocation.toFixed(1)}%
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Stocks & ETFs</div>
            </div>
            <div>
              <div className="text-base sm:text-2xl font-bold text-gray-900">
                {cashAllocation.toFixed(1)}%
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Cash</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { useRealTime } from '../contexts/RealTimeContext';

interface Asset {
  id: number;
  name: string;
  isStock: boolean;
  ticker?: string;
  shares?: number;
  currentPrice?: number;
  balance?: number;
  apy?: number;
}

interface PositionAnalyticsProps {
  assets: Asset[];
}

export default function PositionAnalytics({ assets }: PositionAnalyticsProps) {
  const { realTimePrices, isLoading } = useRealTime();
  
  // Check if we have real-time prices for all stock assets
  const stockAssets = assets.filter(asset => asset.isStock);
  const stockAssetsWithTickers = stockAssets.filter(asset => asset.ticker);
  const hasAllPrices = stockAssetsWithTickers.length === 0 || stockAssetsWithTickers.every(asset => realTimePrices[asset.ticker!]);
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

  // Show loading state while fetching initial prices
  if (isInitialLoading && stockAssetsWithTickers.length > 0) {
    return (
      <div className="mt-8 rounded-xl p-6 bg-gradient-to-br from-slate-50 to-slate-100 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Portfolio Analytics</h2>
          <div className="text-sm text-gray-500 font-medium">
            Loading...
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
    <div className="mt-8 rounded-xl p-6 bg-gradient-to-br from-slate-50 to-slate-100 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Portfolio Analytics</h2>
        <div className="text-sm text-gray-500 font-medium">
          Total Value: ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Portfolio Breakdown */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Breakdown</h3>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Stocks ({stockAssets.length})</span>
              <span className="text-lg font-semibold text-gray-900">
                ${totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cash ({cashAssets.length})</span>
              <span className="text-lg font-semibold text-gray-900">
                ${totalCashValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Allocation */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Allocation</h3>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Stocks</span>
              <span className="text-lg font-semibold text-gray-900">{stockAllocation.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cash</span>
              <span className="text-lg font-semibold text-gray-900">{cashAllocation.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Cash Interest */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Income</h3>
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Monthly</span>
              <span className="text-lg font-semibold text-gray-900">
                ${monthlyInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Annual</span>
              <span className="text-lg font-semibold text-gray-900">
                ${annualInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Cash Summary */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Cash</h3>
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Available</span>
              <span className="text-lg font-semibold text-gray-900">
                ${totalCashValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">APY</span>
              <span className="text-lg font-semibold text-gray-900">
                {(weightedAPY * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
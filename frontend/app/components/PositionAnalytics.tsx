import React from 'react';

export default function PositionAnalytics({ assets }) {
  // Calculate portfolio metrics
  const stockAssets = assets.filter(asset => asset.isStock);
  const cashAssets = assets.filter(asset => !asset.isStock);
  
  const totalStockValue = stockAssets.reduce((total, asset) => total + (asset.shares * asset.currentPrice), 0);
  const totalCashValue = cashAssets.reduce((total, asset) => total + asset.balance, 0);
  const totalPortfolioValue = totalStockValue + totalCashValue;
  
  const cashAllocation = totalPortfolioValue > 0 ? (totalCashValue / totalPortfolioValue) * 100 : 0;
  const stockAllocation = totalPortfolioValue > 0 ? (totalStockValue / totalPortfolioValue) * 100 : 0;
  
  const weightedAPY = cashAssets.length > 0 && totalCashValue > 0 
    ? cashAssets.reduce((total, asset) => total + (asset.apy * asset.balance), 0) / totalCashValue 
    : 0;
  
  const monthlyInterest = totalCashValue * (weightedAPY / 12);
  const annualInterest = totalCashValue * weightedAPY;

  return (
    <div className="mt-8 rounded-xl p-6 bg-gradient-to-br from-slate-50 to-slate-100 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Portfolio Analytics</h2>
        <div className="text-sm text-gray-500 font-medium">
          Total Value: ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Asset Distribution */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Asset Distribution</h3>
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Stocks</span>
              <span className="text-lg font-semibold text-gray-900">{stockAssets.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cash</span>
              <span className="text-lg font-semibold text-gray-900">{cashAssets.length}</span>
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
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Cash Flow</h3>
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
            <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">Cash Summary</h3>
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
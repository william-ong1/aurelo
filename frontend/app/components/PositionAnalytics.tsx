import React from 'react';

export default function PositionAnalytics({ assets }) {
  return (
    <div className="mt-8 rounded-lg p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl shadow-lg">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Portfolio Analytics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {assets.filter(asset => asset.isStock).length} / {assets.filter(asset => !asset.isStock).length}
          </div>
          <div className="text-sm text-gray-600">Stock / Cash Positions</div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {(() => {
              const cashValue = assets.filter(asset => !asset.isStock).reduce((total, asset) => total + asset.balance, 0);
              const totalValue = assets.reduce((total, asset) => total + (asset.isStock ? asset.shares * asset.currentPrice : asset.balance), 0);
              return (cashValue / totalValue * 100).toFixed(1);
            })()}%
          </div>
          <div className="text-sm text-gray-600">Cash Allocation</div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-orange-600">
            ${(() => {
              const cashAccounts = assets.filter(asset => !asset.isStock);
              const totalCash = cashAccounts.reduce((total, asset) => total + asset.balance, 0);
              if (cashAccounts.length === 0) return '0.00';
              const weightedAPY = cashAccounts.reduce((total, asset) => total + (asset.apy * asset.balance), 0) / totalCash;
              const monthlyInterest = totalCash * (weightedAPY / 12);
              return monthlyInterest.toFixed(2);
            })()}
          </div>
          <div className="text-sm text-gray-600">Monthly Interest</div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-2xl font-bold text-purple-600">
            ${assets.filter(asset => !asset.isStock).reduce((total, asset) => total + asset.balance, 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">
            Available Cash • {(() => {
              const cashAccounts = assets.filter(asset => !asset.isStock);
              if (cashAccounts.length === 0) return '0.00% APY';
              const totalBalance = cashAccounts.reduce((total, asset) => total + asset.balance, 0);
              const weightedAPY = cashAccounts.reduce((total, asset) => total + (asset.apy * asset.balance), 0) / totalBalance;

              return `${(weightedAPY * 100).toFixed(2)}% APY`;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
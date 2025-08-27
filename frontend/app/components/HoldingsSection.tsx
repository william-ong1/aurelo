import React from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign, Percent } from 'lucide-react';
import { Edit2, Trash2, RefreshCw, Clock, Plus } from 'lucide-react';
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

interface HoldingsSectionProps {
  assets: Asset[];
  isLoadingAssets?: boolean;
  isEditMode?: boolean;
  onEdit?: (asset: Asset) => void;
  onDelete?: (assetId: number) => void;
  onToggleEditMode?: () => void;
  onAddAsset?: () => void;
}

export default function HoldingsSection({ 
  assets, 
  isLoadingAssets = false, 
  isEditMode = false,
  onEdit,
  onDelete,
  onToggleEditMode,
  onAddAsset
}: HoldingsSectionProps) {
  const { realTimePrices, isLoading, failedTickers } = useRealTime();

  // Get colors from pie chart
  const getPieChartColor = (index: number) => {
    if (typeof window !== 'undefined' && (window as any).pieChartColors) {
      return (window as any).pieChartColors[index] || '#3B82F6';
    }
    return '#3B82F6'; // fallback
  };

  // Calculate portfolio metrics
  const stockAssets = assets.filter(asset => asset.isStock);
  const cashAssets = assets.filter(asset => !asset.isStock);
  
  const totalStockValue = stockAssets.reduce((total, asset) => {
    if (asset.ticker && realTimePrices[asset.ticker] && asset.shares) {
      return total + (asset.shares * realTimePrices[asset.ticker]);
    }
    return total + ((asset.shares || 0) * (asset.currentPrice || 0));
  }, 0);
  
  const totalCashValue = cashAssets.reduce((total, asset) => total + (asset.balance || 0), 0);
  const totalPortfolioValue = totalStockValue + totalCashValue;

  // Calculate individual asset values and percentages
  const assetsWithValues = assets.map(asset => {
    let currentValue = 0;
    let purchaseValue = 0;
    let gainLoss = 0;
    let gainLossPercent = 0;

    if (asset.isStock) {
      const currentPrice = asset.ticker && realTimePrices[asset.ticker] 
        ? realTimePrices[asset.ticker] 
        : asset.currentPrice || 0;
      currentValue = (asset.shares || 0) * currentPrice;
      purchaseValue = (asset.shares || 0) * (asset.purchasePrice || 0);
      gainLoss = currentValue - purchaseValue;
      gainLossPercent = purchaseValue > 0 ? (gainLoss / purchaseValue) * 100 : 0;
    } else {
      currentValue = asset.balance || 0;
      purchaseValue = asset.balance || 0;
      gainLoss = 0;
      gainLossPercent = 0;
    }

    const portfolioPercentage = totalPortfolioValue > 0 ? (currentValue / totalPortfolioValue) * 100 : 0;

    return {
      ...asset,
      currentValue,
      purchaseValue,
      gainLoss,
      gainLossPercent,
      portfolioPercentage
    };
  });

  // Sort assets by value (highest first)
  const sortedAssets = assetsWithValues.sort((a, b) => b.currentValue - a.currentValue);

  // Separate valid and invalid assets
  const validAssets = sortedAssets.filter(asset => 
    !asset.isStock || !asset.ticker || !failedTickers.includes(asset.ticker)
  );
  
  const invalidAssets = sortedAssets.filter(asset => 
    asset.isStock && asset.ticker && failedTickers.includes(asset.ticker)
  );

  const getGainLossIcon = (gainLoss: number) => {
    if (gainLoss > 0) return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (gainLoss < 0) return <TrendingDown className="w-3 h-3 text-red-500" />;
    return <Minus className="w-3 h-3 text-gray-400" />;
  };

  const getGainLossColor = (gainLoss: number) => {
    if (gainLoss > 0) return 'text-green-600';
    if (gainLoss < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getAssetIcon = (asset: Asset) => {
    if (asset.isStock) {
      return (
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <span className="text-blue-600 font-semibold text-xs">
            {asset.ticker?.slice(0, 2).toUpperCase() || 'ST'}
          </span>
        </div>
      );
    } else {
      return (
        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-green-600" />
        </div>
      );
    }
  };

    if (isLoadingAssets) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 h-[400px] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className="text-[10px] sm:text-xs 2xl:text-sm font-medium text-gray-600 uppercase tracking-wide">Holdings</h3>
        </div>
        <div className="space-y-2 flex-1 overflow-y-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-md animate-pulse">
              <div className="w-6 h-6 bg-gray-200 rounded-md"></div>
              <div className="flex-1 space-y-1.5">
                <div className="w-20 h-2.5 bg-gray-200 rounded"></div>
                <div className="w-14 h-2 bg-gray-200 rounded"></div>
              </div>
              <div className="text-right space-y-1.5">
                <div className="w-16 h-2.5 bg-gray-200 rounded"></div>
                <div className="w-12 h-2 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 pt-3 shadow-sm border border-slate-200 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-[10px] sm:text-xs 2xl:text-sm font-medium text-gray-600 uppercase tracking-wide">Holdings</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleEditMode}
            disabled={assets.length === 0}
            className={`p-1 sm:p-1.5 rounded-md transition-all duration-200 ${
              assets.length === 0
                ? 'text-gray-200 cursor-not-allowed'
                : isEditMode && assets.length > 0
                ? 'text-gray-900 bg-white shadow-sm ring-1 ring-gray-300 cursor-pointer' 
                : 'text-gray-400 hover:text-gray-600 transition-all cursor-pointer'
            }`}
            title={assets.length === 0 ? "No assets to edit" : isEditMode && assets.length > 0 ? "Exit Edit Mode" : "Edit Portfolio"}
          >
            <Edit2 className='w-3 h-3 sm:w-3 sm:h-3 2xl:w-5 2xl:h-5' />
          </button>
          <button
            onClick={onAddAsset}
            disabled={isEditMode && assets.length > 0}
            className={`p-1 sm:p-1.5 rounded-md transition-colors ${
              isEditMode && assets.length > 0
                ? 'text-gray-200 cursor-not-allowed' 
                : 'text-gray-400 hover:text-gray-600 transition-all cursor-pointer'
            }`}
            title={isEditMode && assets.length > 0 ? "Exit edit mode to add assets" : "Add Asset"}
          >
            <Plus className='w-3 h-3 sm:w-4 sm:h-4 2xl:w-5 2xl:h-5' />
          </button>
        </div>
      </div>
      
      {assets.length === 0 ? (
        <div className="text-center py-8 flex-1 flex items-center justify-center">
          <div>
            <p className="text-sm text-gray-500 mb-2">No holdings yet</p>
            <p className="text-xs text-gray-400">Add your first asset to get started</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400" style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db #f3f4f6'
        }}>
          {(() => {
            return (
              <>
                {validAssets.map((asset, index) => {
                  const displayPercentage = asset.portfolioPercentage < 1 ? "<1%" : `${asset.portfolioPercentage.toFixed(1)}%`;
                  const currentPrice = asset.ticker && realTimePrices[asset.ticker] ? realTimePrices[asset.ticker] : (asset.currentPrice || 0);
                  const purchasePrice = asset.purchasePrice || asset.currentPrice || 0;
                  
                  return (
                    <div 
                      key={asset.id} 
                      className={`flex items-center space-x-3 px-4 py-0 bg-white border-b border-gray-100 transition-all ${
                        isEditMode 
                          ? 'hover:bg-gray-50 cursor-pointer' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={isEditMode ? () => onEdit?.(asset) : undefined}
                    >
                      {/* Left side - Icon and Details */}
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {/* Circular Icon */}
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: getPieChartColor(index) }}
                        >
                                                      <span className="text-white font-bold text-[10px]">
                              {asset.isStock ? asset.ticker : "CASH"}
                            </span>
                        </div>
                        
                        {/* Asset Details */}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-gray-900 truncate">
                            {asset.isStock ? asset.ticker : "CASH"}
                          </div>
                          <div className="text-[10px] text-gray-600 truncate">
                            {asset.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {asset.isStock ? (
                              `${(asset.shares || 0).toLocaleString()} @ $${purchasePrice.toFixed(2)} → $${currentPrice.toFixed(2)}`
                            ) : (
                              `APY: ${((asset.apy || 0) * 100).toFixed(2)}%`
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side - Financial Values */}
                      <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                        {!isEditMode ? (
                          <>
                            <div className="text-xs font-bold text-gray-900">
                              ${asset.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-gray-600">
                              {displayPercentage}
                            </div>
                            {asset.gainLoss !== 0 && (
                              <div className={`text-xs flex items-center space-x-1 ${asset.gainLoss > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {asset.gainLoss > 0 && <TrendingUp className="w-3 h-3" />}
                                {asset.gainLoss < 0 && <TrendingDown className="w-3 h-3" />}
                                <span>
                                  ${Math.abs(asset.gainLoss).toFixed(2)} ({asset.gainLossPercent >= 0 ? '+' : ''}{asset.gainLossPercent.toFixed(1)}%)
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.(asset);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.(asset.id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {invalidAssets.length > 0 && (
                  <>
                    <div className="mt-6 mb-3 px-4">
                      <div className="text-sm font-medium text-gray-500 tracking-wide">
                        Invalid Tickers (No Real-Time Data)
                      </div>
                    </div>
                    {invalidAssets.map((asset, index) => {
                      const displayPercentage = asset.portfolioPercentage < 1 ? "<1%" : `${asset.portfolioPercentage.toFixed(1)}%`;
                      const currentValue = (asset.shares || 0) * (asset.currentPrice || 0);
                      
                      return (
                        <div 
                          key={asset.id} 
                          className={`flex items-center space-x-3 px-4 py-3 bg-gray-50 border-b border-gray-200 transition-all ${
                            isEditMode 
                              ? 'hover:bg-gray-100 cursor-pointer' 
                              : 'hover:bg-gray-100'
                          }`}
                          onClick={isEditMode ? () => onEdit?.(asset) : undefined}
                        >
                          {/* Left side - Icon and Details */}
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            {/* Circular Icon */}
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 opacity-60"
                              style={{ backgroundColor: getPieChartColor(validAssets.length + index) }}
                            >
                              <span className="text-white font-bold text-[10px]">
                                {asset.ticker}
                              </span>
                            </div>
                            
                            {/* Asset Details */}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-gray-700 truncate">
                                {asset.ticker}
                              </div>
                              <div className="text-[10px] text-gray-500 truncate">
                                {asset.name}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {(asset.shares || 0).toLocaleString()} @ ${(asset.purchasePrice || asset.currentPrice || 0).toFixed(2)} (No real-time data)
                              </div>
                            </div>
                          </div>

                          {/* Right side - Financial Values */}
                          <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                            {!isEditMode ? (
                              <>
                                                              <div className="text-xs font-bold text-gray-700">
                                ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs text-gray-500">
                                {displayPercentage}
                              </div>
                              </>
                            ) : (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit?.(asset);
                                  }}
                                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete?.(asset.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

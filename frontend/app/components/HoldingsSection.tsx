import React, { useState, useEffect } from 'react';
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
  timePeriod?: 'all-time' | 'today';
}

// Component for fetching and displaying stock logos
function StockLogo({ ticker, className }: { ticker: string; className?: string }) {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Check for dark mode
  React.useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!ticker) return;

    const logoUrl = `https://assets.parqet.com/logos/symbol/${ticker}`;
    
    // Test if the logo exists
    const img = new Image();
    img.onload = () => {
      setLogoSrc(logoUrl);
      setHasError(false);
    };
    img.onerror = () => {
      setHasError(true);
    };
    img.src = logoUrl;
  }, [ticker]);

  if (logoSrc && !hasError) {
    return (
      <div 
        className={`${className} rounded-full flex items-center justify-center`}
        style={{ 
          backgroundColor: isDarkMode ? 'white' : '#f3f4f6' 
        }}
      >
        <img
          src={logoSrc}
          alt={`${ticker} logo`}
          className="object-cover rounded-full w-full h-full"
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  // Fallback to default text
  return (
    <div 
      className={`${className} rounded-full flex items-center justify-center`}
      style={{ 
        backgroundColor: isDarkMode ? 'white' : '#f3f4f6' 
      }}
    >
      <span className={`font-bold text-[7px] ${isDarkMode ? 'text-black' : 'text-gray-700'}`}>
        {ticker?.slice(0, 2).toUpperCase() || 'ST'}
      </span>
    </div>
  );
}

export default function HoldingsSection({ 
  assets, 
  isLoadingAssets = false, 
  isEditMode = false,
  onEdit,
  onDelete,
  onToggleEditMode,
  onAddAsset,
  timePeriod = 'all-time'
}: HoldingsSectionProps) {
  const { realTimePrices, dailyData, isLoading, failedTickers, fetchPrices } = useRealTime();

  // Fetch real-time prices for stock assets
  React.useEffect(() => {
    const stockTickers = assets
      .filter(asset => asset.isStock && asset.ticker)
      .map(asset => asset.ticker!)
      .filter(ticker => ticker && ticker.trim() !== '');
    
    if (stockTickers.length > 0) {
      console.log('Fetching prices for tickers:', stockTickers);
      fetchPrices(stockTickers);
    }
  }, [assets, fetchPrices]);

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
      // Ensure we have valid numeric values
      const shares = Number(asset.shares) || 0;
      const purchasePrice = Number(asset.purchasePrice) || 0;
      const storedCurrentPrice = Number(asset.currentPrice) || 0;
      
      // Use real-time price if available, otherwise fall back to stored price
      const currentPrice = asset.ticker && realTimePrices[asset.ticker] 
        ? Number(realTimePrices[asset.ticker])
        : storedCurrentPrice;
      
      currentValue = shares * currentPrice;
      
      if (timePeriod === 'today') {
        // For today's change, use daily data (yesterday close vs current)
        const dailyInfo = asset.ticker ? dailyData[asset.ticker] : null;
        if (dailyInfo) {
          purchaseValue = shares * dailyInfo.yesterday_close;
          gainLoss = currentValue - purchaseValue;
          gainLossPercent = dailyInfo.change_percent;
        } else {
          // Fallback to all-time calculation if no daily data
          purchaseValue = shares * purchasePrice;
          gainLoss = currentValue - purchaseValue;
          gainLossPercent = purchaseValue > 0 ? (gainLoss / purchaseValue) * 100 : 0;
        }
      } else {
        // For all-time change, use purchase price vs current price
        purchaseValue = shares * purchasePrice;
        gainLoss = currentValue - purchaseValue;
        gainLossPercent = purchaseValue > 0 ? (gainLoss / purchaseValue) * 100 : 0;
      }

      // Debug logging for first asset
      if (asset.ticker === assets[0]?.ticker) {
        console.log('Asset calculation debug:', {
          ticker: asset.ticker,
          shares,
          purchasePrice,
          storedCurrentPrice,
          realTimePrice: asset.ticker ? realTimePrices[asset.ticker] : undefined,
          currentPrice,
          currentValue,
          purchaseValue,
          gainLoss,
          gainLossPercent,
          timePeriod
        });
      }
    } else {
      currentValue = Number(asset.balance) || 0;
      purchaseValue = Number(asset.balance) || 0;
      gainLoss = 0;
      gainLossPercent = 0;

      // Debug logging for cash assets
      console.log('Cash asset debug:', {
        name: asset.name,
        balance: asset.balance,
        currentValue,
        isStock: asset.isStock
      });
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
    return 'text-black dark:text-white';
  };

  const getAssetIcon = (asset: Asset) => {
    if (asset.isStock) {
      return (
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <span className="text-blue-600 font-semibold text-[12px]">
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
      <div className="bg-white dark:bg-black rounded-lg p-4 shadow-sm border border-slate-200 dark:border-gray-600 h-[400px] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className="text-[12px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Holdings</h3>
        </div>
        <div className="space-y-2 flex-1 overflow-y-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 p-1.5 bg-white dark:bg-black rounded-md animate-pulse">
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
    <div className="bg-white dark:bg-black rounded-lg px-0 pt-3 shadow-sm border border-slate-200 dark:border-gray-600 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0 px-4">
        <h3 className="text-[11px] sm:text-[12px] 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Holdings</h3>
        <div className="flex items-center gap-2.5 sm:gap-1">
          <button
            onClick={onToggleEditMode}
            disabled={assets.length === 0}
            className={`p-1 sm:p-1.5 rounded-md transition-all duration-200 ${
              assets.length === 0
                ? 'text-gray-200 cursor-not-allowed'
                : isEditMode && assets.length > 0
                ? 'text-gray-900 dark:text-gray-100 bg-white dark:bg-black shadow-sm ring-1 ring-gray-300 cursor-pointer' 
                : 'text-gray-400 hover:text-black dark:hover:text-white dark:text-white transition-all cursor-pointer'
            }`}
            title={assets.length === 0 ? "No assets to edit" : isEditMode && assets.length > 0 ? "Exit Edit Mode" : "Edit Portfolio"}
          >
            <Edit2 className='w-3.5 h-3.5 2xl:w-5 2xl:h-5' />
          </button>
          <button
            onClick={onAddAsset}
            disabled={isEditMode && assets.length > 0}
            className={`p-1 sm:p-1.5 rounded-md transition-colors ${
              isEditMode && assets.length > 0
                ? 'text-gray-200 cursor-not-allowed' 
                : 'text-gray-400 hover:text-black dark:hover:text-white dark:text-white transition-all cursor-pointer'
            }`}
            title={isEditMode && assets.length > 0 ? "Exit edit mode to add assets" : "Add Asset"}
          >
            <Plus className='w-4 h-4 sm:w-4.5 sm:h-4.5 2xl:w-5 2xl:h-5' />
          </button>
        </div>
      </div>
      
      {assets.length === 0 ? (
        <div className="text-center py-8 flex-1 flex items-center justify-center">
          <div>
            <p className="text-sm text-gray-900 dark:text-gray-100 mb-1">No holdings yet</p>
            <p className="text-[12px] text-gray-600">Add your first asset to get started</p>
          </div>
        </div>
      ) : (
        <div className=" flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400" style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db #f3f4f6'
        }}>
          {(() => {
            return (
              <>
                {validAssets.map((asset, index) => {
                  const displayPercentage = asset.portfolioPercentage < 1 ? "<1%" : `${asset.portfolioPercentage.toFixed(1)}%`;
                  // Use calculated values from assetsWithValues
                  const { currentValue, gainLoss, gainLossPercent } = asset;
                  
                  // Use the sorted index since pie chart is now also sorted by value
                  const colorIndex = index;
                  
                  return (
                                        <div 
                      key={asset.id} 
                      className={`relative flex items-center space-x-3 px-4 py-2 bg-blue transition-all ${
                        isEditMode 
                          ? ' cursor-pointer' 
                          : ''
                      }`}
                      onClick={isEditMode ? () => onEdit?.(asset) : undefined}
                    >
                      {/* Border with left/right margins - hide for last item */}
                      {index < validAssets.length - 1 && (
                        <div className="absolute left-4 right-1 bottom-0 h-px bg-slate-200 dark:bg-gray-800/60"></div>
                      )}
                      {/* Circular Icon */}
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{ 
                          backgroundColor: asset.isStock && asset.ticker 
                            ? 'transparent' 
                            : getPieChartColor(colorIndex) 
                        }}
                      >
                        {asset.isStock && asset.ticker ? (
                          <StockLogo 
                            ticker={asset.ticker} 
                            className="w-6 h-6"
                          />
                        ) : (
                          <span className="text-white font-bold text-[12px]">
                            {asset.name?.charAt(0).toUpperCase() || 'C'}
                          </span>
                        )}
                      </div>
                      
                      {/* Asset Details */}
                      <div className="flex-1 min-w-0">
                        {asset.isStock ? (
                          <>
                            <div className="flex items-baseline space-x-2">
                              <div className="text-[11px] font-bold text-gray-900 dark:text-gray-100 truncate">
                                {asset.ticker}
                              </div>
                              <div className="text-[10px] text-black dark:text-white">
                                {displayPercentage}
                              </div>
                            </div>
                            <div className="text-[10px] text-black dark:text-white truncate mt-0.5">
                              {asset.name}
                            </div>
                            {/* <div className="text-[11px] text-gray-900 dark:text-gray-100 mt-0.5">
                              {`${(shares || 0).toLocaleString()} shares @ $${purchasePrice.toFixed(2)} → $${currentPrice.toFixed(2)}`}
                            </div> */}
                          </>
                        ) : (
                          <>
                            <div className="flex items-baseline space-x-2">
                              <div className="text-[11px] font-bold text-gray-900 dark:text-gray-100 truncate">
                                {asset.name}
                              </div>
                              <div className="text-[10px] text-black dark:text-white">
                                {displayPercentage}
                              </div>
                            </div>
                            <div className="text-[10px] text-black dark:text-white mt-0.5">
                              APY: {((asset.apy || 0) * 100).toFixed(2)}%
                            </div>
                          </>
                        )}
                      </div>

                                                {/* Financial Values */}
                          <div className="flex flex-col items-end space-y-0 flex-shrink-0 min-h-[32px] justify-center">
                            {!isEditMode ? (
                              <>
                                <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                  ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                {Math.abs(gainLoss) > 0.01 && (
                                  <div className={`text-[11px] flex items-center space-x-1 ${gainLoss > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    <span>
                                      {gainLoss > 0 ? '+' : '-'}${Math.abs(gainLoss).toFixed(2)} ({gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%)
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
                                  className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete?.(asset.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
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
                      <div className="text-[11px] font-medium text-gray-900 dark:text-gray-100 tracking-wide">
                        Invalid Tickers (No Real-Time Data)
                      </div>
                    </div>
                    {invalidAssets.map((asset, index) => {
                      const displayPercentage = asset.portfolioPercentage < 1 ? "<1%" : `${asset.portfolioPercentage.toFixed(1)}%`;
                      const currentValue = (Number(asset.shares) || 0) * (Number(asset.currentPrice) || 0);
                      
                      // Use the sorted index since pie chart is now also sorted by value
                      const colorIndex = validAssets.length + index;
                      
                      return (
                        <div 
                          key={asset.id} 
                          className={`relative flex items-center space-x-3 px-4 py-2 bg-white dark:bg-black transition-all ${
                            isEditMode 
                              ? 'dark:bg-black cursor-pointer' 
                              : 'dark:bg-black'
                          }`}
                          onClick={isEditMode ? () => onEdit?.(asset) : undefined}
                        >
                          {/* Border with left/right margins - hide for last item */}
                          {index < invalidAssets.length - 1 && (
                            <div className="absolute left-4 right-1 bottom-0 h-px bg-slate-200 dark:bg-gray-800/60"></div>
                          )}
                          {/* Circular Icon */}
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 opacity-60 overflow-hidden"
                            style={{ 
                              backgroundColor: asset.ticker 
                                ? 'transparent' 
                                : getPieChartColor(colorIndex) 
                            }}
                          >
                            {asset.ticker ? (
                              <StockLogo 
                                ticker={asset.ticker} 
                                className="w-6 h-6"
                              />
                            ) : (
                              <span className="text-white font-bold text-[11px]">
                                {asset.name?.charAt(0).toUpperCase() || 'C'}
                              </span>
                            )}
                          </div>
                          
                          {/* Asset Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline space-x-2">
                              <div className="text-[11px] font-bold text-gray-900 dark:text-gray-100 truncate">
                                {asset.ticker}
                              </div>
                              <div className="text-[10px] text-black dark:text-white">
                                {displayPercentage}
                              </div>
                            </div>
                            <div className="text-[10px] text-black dark:text-white truncate mt-0.5">
                              {asset.name}
                            </div>
                          </div>

                          {/* Financial Values */}
                          <div className="flex flex-col items-end space-y-0 flex-shrink-0 min-h-[32px] justify-center">
                            {!isEditMode ? (
                              <>
                                <div className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                  ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit?.(asset);
                                  }}
                                  className="p-1 text-gray-400 hover:text-blue-600  rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete?.(asset.id);
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
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

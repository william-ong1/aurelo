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
  // if ((isInitialLoading && validStockAssetsWithTickers.length > 0) || isLoadingAssets) {
  //   return (
  //     <div className="">
  //       <div className="flex flex-row items-center justify-between gap-2 mb-2">
  //         <h2 className="text-base text-lg 2xl:text-2xl font-semibold text-gray-800">Analytics</h2>
  //         <div className="text-xs 2xl:text-sm text-gray-500 font-medium">
  //           Loading...
  //         </div>
  //       </div>
  //       <p className="text-xs 2xl:text-sm -mt-2 text-gray-600 mb-4">Key metrics and insights about your portfolio performance</p>

        
  //       <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6">
  //         {/* Loading cards - match exact structure of real cards */}
  //         {[1, 2, 3, 4].map((i) => (
  //           <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 animate-pulse">
  //             <div className="flex items-center justify-between mb-3">
  //               <div className="w-24 h-3 bg-gray-200 rounded"></div>
  //               <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
  //             </div>
  //             <div className="space-y-4">
  //               <div>
  //                 <div className="w-20 h-6 bg-gray-200 rounded mb-1"></div>
  //                 <div className="w-16 h-4 bg-gray-200 rounded"></div>
  //               </div>
  //               <div className="flex gap-8">
  //                 <div>
  //                   <div className="w-16 h-5 bg-gray-200 rounded mb-1"></div>
  //                   <div className="w-12 h-3 bg-gray-200 rounded"></div>
  //                 </div>
  //                 <div>
  //                   <div className="w-16 h-5 bg-gray-200 rounded mb-1"></div>
  //                   <div className="w-12 h-3 bg-gray-200 rounded"></div>
  //                 </div>
  //               </div>
  //             </div>
  //           </div>
  //         ))}
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div>
      {/* <div className="flex flex-row items-center justify-between gap-mb-2">
        <h2 className="text-base text-lg 2xl:text-2xl font-semibold text-gray-800">Analytics</h2>
        <div className="text-xs 2xl:text-sm text-gray-500 font-medium">
          Total Value: ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div> */}
      {/* <p className="text-xs 2xl:text-sm -mt-2 text-gray-600 mb-4">Key metrics and insights about your portfolio performance</p> */}
      
      <div className="flex gap-4 mb-4">
        {/* Left side - First 2 cards (2/5 width) */}
        <div className="w-2/5 grid grid-cols-2 gap-4">
          {/* Total Value */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs 2xl:text-sm font-medium text-gray-600 uppercase tracking-wide">Total Value</h3>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="space-y-4">
            <div>
                  <div className="text-xs sm:text-lg 2xl:text-2xl font-bold text-gray-900">
                  ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
            <div className="text-xs 2xl:text-sm text-gray-600">Portfolio Value</div>
              </div>
              <div className="flex gap-8">
                                <div>
                    <div className="text-[10px] sm:text-base 2xl:text-lg font-bold text-gray-900">${totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                    <div className="text-xs 2xl:text-sm text-gray-600">Stocks</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-base 2xl:text-lg font-bold text-gray-900">${totalCashValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                    <div className="text-xs 2xl:text-sm text-gray-600">Cash</div>
                  </div>
              </div>
            </div>
          </div>

          {/* Cash Interest */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs 2xl:text-sm font-medium text-gray-600 uppercase tracking-wide">Cash Interest</h3>
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-xs sm:text-lg 2xl:text-2xl font-bold text-gray-900">
                  {(weightedAPY * 100).toFixed(2)}%
                </div>
            <div className="text-xs 2xl:text-sm text-gray-600">Weighted APY</div>
              </div>
              <div className="flex gap-8">
                <div>
                  <div className="text-[10px] sm:text-base 2xl:text-lg font-semibold text-gray-900">${monthlyInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-xs 2xl:text-sm text-gray-600">Monthly</div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-base 2xl:text-lg font-semibold text-gray-900">${annualInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-xs 2xl:text-sm text-gray-600">Annual</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Last 3 cards (3/5 width) */}
        <div className="w-3/5 grid grid-cols-3 gap-4">
          {/* Asset Count */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs 2xl:text-sm font-medium text-gray-600 uppercase tracking-wide">Assets</h3>
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-xs sm:text-lg 2xl:text-2xl font-bold text-gray-900">
                  {assets.length}
                </div>
            <div className="text-xs 2xl:text-sm text-gray-600">Total Assets</div>
              </div>
              <div className="flex gap-8">
                <div>
                  <div className="text-[10px] sm:text-base 2xl:text-lg font-semibold text-gray-900">{stockAssets.length}</div>
                  <div className="text-xs 2xl:text-sm text-gray-600">Stocks</div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-base 2xl:text-lg font-semibold text-gray-900">{cashAssets.length}</div>
                  <div className="text-xs 2xl:text-sm text-gray-600">Cash</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Portfolio Breakdown */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs 2xl:text-sm font-medium text-gray-600 uppercase tracking-wide">Breakdown</h3>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-xs sm:text-lg 2xl:text-2xl font-bold text-gray-900">
                  {stockAllocation.toFixed(1)}%
                </div>
                <div className="text-xs 2xl:text-sm text-gray-600">Stocks & ETFs</div>
              </div>
              <div>
                <div className="text-xs sm:text-lg 2xl:text-2xl font-bold text-gray-900">
                  {cashAllocation.toFixed(1)}%
                </div>
                <div className="text-xs 2xl:text-sm text-gray-600">Cash</div>
              </div>
            </div>
          </div>

          {/* Best Performer */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs 2xl:text-sm font-medium text-gray-600 uppercase tracking-wide">Best Performer</h3>
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-xs sm:text-lg 2xl:text-2xl font-bold text-gray-900">
                  {(() => {
                    const stockAssetsWithPrices = stockAssets.filter(asset => 
                      asset.ticker && 
                      realTimePrices[asset.ticker] && 
                      asset.purchasePrice
                    );
                    
                    if (stockAssetsWithPrices.length === 0) return 'N/A';
                    
                    const bestPerformer = stockAssetsWithPrices.reduce((best, asset) => {
                      const currentPrice = realTimePrices[asset.ticker!];
                      const returnPercent = ((currentPrice - asset.purchasePrice!) / asset.purchasePrice!) * 100;
                      const bestCurrentPrice = realTimePrices[best.ticker!];
                      const bestReturn = ((bestCurrentPrice - best.purchasePrice!) / best.purchasePrice!) * 100;
                      return returnPercent > bestReturn ? asset : best;
                    });
                    
                    const currentPrice = realTimePrices[bestPerformer.ticker!];
                    const returnPercent = ((currentPrice - bestPerformer.purchasePrice!) / bestPerformer.purchasePrice!) * 100;
                    return returnPercent > 0 ? `+${returnPercent.toFixed(1)}%` : `${returnPercent.toFixed(1)}%`;
                  })()}
                </div>
                <div className="text-xs 2xl:text-sm text-gray-600">Top Return</div>
              </div>
              <div className="flex gap-8">
                <div>
                  <div className="text-[10px] sm:text-base 2xl:text-lg font-semibold text-gray-900">
                    {(() => {
                      const stockAssetsWithPrices = stockAssets.filter(asset => 
                        asset.ticker && 
                        realTimePrices[asset.ticker] && 
                        asset.purchasePrice
                      );
                      
                      if (stockAssetsWithPrices.length === 0) return 'N/A';
                      
                      const bestPerformer = stockAssetsWithPrices.reduce((best, asset) => {
                        const currentPrice = realTimePrices[asset.ticker!];
                        const returnPercent = ((currentPrice - asset.purchasePrice!) / asset.purchasePrice!) * 100;
                        const bestCurrentPrice = realTimePrices[best.ticker!];
                        const bestReturn = ((bestCurrentPrice - best.purchasePrice!) / best.purchasePrice!) * 100;
                        return returnPercent > bestReturn ? asset : best;
                      });
                      
                      return bestPerformer.ticker || 'N/A';
                    })()}
                  </div>
                  <div className="text-xs 2xl:text-sm text-gray-600">Ticker</div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-base 2xl:text-lg font-semibold text-gray-900">
                    {(() => {
                      const stockAssetsWithPrices = stockAssets.filter(asset => 
                        asset.ticker && 
                        realTimePrices[asset.ticker] && 
                        asset.purchasePrice
                      );
                      
                      if (stockAssetsWithPrices.length === 0) return 'N/A';
                      
                      const bestPerformer = stockAssetsWithPrices.reduce((best, asset) => {
                        const currentPrice = realTimePrices[asset.ticker!];
                        const returnPercent = ((currentPrice - asset.purchasePrice!) / asset.purchasePrice!) * 100;
                        const bestCurrentPrice = realTimePrices[best.ticker!];
                        const bestReturn = ((bestCurrentPrice - best.purchasePrice!) / best.purchasePrice!) * 100;
                        return returnPercent > bestReturn ? asset : best;
                      });
                      
                      return bestPerformer.shares || 0;
                    })()}
                  </div>
                  <div className="text-xs 2xl:text-sm text-gray-600">Shares</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
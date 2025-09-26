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
  //         <h2 className="text-base text-lg 2xl:text-2xl font-medium text-gray-800">Analytics</h2>
  //         <div className="text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 font-medium">
  //           Loading...
  //         </div>
  //       </div>
  //       <p className="text-xs 2xl:text-sm -mt-2 text-black dark:text-white mb-4">Key metrics and insights about your portfolio performance</p>

        
  //       <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6">
  //         {/* Loading cards - match exact structure of real cards */}
  //         {[1, 2, 3, 4].map((i) => (
  //           <div key={i} className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70 animate-pulse">
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

  // Helper function to get best performer data
  const getBestPerformer = () => {
    const stockAssetsWithPrices = stockAssets.filter(asset => 
      asset.ticker && 
      realTimePrices[asset.ticker] && 
      asset.purchasePrice
    );
    
    if (stockAssetsWithPrices.length === 0) return null;
    
    return stockAssetsWithPrices.reduce((best, asset) => {
      const currentPrice = realTimePrices[asset.ticker!];
      const returnPercent = ((currentPrice - asset.purchasePrice!) / asset.purchasePrice!) * 100;
      const bestCurrentPrice = realTimePrices[best.ticker!];
      const bestReturn = ((bestCurrentPrice - best.purchasePrice!) / best.purchasePrice!) * 100;
      return returnPercent > bestReturn ? asset : best;
    });
  };

  // Helper function to get worst performer data
  const getWorstPerformer = () => {
    const stockAssetsWithPrices = stockAssets.filter(asset => 
      asset.ticker && 
      realTimePrices[asset.ticker] && 
      asset.purchasePrice
    );
    
    if (stockAssetsWithPrices.length === 0) return null;
    
    return stockAssetsWithPrices.reduce((worst, asset) => {
      const currentPrice = realTimePrices[asset.ticker!];
      const returnPercent = ((currentPrice - asset.purchasePrice!) / asset.purchasePrice!) * 100;
      const worstCurrentPrice = realTimePrices[worst.ticker!];
      const worstReturn = ((worstCurrentPrice - worst.purchasePrice!) / worst.purchasePrice!) * 100;
      return returnPercent < worstReturn ? asset : worst;
    });
  };

  const bestPerformer = getBestPerformer();
  const worstPerformer = getWorstPerformer();

  return (
    <div>
      {/* Desktop Layout - Hidden on mobile */}
      <div className="hidden lg:block">
        <div className="flex gap-4 mb-4">
          {/* Left side - First 2 cards (2/5 width) */}
          <div className="w-2/5 grid grid-cols-2 gap-4">
            {/* Total Value */}
            <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Total Value</h3>
                <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
              </div>
              <div className="space-y-4">
              <div>
                    <div className="text-xs sm:text-lg 2xl:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
              <div className="text-xs 2xl:text-sm text-black dark:text-white">Portfolio Value</div>
                </div>
                <div className="flex gap-8">
                                  <div>
                      <div className="text-[10px] sm:text-base 2xl:text-lg font-semibold text-gray-900 dark:text-gray-100">${totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                      <div className="text-xs 2xl:text-sm text-black dark:text-white">Stocks</div>
                    </div>
                    <div>
                      <div className="text-[10px] sm:text-base 2xl:text-lg font-semibold text-gray-900 dark:text-gray-100">${totalCashValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                      <div className="text-xs 2xl:text-sm text-black dark:text-white">Cash</div>
                    </div>
                </div>
              </div>
            </div>

            {/* Portfolio Breakdown */}
            <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Breakdown</h3>
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs sm:text-lg 2xl:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {stockAllocation.toFixed(1)}%
                  </div>
                  <div className="text-xs 2xl:text-sm text-black dark:text-white">Stocks & ETFs</div>
                </div>
                <div>
                  <div className="text-xs sm:text-lg 2xl:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {cashAllocation.toFixed(1)}%
                  </div>
                  <div className="text-xs 2xl:text-sm text-black dark:text-white">Cash</div>
                </div>
              </div>
            </div>

          </div>

          {/* Right side - Last 3 cards (3/5 width) */}
          <div className="w-3/5 grid grid-cols-3 gap-4">
            {/* Asset Count */}
            <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Assets</h3>
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-xs sm:text-lg 2xl:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {assets.length}
                  </div>
              <div className="text-xs 2xl:text-sm text-black dark:text-white">Total Assets</div>
                </div>
                <div className="flex gap-8">
                  <div>
                    <div className="text-[10px] sm:text-base 2xl:text-lg font-semibold text-gray-900 dark:text-gray-100">{stockAssets.length}</div>
                    <div className="text-xs 2xl:text-sm text-black dark:text-white">Stocks</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-base 2xl:text-lg font-semibold text-gray-900 dark:text-gray-100">{cashAssets.length}</div>
                    <div className="text-xs 2xl:text-sm text-black dark:text-white">Cash</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash Interest */}
            <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Cash Interest</h3>
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-xs sm:text-lg 2xl:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {(weightedAPY * 100).toFixed(2)}%
                  </div>
              <div className="text-xs 2xl:text-sm text-black dark:text-white">Weighted APY</div>
                </div>
                <div className="flex gap-8">
                  <div>
                    <div className="text-[10px] sm:text-base 2xl:text-lg font-semibold text-gray-900 dark:text-gray-100">${monthlyInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="text-xs 2xl:text-sm text-black dark:text-white">Monthly</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-base 2xl:text-lg font-semibold text-gray-900 dark:text-gray-100">${annualInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="text-xs 2xl:text-sm text-black dark:text-white">Annual</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Best Performer */}
            <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Best Performer</h3>
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-xs sm:text-lg 2xl:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {bestPerformer ? (() => {
                      const currentPrice = realTimePrices[bestPerformer.ticker!];
                      const returnPercent = ((currentPrice - bestPerformer.purchasePrice!) / bestPerformer.purchasePrice!) * 100;
                      return returnPercent > 0 ? `+${returnPercent.toFixed(1)}%` : `${returnPercent.toFixed(1)}%`;
                    })() : 'N/A'}
                  </div>
                  <div className="text-xs 2xl:text-sm text-black dark:text-white">Top Return</div>
                </div>
                <div className="flex gap-8">
                  <div>
                    <div className="text-[10px] sm:text-base 2xl:text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {bestPerformer?.ticker || 'N/A'}
                    </div>
                    <div className="text-xs 2xl:text-sm text-black dark:text-white">Ticker</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-base 2xl:text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {bestPerformer?.shares || 0}
                    </div>
                    <div className="text-xs 2xl:text-sm text-black dark:text-white">Shares</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout - 3x2 Grid (2 in a row) */}
      <div className="lg:hidden">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Row 1 */}
          {/* Total Value */}
          <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-black dark:text-white uppercase tracking-wide">Total Value</h3>
              <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-black dark:text-white">Portfolio Value</div>
              </div>
              <div className="flex gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">${totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  <div className="text-xs text-black dark:text-white">Stocks</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">${totalCashValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  <div className="text-xs text-black dark:text-white">Cash</div>
                </div>
              </div>
            </div>
          </div>

          {/* Portfolio Breakdown */}
          <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-black dark:text-white uppercase tracking-wide">Breakdown</h3>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {stockAllocation.toFixed(1)}%
                </div>
                <div className="text-xs text-black dark:text-white">Stocks & ETFs</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {cashAllocation.toFixed(1)}%
                </div>
                <div className="text-xs text-black dark:text-white">Cash</div>
              </div>
            </div>
          </div>

          {/* Row 2 */}
          {/* Asset Count */}
          <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-black dark:text-white uppercase tracking-wide">Assets</h3>
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {assets.length}
                </div>
                <div className="text-xs text-black dark:text-white">Total Assets</div>
              </div>
              <div className="flex gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">{stockAssets.length}</div>
                  <div className="text-xs text-black dark:text-white">Stocks</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">{cashAssets.length}</div>
                  <div className="text-xs text-black dark:text-white">Cash</div>
                </div>
              </div>
            </div>
          </div>

          {/* Cash Interest */}
          <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-black dark:text-white uppercase tracking-wide">Cash Interest</h3>
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {(weightedAPY * 100).toFixed(2)}%
                </div>
                <div className="text-xs text-black dark:text-white">Weighted APY</div>
              </div>
              <div className="flex gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">${monthlyInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-xs text-black dark:text-white">Monthly</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">${annualInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-xs text-black dark:text-white">Annual</div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3 */}
          {/* Best Performer */}
          <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-black dark:text-white uppercase tracking-wide">Best Performer</h3>
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {bestPerformer ? (() => {
                    const currentPrice = realTimePrices[bestPerformer.ticker!];
                    const returnPercent = ((currentPrice - bestPerformer.purchasePrice!) / bestPerformer.purchasePrice!) * 100;
                    return returnPercent > 0 ? `+${returnPercent.toFixed(1)}%` : `${returnPercent.toFixed(1)}%`;
                  })() : 'N/A'}
                </div>
                <div className="text-xs text-black dark:text-white">Top Return</div>
              </div>
              <div className="flex gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {bestPerformer?.ticker || 'N/A'}
                  </div>
                  <div className="text-xs text-black dark:text-white">Ticker</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {bestPerformer?.shares || 0}
                  </div>
                  <div className="text-xs text-black dark:text-white">Shares</div>
                </div>
              </div>
            </div>
          </div>

          {/* Worst Performer - Mobile Only */}
          <div className="bg-white dark:bg-black rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800/70">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium text-black dark:text-white uppercase tracking-wide">Worst Performer</h3>
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {worstPerformer ? (() => {
                    const currentPrice = realTimePrices[worstPerformer.ticker!];
                    const returnPercent = ((currentPrice - worstPerformer.purchasePrice!) / worstPerformer.purchasePrice!) * 100;
                    return returnPercent > 0 ? `+${returnPercent.toFixed(1)}%` : `${returnPercent.toFixed(1)}%`;
                  })() : 'N/A'}
                </div>
                <div className="text-xs text-black dark:text-white">Lowest Return</div>
              </div>
              <div className="flex gap-4">
                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {worstPerformer?.ticker || 'N/A'}
                  </div>
                  <div className="text-xs text-black dark:text-white">Ticker</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {worstPerformer?.shares || 0}
                  </div>
                  <div className="text-xs text-black dark:text-white">Shares</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
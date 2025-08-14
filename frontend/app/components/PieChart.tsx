"use client";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartOptions, Plugin } from "chart.js";
import { Edit2, Trash2, RefreshCw, Clock } from 'lucide-react';
import { useRealTime } from '../contexts/RealTimeContext';

ChartJS.register(ArcElement, Tooltip, Legend);

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

interface PieChartProps {
  assets: Asset[];
  isEditMode?: boolean;
  onEdit?: (asset: Asset) => void;
  onDelete?: (assetId: number) => void;
  timePeriod: 'all-time' | 'today';
}

export default function PieChart({ assets, isEditMode = false, onEdit, onDelete, timePeriod }: PieChartProps) {
  const { realTimePrices, dailyData, lastUpdated, isLoading, failedTickers, fetchPrices } = useRealTime();
  
  // Check if we have real-time prices for all valid stock assets (exclude invalid tickers)
  const validStockAssets = assets.filter(asset => 
    asset.isStock && asset.ticker && !failedTickers.includes(asset.ticker)
  );
  const hasAllPrices = validStockAssets.length === 0 || validStockAssets.every(asset => realTimePrices[asset.ticker!]);
  const isInitialLoading = isLoading || !hasAllPrices;

  if (assets.length === 0) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-gray-500">No assets to display.</div>
      </div>
    );
  }

  // Show loading state while fetching initial prices
  if (isInitialLoading && validStockAssets.length > 0) {
    return (
      <div className="flex flex-col lg:flex-row items-start p-0 gap-6">
        <div className="w-full lg:mr-8 flex-shrink-0">
          <div className="chart-container mx-auto flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-gray-600 font-medium">Loading prices...</div>
              <div className="text-sm text-gray-500 mt-1">Fetching real-time data</div>
            </div>
          </div>
          
          {/* Loading refresh button
          <div className="flex items-center justify-center gap-3 mt-1 text-xs text-gray-500 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg px-3 py-1.5">
            <button
              disabled={true}
              className="p-1.5 pr-0 rounded-md transition-all text-gray-200 cursor-not-allowed"
              title="Loading prices..."
            >
              <RefreshCw size={13} className="animate-spin" />
            </button>
            <span className="font-medium">Loading...</span>
          </div> */}
        </div>
        
        {/* Loading legend */}
        <div className="flex-1 w-full lg:max-h-88 overflow-y-auto lg:pr-2">
          <div className="space-y-2">
            {assets.map((asset, index) => (
              <div 
                key={asset.id} 
                className="flex items-center space-x-3 px-4 py-2 bg-white rounded-lg shadow-sm animate-pulse"
              >
                <div className="w-4 h-4 rounded-full bg-gray-200 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline space-x-2 flex-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {asset.isStock ? asset.ticker : "CASH"}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {asset.name}
                      </div>
                    </div>
                    <div className="w-16 h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="w-32 h-3 bg-gray-200 rounded"></div>
                    <div className="w-20 h-3 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculate values based on time period
  const values = assets.map(a => {
    if (a.isStock) {
      // Always use current price for the pie chart value (same for both views)
      const currentPrice = (a.ticker && realTimePrices[a.ticker]) ? realTimePrices[a.ticker] : (a.currentPrice || 0);
      const value = (a.shares || 0) * currentPrice;
      return isNaN(value) ? 0 : value;
    } else {
      const value = a.balance || 0;
      return isNaN(value) ? 0 : value;
    }
  });

  // Calculate values with stored prices for comparison
  const storedValues = assets.map(a => {
    if (a.isStock) {
      const value = (a.shares || 0) * (a.currentPrice || 0);
      return isNaN(value) ? 0 : value;
    } else {
      const value = a.balance || 0;
      return isNaN(value) ? 0 : value;
    }
  });

  const totalValue = values.reduce((acc, val) => acc + (isNaN(val) ? 0 : val), 0);
  const totalStoredValue = storedValues.reduce((acc, val) => acc + (isNaN(val) ? 0 : val), 0);
  
  // Calculate portfolio change based on time period
  let portfolioChange: number;
  let portfolioChangePercent: number;
  
                  if (timePeriod === 'today') {
                  // For today view, calculate change from yesterday's closing prices to current prices
                  const yesterdayClosingValues = assets.map(a => {
                    if (a.isStock && a.ticker && dailyData[a.ticker]) {
                      return (a.shares || 0) * dailyData[a.ticker].yesterday_close;
                    } else if (a.isStock) {
                                        // Fallback: use purchase price if daily data not available
                  const purchasePrice = a.purchasePrice || a.currentPrice || 0;
                      return (a.shares || 0) * purchasePrice;
                    } else {
                      return a.balance || 0;
                    }
                  });
                  const totalYesterdayValue = yesterdayClosingValues.reduce((acc, val) => acc + (isNaN(val) ? 0 : val), 0);
                  
                  portfolioChange = totalValue - totalYesterdayValue;
                  portfolioChangePercent = totalYesterdayValue > 0 ? (portfolioChange / totalYesterdayValue) * 100 : 0;
  } else {
    // For all-time view, use the original calculation
    portfolioChange = totalValue - totalStoredValue;
    portfolioChangePercent = totalStoredValue > 0 ? (portfolioChange / totalStoredValue) * 100 : 0;
  }

  const backgroundColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
  ].slice(0, values.length);

  // Fall back to HSL generation for more colors
  const finalColors = values.length <= backgroundColors.length ? backgroundColors : values.map((_, i) => `hsl(${(i * 360) / values.length}, 65%, 55%)`);

  const data = {
    labels: assets.map(a => {
      if (a.isStock && a.ticker) {
        return a.ticker;
      } 
      return "CASH";
    }),
    datasets: [
      {
        data: values,
        backgroundColor: finalColors,
        borderColor: "#ffffff",
        borderWidth: 1,
        hoverBorderColor: "#ffffff",
        hoverBackgroundColor: finalColors.map(color => `${color}99`), // Add transparency on hover
        hoverBorderWidth: 1,
        // Store the original assets data for tooltip access
        assets: assets,
      },
    ],
  };


  // Enhanced center text plugin with portfolio change
  const centerText: Plugin<"doughnut"> = {
    id: "mainCenterText",
    beforeDraw: (chart) => {
      const { width, height, ctx } = chart;
      ctx.save();
      
      // Use the pre-calculated totalValue with fallback to chart data
      let displayTotal = totalValue;
      if (displayTotal <= 0 || isNaN(displayTotal)) {
        // Fallback: calculate from chart data if totalValue is 0 or NaN
        const chartData = chart.data.datasets[0]?.data as number[];
        if (chartData && chartData.length > 0) {
          displayTotal = chartData.reduce((acc, val) => acc + (val || 0), 0);
        }
      }
      
      // Ensure we have a valid number
      if (isNaN(displayTotal) || displayTotal <= 0) {
        displayTotal = 0;
      }
      
      const formattedTotal = `$${displayTotal.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
      
      // Main total amount
      const fontSize = Math.min(width, height) * 0.08;
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      ctx.fillStyle = "#1f2937";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(formattedTotal, width / 2, height / 2 - fontSize * 0.4);
      
      // Portfolio change
      if (Math.abs(portfolioChange) > 0.01) { // Only show if there's a meaningful change
        const changeSize = fontSize * 0.5;
        ctx.font = `${changeSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        ctx.fillStyle = portfolioChange >= 0 ? "#10B981" : "#EF4444"; // Green for positive, red for negative
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        const changeSymbol = portfolioChange >= 0 ? "↗" : "↘";
        const changeText = `${changeSymbol} $${Math.abs(portfolioChange).toFixed(2)} (${portfolioChangePercent >= 0 ? "+" : ""}${portfolioChangePercent.toFixed(2)}%)`;
        ctx.fillText(changeText, width / 2, height / 2 + fontSize * 0.5);
      }
      
      ctx.restore();
    },
  };

  const options: ChartOptions<"doughnut"> = {
    cutout: "75%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#f9fafb",
        bodyColor: "#f3f4f6",
        borderColor: "#374151",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        padding: 12,
        callbacks: {
          title: (context) => {
            const dataset: any = context[0].dataset;
            const asset = dataset.assets?.[context[0].dataIndex];
            return asset?.name || context[0].label;
          },
          label: (context) => {
            const dataset: any = context.dataset;
            const asset = dataset.assets?.[context.dataIndex];
            if (!asset) return "";
            
            const value = context.raw as number;
            const percentage = ((value / totalValue) * 100).toFixed(1);
            
            if (!asset.isStock) {
              return [
                `${context.label}: ${percentage}%`,
                `Balance: $${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                asset.apy ? `APY: ${(asset.apy * 100).toFixed(2)}%` : ''
              ].filter(Boolean);
            }

            // Use real-time price if available
            const currentPrice = (asset.ticker && realTimePrices[asset.ticker]) ? realTimePrices[asset.ticker] : (asset.currentPrice || 0);
            const priceSource = (asset.ticker && realTimePrices[asset.ticker]) ? 'Live' : 'Stored';
            const purchasePrice = asset.purchasePrice || asset.currentPrice || 0;

            return [
              `${context.label}: ${percentage}%`,
              `${(asset.shares || 0).toLocaleString()} shares @ $${currentPrice.toFixed(2)} (${priceSource})`,
              `Purchase Price: $${purchasePrice.toFixed(2)}`,
              `Value: $${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ];
          },
        },
      },
    },
    maintainAspectRatio: false,
    responsive: true,
    interaction: {
      intersect: true,
      mode: 'point',
    },
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date);
  };

  const handleRefresh = async () => {
    const stockTickers = assets
      .filter(asset => asset.isStock && asset.ticker)
      .map(asset => asset.ticker!)
      .filter((ticker, index, arr) => arr.indexOf(ticker) === index);
    
    if (stockTickers.length > 0) {
      await fetchPrices(stockTickers, true);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-start p-0 gap-6">
      <div className="w-full lg:w-80 lg:mr-8 flex-shrink-0">

        
        <div className="chart-container mx-auto">
          <Doughnut 
            key={`chart-${assets.length}-${totalValue.toFixed(2)}-${portfolioChange.toFixed(2)}-${timePeriod}-${JSON.stringify(values)}`} 
            data={data} 
            options={options} 
            plugins={[centerText]} 
          />
        </div>
        
        {/* Refresh button and last updated time - centered below chart */}
        <div className="flex items-center justify-center gap-1 mt-1 mr-2 text-xs text-gray-500 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg px-3 py-1.5">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={`p-1 pr-0 rounded-md transition-all ${
              isLoading
                ? 'text-gray-200 cursor-not-allowed' 
                : 'text-gray-400 hover:text-gray-600 transition-all cursor-pointer'
            }`}
            title="Refresh prices"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {lastUpdated && (
            <span className="font-medium">{formatTime(lastUpdated)}</span>
          )}
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex-1 w-full lg:max-h-88 overflow-y-auto lg:pr-2">
        <div className="space-y-2">
          {(() => {
            // Separate assets into valid and invalid tickers
            const validAssets = assets.filter(asset => 
              !asset.isStock || !asset.ticker || !failedTickers.includes(asset.ticker)
            );
            
            const invalidAssets = assets.filter(asset => 
              asset.isStock && asset.ticker && failedTickers.includes(asset.ticker)
            );

            // Process valid assets
            const processedValidAssets = validAssets
              .map((asset, index) => {  
                let value: number;
                let changeValue: number = 0;
                let changePercent: number = 0;
                
                if (asset.isStock) {
                  // Always use current price for the pie chart value
                  const currentPrice = (asset.ticker && realTimePrices[asset.ticker]) ? realTimePrices[asset.ticker] : (asset.currentPrice || 0);
                  value = (asset.shares || 0) * currentPrice;
                  
                  if (timePeriod === 'today') {
                    // For today view, calculate change from yesterday's closing price to current price
                    if (asset.ticker && dailyData[asset.ticker]) {
                      const yesterdayClose = dailyData[asset.ticker].yesterday_close;
                      changeValue = (asset.shares || 0) * (currentPrice - yesterdayClose);
                      changePercent = dailyData[asset.ticker].change_percent;
                    } else {
                      // Fallback: use purchase price if daily data not available
                      const purchasePrice = asset.purchasePrice || asset.currentPrice || 0;
                      changeValue = (asset.shares || 0) * (currentPrice - purchasePrice);
                      changePercent = purchasePrice > 0 ? ((currentPrice - purchasePrice) / purchasePrice) * 100 : 0;
                    }
                  } else {
                    // For all-time view, calculate change from purchase price to current price
                    const purchasePrice = asset.purchasePrice || asset.currentPrice || 0;
                    changeValue = (asset.shares || 0) * (currentPrice - purchasePrice);
                    changePercent = purchasePrice > 0 ? ((currentPrice - purchasePrice) / purchasePrice) * 100 : 0;
                  }
                } else {
                  value = asset.balance || 0;
                  changeValue = 0; // Cash doesn't change in this context
                  changePercent = 0;
                }
                
                const percentage = ((value / totalValue) * 100);

                return {
                  ...asset,
                  originalIndex: index,
                  value: value,
                  percentage: percentage,
                  changeValue: changeValue,
                  changePercent: changePercent,
                };
              })
              .sort((a, b) => b.percentage - a.percentage);

            // Process invalid assets
            const processedInvalidAssets = invalidAssets.map((asset, index) => {
              const value = (asset.shares || 0) * (asset.currentPrice || 0);
              const percentage = ((value / totalValue) * 100);
              
              return {
                ...asset,
                originalIndex: validAssets.length + index,
                value: value,
                percentage: percentage,
                changeValue: 0,
                changePercent: 0,
              };
            });

            return (
              <>
                {/* Valid Assets */}
                {processedValidAssets.map((asset) => {
                  const displayPercentage = asset.percentage < 1 ? "<1%" : `${asset.percentage.toFixed(1)}%`;
                  
                  return (
                    <div 
                      key={asset.id} 
                      className={`flex items-center space-x-3 px-3 sm:px-4 py-2 bg-white rounded-lg shadow-sm transition-all ${
                        isEditMode 
                          ? 'hover:shadow-md hover:bg-gray-50 cursor-pointer' 
                          : 'hover:shadow-md'
                      }`}
                      onClick={isEditMode ? () => onEdit?.(asset) : undefined}
                    >
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: finalColors[asset.originalIndex] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline space-x-2 flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {asset.isStock ? asset.ticker : "CASH"}
                            </div>
                            <div className="text-xs text-gray-600 truncate hidden sm:block">
                              {asset.name}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <div className="w-12 sm:w-16 flex justify-end">
                              {!isEditMode && (
                                <div className="text-sm font-semibold text-gray-900">
                                  {displayPercentage}
                                </div>
                              )}
                              {isEditMode && (
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEdit?.(asset);
                                    }}
                                    className="px-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDelete?.(asset.id);
                                    }}
                                    className="px-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1 text-xs text-gray-500 gap-1">
                          <span className="truncate">
                            {asset.isStock ? (
                              <>
                                {(asset.shares || 0).toLocaleString()} @ ${(asset.purchasePrice || asset.currentPrice || 0).toFixed(2)} → ${(asset.ticker && realTimePrices[asset.ticker]) ? realTimePrices[asset.ticker].toFixed(2) : (asset.currentPrice || 0).toFixed(2)}
                                {asset.changeValue !== 0 && (
                                  <>
                                    <span className={`ml-2 font-medium ${asset.changeValue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {asset.changeValue > 0 ? '↗' : '↘'}
                                    </span>
                                    <span className={`ml-1 font-medium ${asset.changeValue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      ${Math.abs(asset.changeValue).toFixed(2)} ({asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(1)}%)
                                    </span>
                                  </>
                                )}
                              </>
                            ) : (
                              `APY: ${((asset.apy || 0) * 100).toFixed(2)}%`
                            )}
                          </span>
                          {!isEditMode && (
                            <span className="font-medium flex-shrink-0">
                              ${asset.isStock ? 
                                ((asset.shares || 0) * (asset.ticker && realTimePrices[asset.ticker] ? realTimePrices[asset.ticker] : (asset.currentPrice || 0))).toLocaleString(undefined, { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                }) :
                                asset.value.toLocaleString(undefined, { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                })
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Invalid Tickers Section */}
                {processedInvalidAssets.length > 0 && (
                  <>
                    <div className="mt-4 mb-2">
                      <div className="text-xs font-medium text-gray-500 tracking-wide px-3">
                        Invalid Tickers (No Real-Time Data)
                      </div>
                    </div>
                    {processedInvalidAssets.map((asset) => {
                      const displayPercentage = asset.percentage < 1 ? "<1%" : `${asset.percentage.toFixed(1)}%`;
                      
                      return (
                        <div 
                          key={asset.id} 
                          className={`flex items-center space-x-3 px-3 sm:px-4 py-2 bg-gray-50 rounded-lg shadow-sm transition-all ${
                            isEditMode 
                              ? 'hover:shadow-md hover:bg-gray-100 cursor-pointer' 
                              : 'hover:shadow-md'
                          }`}
                          onClick={isEditMode ? () => onEdit?.(asset) : undefined}
                        >
                          <div 
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: finalColors[asset.originalIndex] }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-baseline space-x-2 flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-700 truncate">
                                  {asset.ticker}
                                </div>
                                <div className="text-xs text-gray-500 truncate hidden sm:block">
                                  {asset.name}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <div className="w-12 sm:w-16 flex justify-end">
                                  {!isEditMode && (
                                    <div className="text-sm font-semibold text-gray-700">
                                      {displayPercentage}
                                    </div>
                                  )}
                                  {isEditMode && (
                                    <div className="flex items-center space-x-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onEdit?.(asset);
                                        }}
                                        className="px-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="Edit"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDelete?.(asset.id);
                                        }}
                                        className="px-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1 text-xs text-gray-500 gap-1">
                              <span className="truncate">
                                {(asset.shares || 0).toLocaleString()} @ ${(asset.purchasePrice || asset.currentPrice || 0).toFixed(2)} (No real-time data)
                              </span>
                              {!isEditMode && (
                                <span className="font-medium flex-shrink-0">
                                  ${((asset.shares || 0) * (asset.currentPrice || 0)).toLocaleString(undefined, { 
                                    minimumFractionDigits: 2, 
                                    maximumFractionDigits: 2 
                                  })}
                                </span>
                              )}
                            </div>
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
      </div>
    </div>
  );
}
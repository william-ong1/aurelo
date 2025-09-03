"use client";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartOptions, Plugin } from "chart.js";
import { Edit2, Trash2, RefreshCw, Clock, TrendingUp, TrendingDown } from 'lucide-react';
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
  isLoadingAssets?: boolean;
}

export default function PieChart({ assets, isEditMode = false, onEdit, onDelete, timePeriod, isLoadingAssets = false }: PieChartProps) {
  const { realTimePrices, dailyData, lastUpdated, isLoading, failedTickers, fetchPrices } = useRealTime();
  
  // Check if we have real-time prices for all valid stock assets (exclude invalid tickers)
  const validStockAssets = assets.filter(asset => 
    asset.isStock && asset.ticker && !failedTickers.includes(asset.ticker)
  );
  const hasAllPrices = validStockAssets.length === 0 || validStockAssets.every(asset => realTimePrices[asset.ticker!]);
  // const isInitialLoading = isLoading || !hasAllPrices;

  if (assets.length === 0) {
    if (isLoadingAssets) {
      return (
        <div className="flex items-center justify-center rounded-lg w-full h-[200px] sm:h-[240px] md:h-[280px] lg:h-[320px] 2xl:h-[360px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4"></div>
            <div className="text-xs sm:text-sm 2xl:text-base text-gray-600 font-medium">Retrieving portfolio...</div>
            <div className="text-[10px] sm:text-xs 2xl:text-sm text-gray-500 mt-1">Loading your assets</div>
          </div>
        </div>
      );
    }
    
    // Default doughnut chart when no assets
    const defaultData = {
      labels: ['No Assets'],
      datasets: [
        {
          data: [1],
          backgroundColor: ['#E5E7EB'], // Light gray
          borderColor: "#ffffff",
          borderWidth: 1,
          hoverBorderColor: "#ffffff",
          hoverBackgroundColor: ['#D1D5DB'],
          hoverBorderWidth: 1,
          hoverOffset: 8, // Keep hover animation
        },
      ],
    };

    const defaultCenterText: Plugin<"doughnut"> = {
      id: "defaultCenterText",
      beforeDraw: (chart) => {
        const { width, height, ctx } = chart;
        ctx.save();
        
        const fontSize = Math.min(width, height) * 0.06;
        ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        ctx.fillStyle = "#9CA3AF"; // Lighter gray for a more sleek look
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("No Assets", width / 2, height / 2);
        
        ctx.restore();
      },
    };

    const defaultOptions: ChartOptions<"doughnut"> = {
      cutout: "75%",
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: false, // Disable tooltips for default chart
        },
      },
      maintainAspectRatio: false,
      responsive: true,
      layout: {
        padding: 0,
        autoPadding: false
      },
      interaction: {
        intersect: true,
        mode: 'point',
      },
      animation: {
        animateRotate: true,
        // animateScale: true,
        duration: 1000,
        easing: 'easeOutQuart'
      },
    };

    return (
      <div className="w-full h-[200px] sm:h-[240px] md:h-[280px] lg:h-[320px] 2xl:h-[360px]">
        <Doughnut data={defaultData} options={defaultOptions} plugins={[defaultCenterText]} />
      </div>
    );
  }

  // Show loading state while fetching initial prices
  // if (isInitialLoading && validStockAssets.length > 0) {
  //   return (
  //     <div className="flex items-center justify-center rounded-lg w-full h-[200px] sm:h-[240px] md:h-[280px] lg:h-[320px] 2xl:h-[360px]">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4"></div>
  //         <div className="text-xs sm:text-sm 2xl:text-base text-gray-600 font-medium">Loading prices...</div>
  //         <div className="text-[10px] sm:text-xs 2xl:text-sm text-gray-500 mt-1">Fetching real-time data</div>
  //       </div>
  //     </div>
  //   );
  // }

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

  // Extended modern color palette
  const backgroundColors = [
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#84cc16', // Lime
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#7c3aed', // Purple
    '#be185d', // Rose
    '#dc2626', // Red
    '#ea580c', // Orange
    '#d97706', // Amber
    '#65a30d', // Lime
    '#059669', // Emerald
    '#0891b2', // Cyan
    '#2563eb', // Blue
    '#4f46e5', // Indigo
    '#7c2d12', // Brown
    '#1e40af', // Dark Blue
    '#166534', // Dark Green
    '#9d174d', // Dark Pink
    '#92400e', // Dark Orange
    '#a855f7', // Purple
    '#f43f5e', // Rose
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#14b8a6', // Teal
    '#0ea5e9', // Sky
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#84cc16', // Lime
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
  ].slice(0, values.length);

  // Extended fallback colors for more assets
  const fallbackColors = [
    '#7c3aed', // Purple
    '#be185d', // Rose
    '#dc2626', // Red
    '#ea580c', // Orange
    '#d97706', // Amber
    '#65a30d', // Lime
    '#059669', // Emerald
    '#0891b2', // Cyan
    '#2563eb', // Blue
    '#4f46e5', // Indigo
    '#7c2d12', // Brown
    '#1e40af', // Dark Blue
    '#166534', // Dark Green
    '#9d174d', // Dark Pink
    '#92400e', // Dark Orange
    '#a855f7', // Purple
    '#f43f5e', // Rose
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#14b8a6', // Teal
    '#0ea5e9', // Sky
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#84cc16', // Lime
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#7c3aed', // Purple
    '#be185d', // Rose
    '#dc2626', // Red
    '#ea580c', // Orange
    '#d97706', // Amber
    '#65a30d', // Lime
    '#059669', // Emerald
    '#0891b2', // Cyan
    '#2563eb', // Blue
    '#4f46e5', // Indigo
    '#7c2d12', // Brown
    '#1e40af', // Dark Blue
    '#166534', // Dark Green
    '#9d174d', // Dark Pink
    '#92400e', // Dark Orange
  ];
  
  const finalColors = values.length <= backgroundColors.length 
    ? backgroundColors 
    : values.map((_, i) => fallbackColors[i % fallbackColors.length]);

  // Export colors for use in other components
  if (typeof window !== 'undefined') {
    (window as any).pieChartColors = finalColors;
  }

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
        hoverOffset: 0, // Add hover animation
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
      
      // Last updated timestamp
      if (lastUpdated) {
        const timestampSize = fontSize * .4;
        ctx.font = `${timestampSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        ctx.fillStyle = "#6B7280"; // Gray color
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        const timestampText = formatTime(lastUpdated);
        ctx.fillText(timestampText, width / 2, height / 2 + fontSize * 1.2);
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
            const dataset: { assets?: Asset[] } = context[0].dataset as { assets?: Asset[] };
            const asset = dataset.assets?.[context[0].dataIndex];
            return asset?.name || context[0].label;
          },
          label: (context) => {
            const dataset: { assets?: Asset[] } = context.dataset as { assets?: Asset[] };
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
              `${context.label} • ${percentage}%`,
              `${(asset.shares || 0).toLocaleString()} shares @ $${currentPrice.toFixed(2)}`,
              `Value: $${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ];
          },
        },
      },
    },
    maintainAspectRatio: false,
    responsive: true,
    layout: {
      padding: 0,
      autoPadding: false
    },
    interaction: {
      intersect: true,
      mode: 'point',
    },
    animation: {
      animateRotate: true,
      // animateScale: true,
      duration: 1000,
      easing: 'easeOutQuart'
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
    <div className="flex items-center justify-center w-full h-full">
      <div className="relative w-[300px] h-[300px]">
        <Doughnut 
          key={`chart-${assets.length}-${totalValue.toFixed(2)}-${portfolioChange.toFixed(2)}-${timePeriod}-${JSON.stringify(values)}`} 
          data={data} 
          options={options} 
          plugins={[centerText]} 
        />
      </div>
      
      {/* Legend */}
      {/* <div 
        className="flex-1 w-full lg:pl-8 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400 relative h-[200px] sm:h-[240px] md:h-[280px] lg:h-[320px] 2xl:h-[360px]" 
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db #f3f4f6'
        }}
      >
        <div className="space-y-2">
          {(() => {
            const validAssets = assets.filter(asset => 
              !asset.isStock || !asset.ticker || !failedTickers.includes(asset.ticker)
            );
            
            const invalidAssets = assets.filter(asset => 
              asset.isStock && asset.ticker && failedTickers.includes(asset.ticker)
            );

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
                {processedValidAssets.map((asset) => {
                  const displayPercentage = asset.percentage < 1 ? "<1%" : `${asset.percentage.toFixed(1)}%`;
                  
                  return (
                    <div 
                      key={asset.id} 
                      className={`flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-white rounded-lg border border-slate-200 transition-all ${
                        isEditMode 
                          ? 'hover:shadow-md hover:bg-gray-50 cursor-pointer' 
                          : ''
                      }`}
                      onClick={isEditMode ? () => onEdit?.(asset) : undefined}
                    >
                      <div 
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: finalColors[asset.originalIndex] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-baseline space-x-2 flex-1 min-w-0">
                            <div className="text-[8px] sm:text-[10px] 2xl:text-sm font-semibold text-gray-900 truncate">
                              {asset.isStock ? asset.ticker : "CASH"}
                            </div>
                            <div className="text-[8px] sm:text-[10px] 2xl:text-sm text-gray-600 truncate">
                              {asset.name}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <div className="w-12 sm:w-16 flex justify-end">
                              {!isEditMode && (
                                <div className="text-[8px] sm:text-[10px] 2xl:text-sm font-semibold text-gray-900">
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
                                    className="px-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDelete?.(asset.id);
                                    }}
                                    className="px-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-row items-center justify-between mt-1 text-[8px] sm:text-[10px] 2xl:text-sm text-gray-500 gap-1">
                          <span className="truncate">
                            {asset.isStock ? (
                              <div className="flex flex-col sm:flex-row">
                                {(asset.shares || 0).toLocaleString()} @ ${(asset.purchasePrice || asset.currentPrice || 0).toFixed(2)} → ${(asset.ticker && realTimePrices[asset.ticker]) ? realTimePrices[asset.ticker].toFixed(2) : (asset.currentPrice || 0).toFixed(2)}

                                {asset.changeValue !== 0 && (
                                  <div className="flex flex-row gap-1 sm:gap-0">
                                    <span className={`sm:ml-2 font-medium ${asset.changeValue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {asset.changeValue > 0 ? '↗' : '↘'}
                                    </span>
                                    <span className={`sm:ml-1 font-medium ${asset.changeValue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      ${Math.abs(asset.changeValue).toFixed(2)} ({asset.changePercent >= 0 ? '+' : ''}{asset.changePercent.toFixed(1)}%)
                                    </span>
                                  </div>
                                )}
                              </div>
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

                {processedInvalidAssets.length > 0 && (
                  <>
                    <div className="mt-4 mb-2">
                      <div className="text-[8px] sm:text-[10px] 2xl:text-sm font-medium text-gray-500 tracking-wide px-3">
                        Invalid Tickers (No Real-Time Data)
                      </div>
                    </div>
                    {processedInvalidAssets.map((asset) => {
                      const displayPercentage = asset.percentage < 1 ? "<1%" : `${asset.percentage.toFixed(1)}%`;
                      
                      return (
                        <div 
                          key={asset.id} 
                          className={`flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gray-50 rounded-lg shadow-sm border border-gray-300 transition-all ${
                            isEditMode 
                              ? 'hover:shadow-md hover:bg-gray-100 cursor-pointer' 
                              : 'hover:shadow-md hover:bg-gray-100'
                          }`}
                          onClick={isEditMode ? () => onEdit?.(asset) : undefined}
                        >
                          <div 
                            className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: finalColors[asset.originalIndex] }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-baseline space-x-2 flex-1 min-w-0">
                                <div className="text-[8px] sm:text-[10px] 2xl:text-sm font-semibold text-gray-700 truncate">
                                  {asset.ticker}
                                </div>
                                <div className="text-[8px] sm:text-[10px] 2xl:text-sm text-gray-500 truncate hidden sm:block">
                                  {asset.name}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <div className="w-12 sm:w-16 flex justify-end">
                                  {!isEditMode && (
                                    <div className="text-[8px] sm:text-[10px] 2xl:text-sm font-semibold text-gray-700">
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
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1 text-[8px] sm:text-[10px] 2xl:text-sm text-gray-500 gap-1">
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
      </div> */}
    </div>
  );
}
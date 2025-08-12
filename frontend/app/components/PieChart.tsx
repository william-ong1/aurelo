"use client";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartOptions, Plugin } from "chart.js";
import { Edit2, Trash2 } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

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

interface PieChartProps {
  assets: Asset[];
  isEditMode?: boolean;
  onEdit?: (asset: Asset) => void;
  onDelete?: (assetId: number) => void;
}

export default function PieChart({ assets, isEditMode = false, onEdit, onDelete }: PieChartProps) {

  if (assets.length === 0) {
    return (
      <div className="flex items-center justify-center h-80">
        <div className="text-gray-500">No assets to display.</div>
      </div>
    );
  }

  const values = assets.map(a => {
    if (a.isStock) {
      const value = (a.shares || 0) * (a.currentPrice || 0);
      return isNaN(value) ? 0 : value;
    } else {
      const value = a.balance || 0;
      return isNaN(value) ? 0 : value;
    }
  });

  const totalValue = values.reduce((acc, val) => acc + (isNaN(val) ? 0 : val), 0);

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





  // Enhanced center text plugin with better typography
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
      ctx.fillText(formattedTotal, width / 2, height / 2 - fontSize * 0.2);
      
      // Subtitle
      const subtitleSize = fontSize * 0.35;
      ctx.font = `${subtitleSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      ctx.fillStyle = "#6b7280";
      ctx.fillText("Total Portfolio", width / 2, height / 2 + fontSize * 0.6);
      
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

            return [
              `${context.label}: ${percentage}%`,
              `${(asset.shares || 0).toLocaleString()} shares @ $${(asset.currentPrice || 0).toFixed(2)}`,
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

  return (
    <div className="flex items-start p-0">
      <div className="w-80 h-80 mr-8 flex-shrink-0">
        <Doughnut 
          key={`chart-${assets.length}-${totalValue.toFixed(2)}`} 
          data={data} 
          options={options} 
          plugins={[centerText]} 
        />
      </div>
      
      {/* Legend */}
      <div className="flex-1 max-h-80 overflow-y-auto pr-2">
        <div className="space-y-2">
          {assets
            .map((asset, index) => {  
              const value = asset.isStock ? ((asset.shares || 0) * (asset.currentPrice || 0)) : (asset.balance || 0)
              const percentage = ((value / totalValue) * 100);

              return {
                ...asset,
                originalIndex: index,
                value: value,
                percentage: percentage,
              };})

            .sort((a, b) => b.percentage - a.percentage)
            .map((asset) => {
              const displayPercentage = asset.percentage < 1 ? "<1%" : `${asset.percentage.toFixed(1)}%`;
              
              return (
                <div 
                  key={asset.id} 
                  className={`flex items-center space-x-3 px-4 py-2 bg-white rounded-lg shadow-sm transition-all ${
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
                      <div className="flex items-baseline space-x-2 flex-1">
                        <div className="text-sm font-semibold text-gray-900">
                          {asset.isStock ? asset.ticker : "CASH"}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {asset.name}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 flex justify-end">
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
                    <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                      <span>
                        {asset.isStock ? `${(asset.shares || 0).toLocaleString()} @ $${(asset.currentPrice || 0).toFixed(2)}` : `APY: ${((asset.apy || 0) * 100).toFixed(2)}%`}
                      </span>
                      {!isEditMode && (
                        <span className="font-medium">
                          ${asset.value.toLocaleString(undefined, { 
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
        </div>
      </div>
    </div>
  );
}
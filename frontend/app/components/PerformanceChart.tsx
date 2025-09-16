"use client";
import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartOptions } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

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

interface PerformanceChartProps {
  assets: Asset[];
  timePeriod: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';
}

export default function PerformanceChart({ assets, timePeriod }: PerformanceChartProps) {
  // Generate mock performance data based on current portfolio value
  const generatePerformanceData = () => {
    const currentValue = assets.reduce((total, asset) => {
      if (asset.isStock) {
        return total + ((asset.shares || 0) * (asset.currentPrice || 0));
      } else {
        return total + (asset.balance || 0);
      }
    }, 0);

    const periods = {
      '1D': 24,
      '1W': 7,
      '1M': 30,
      '3M': 90,
      '1Y': 365,
      'ALL': 730
    };

    const dataPoints = periods[timePeriod];
    const data = [];
    const labels = [];
    
    // Generate realistic-looking data with some volatility
    let baseValue = currentValue * 0.95; // Start slightly lower
    const volatility = 0.02; // 2% daily volatility
    
    for (let i = 0; i < dataPoints; i++) {
      // Add some random movement
      const change = (Math.random() - 0.5) * volatility;
      baseValue = baseValue * (1 + change);
      
      // Add some trend (slight upward bias)
      if (i > dataPoints * 0.7) {
        baseValue = baseValue * 1.001; // Slight upward trend
      }
      
      data.push(baseValue);
      
      // Generate appropriate labels
      if (timePeriod === '1D') {
        labels.push(`${i}:00`);
      } else if (timePeriod === '1W') {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        labels.push(days[i % 7]);
      } else if (timePeriod === '1M') {
        labels.push(`Day ${i + 1}`);
      } else if (timePeriod === '3M') {
        labels.push(`Week ${Math.floor(i / 7) + 1}`);
      } else if (timePeriod === '1Y') {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        labels.push(months[Math.floor(i / 30) % 12]);
      } else {
        labels.push(`Month ${Math.floor(i / 30) + 1}`);
      }
    }

    return { data, labels };
  };

  const { data, labels } = generatePerformanceData();
  
  // Calculate performance metrics
  const startValue = data[0];
  const endValue = data[data.length - 1];
  const totalChange = endValue - startValue;
  const totalChangePercent = ((totalChange / startValue) * 100);
  const isPositive = totalChange >= 0;

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Portfolio Value',
        data: data,
        borderColor: isPositive ? '#10B981' : '#EF4444',
        backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: isPositive ? '#10B981' : '#EF4444',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#f9fafb',
        bodyColor: '#f3f4f6',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        padding: 12,
        callbacks: {
          title: () => '',
          label: (context) => {
            const value = context.parsed.y;
            return `$${value.toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: false,
        grid: {
          display: false,
        },
      },
      y: {
        display: false,
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    elements: {
      point: {
        hoverRadius: 6,
      },
    },
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm sm:text-base 2xl:text-lg font-semibold text-gray-900">Performance</h3>
          <p className="text-[12px] sm:text-xs 2xl:text-sm text-black">Portfolio value over time</p>
        </div>
        <div className="text-right">
          <div className="text-lg sm:text-xl 2xl:text-2xl font-bold text-gray-900">
            {formatCurrency(endValue)}
          </div>
          <div className={`text-[12px] sm:text-xs 2xl:text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{formatCurrency(totalChange)} ({isPositive ? '+' : ''}{totalChangePercent.toFixed(2)}%)
          </div>
        </div>
      </div>
      
      <div className="h-48">
        <Line data={chartData} options={options} />
      </div>
      
      <div className="mt-4 flex items-center justify-between text-[12px] sm:text-xs 2xl:text-sm text-gray-900">
        <span>Start: {formatCurrency(startValue)}</span>
        <span>{timePeriod} period</span>
        <span>Current: {formatCurrency(endValue)}</span>
      </div>
    </div>
  );
}

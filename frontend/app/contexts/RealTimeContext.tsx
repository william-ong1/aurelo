"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface RealTimePrices {
  [ticker: string]: number;
}

interface DailyData {
  yesterday_close: number;
  current: number;
  change: number;
  change_percent: number;
}

interface RealTimeContextType {
  realTimePrices: RealTimePrices;
  dailyData: { [ticker: string]: DailyData };
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
  failedTickers: string[];
  fetchPrices: (tickers: string[], forceRefresh?: boolean) => Promise<void>;
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

interface RealTimeProviderProps {
  children: ReactNode;
}

export function RealTimeProvider({ children }: RealTimeProviderProps) {
  const [realTimePrices, setRealTimePrices] = useState<RealTimePrices>({});
  const [dailyData, setDailyData] = useState<{ [ticker: string]: DailyData }>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedTickers, setFailedTickers] = useState<string[]>([]);

  const fetchPrices = useCallback(async (tickers: string[], forceRefresh = false) => {
    if (tickers.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:8000/api/prices?tickers=${tickers.join(',')}`);
      if (!response.ok) {
        throw new Error('Failed to fetch prices');
      }

      const data = await response.json();
      setRealTimePrices(prev => ({ ...prev, ...data.prices }));
      setDailyData(prev => ({ ...prev, ...data.daily_data }));
      setLastUpdated(new Date(data.timestamp));
      
      if (data.failed_tickers && data.failed_tickers.length > 0) {
        console.warn('Failed to fetch prices for:', data.failed_tickers);
        setFailedTickers(data.failed_tickers);
      } else {
        setFailedTickers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
      console.error('Error fetching real-time prices:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const value: RealTimeContextType = {
    realTimePrices,
    dailyData,
    lastUpdated,
    isLoading,
    error,
    failedTickers,
    fetchPrices
  };

  return (
    <RealTimeContext.Provider value={value}>
      {children}
    </RealTimeContext.Provider>
  );
}

export function useRealTime() {
  const context = useContext(RealTimeContext);
  if (context === undefined) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
}

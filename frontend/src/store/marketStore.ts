import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MarketFilters {
  market: 'all' | 'us' | 'crypto' | 'ngx';
  timeframe: 'daily' | 'weekly' | 'monthly' | 'ytd';
  country?: string;
  type: 'gainers' | 'losers';
  limit: number;
}

interface MarketStore {
  filters: MarketFilters;
  activeView: 'table' | 'analysis' | 'bestPerformers';
  selectedSymbol: string | null;
  darkMode: boolean;
  setFilters: (filters: Partial<MarketFilters>) => void;
  setActiveView: (view: 'table' | 'analysis' | 'bestPerformers') => void;
  setSelectedSymbol: (symbol: string | null) => void;
  toggleDarkMode: () => void;
}

export const useMarketStore = create<MarketStore>()(
  persist(
    (set) => ({
      filters: {
        market: 'all',
        timeframe: 'daily',
        type: 'gainers',
        limit: 20,
      },
      activeView: 'table',
      selectedSymbol: null,
      darkMode: true, // Default to dark mode
      setFilters: (newFilters) =>
        set((state) => ({ filters: { ...state.filters, ...newFilters } })),
      setActiveView: (view) => set({ activeView: view }),
      setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: 'mih-market-store',
      partialize: (state) => ({ darkMode: state.darkMode, filters: state.filters }),
    }
  )
);

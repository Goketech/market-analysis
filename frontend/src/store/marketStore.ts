import { create } from 'zustand';

interface MarketFilters {
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

export const useMarketStore = create<MarketStore>((set) => ({
  filters: {
    market: 'all',
    timeframe: 'daily' as const,
    type: 'gainers' as const,
    limit: 20,
  },
  activeView: 'table',
  selectedSymbol: null,
  darkMode: false,
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
  setActiveView: (view) => set({ activeView: view }),
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
}));

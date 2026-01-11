import { create } from 'zustand';

interface MarketFilters {
  market: 'all' | 'stocks' | 'crypto' | 'ngx';
  timeframe: 'daily' | 'ytd';
  country?: string;
  type: 'gainers' | 'losers';
  limit: number;
}

interface MarketStore {
  filters: MarketFilters;
  activeView: 'table' | 'analysis';
  selectedSymbol: string | null;
  darkMode: boolean;
  setFilters: (filters: Partial<MarketFilters>) => void;
  setActiveView: (view: 'table' | 'analysis') => void;
  setSelectedSymbol: (symbol: string | null) => void;
  toggleDarkMode: () => void;
}

export const useMarketStore = create<MarketStore>((set) => ({
  filters: {
    market: 'all',
    timeframe: 'daily',
    type: 'gainers',
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

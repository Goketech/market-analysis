import { useQuery } from '@tanstack/react-query';
import { apiClient, TopPerformersResponse, AnalysisReport } from './client';
import { MarketFilters } from '../store/marketStore';

export const useTopPerformers = (filters: MarketFilters) => {
  return useQuery<TopPerformersResponse>({
    queryKey: ['topPerformers', filters],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/market/top-performers', {
        params: {
          market: filters.market,
          timeframe: filters.timeframe,
          country: filters.country,
          limit: filters.limit,
          type: filters.type,
        },
      });
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useAnalysisReport = (symbol: string, market: string) => {
  return useQuery<{ status: string; data: AnalysisReport }>({
    queryKey: ['analysis', symbol, market],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/analysis/${symbol}`, {
        params: { market },
      });
      return response.data;
    },
    enabled: !!symbol,
    staleTime: 300000, // 5 minutes
  });
};

// New hooks for enhanced features
export const useSentiment = (symbol: string, refresh?: boolean) => {
  return useQuery({
    queryKey: ['sentiment', symbol, refresh],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/sentiment/${symbol}`, {
        params: refresh ? { refresh: 'true' } : {},
      });
      return response.data;
    },
    enabled: !!symbol,
    staleTime: 3600000, // 1 hour
  });
};

export const useBestPerformers5Y = (market?: string, limit?: number, sortBy?: string) => {
  return useQuery({
    queryKey: ['bestPerformers5Y', market, limit, sortBy],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/market/best-performers-5y', {
        params: { market, limit, sortBy },
      });
      return response.data;
    },
    staleTime: 86400000, // 24 hours
  });
};

export const usePerformance = (symbol: string, market: string, years?: number) => {
  return useQuery({
    queryKey: ['performance', symbol, market, years],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/market/performance/${symbol}`, {
        params: { market, years },
      });
      return response.data;
    },
    enabled: !!symbol,
    staleTime: 86400000, // 24 hours
  });
};

export const useFilings = (symbol: string, type?: string, includeMetrics?: boolean, limit?: number) => {
  return useQuery({
    queryKey: ['filings', symbol, type, includeMetrics, limit],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/filings/${symbol}`, {
        params: { type, includeMetrics, limit },
      });
      return response.data;
    },
    enabled: !!symbol,
    staleTime: 604800000, // 7 days
  });
};

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

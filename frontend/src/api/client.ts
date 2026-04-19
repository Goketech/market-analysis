import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach JWT ─────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor: handle 401 (token refresh) ────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, setAccessToken, logout } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, { refreshToken });
        const { accessToken } = res.data.data;
        setAccessToken(accessToken);
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ─── Type exports ─────────────────────────────────────────────────────────────
export interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  market: 'us' | 'crypto' | 'ngx';
  country?: string;
}

export interface TopPerformersResponse {
  status: string;
  data: MarketData[];
  filters: {
    market: string;
    timeframe: string;
    country?: string;
    limit: number;
    type: string;
  };
}

export interface AnalysisReport {
  symbol: string;
  name: string;
  market: 'us' | 'crypto' | 'ngx';
  technical: {
    rsi: number;
    macd: { value: number; signal: number; histogram: number };
    support: number;
    resistance: number;
    trend: 'bullish' | 'bearish' | 'neutral';
  };
  fundamental: {
    pe?: number;
    marketCap?: number;
    volume24h?: number;
    debt?: number;
  };
  sentiment: {
    score: number;
    newsCount: number;
    socialSentiment: 'positive' | 'negative' | 'neutral';
  };
  recommendation: {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    entryTarget?: number;
    exitTarget?: number;
    reasoning: string;
  };
  timestamp: string;
}

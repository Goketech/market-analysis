import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

import axios from 'axios';
import { MarketData } from '../services/market.service';

export class CoinGeckoProvider {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.COINGECKO_API_KEY;
  }

  async getTopPerformers(
    type: 'gainers' | 'losers',
    limit: number = 20
  ): Promise<MarketData[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: type === 'gainers' ? 'price_change_percentage_24h_desc' : 'price_change_percentage_24h_asc',
          per_page: limit,
          page: 1,
          sparkline: false,
          ...(this.apiKey && { x_cg_demo_api_key: this.apiKey }),
        },
        timeout: 10000, // 10 second timeout
      });

      return response.data.map((coin: any) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change: coin.price_change_24h || 0,
        changePercent: coin.price_change_percentage_24h || 0,
        volume: coin.total_volume || 0,
        market: 'crypto' as const,
      }));
    } catch (error: any) {
      // Handle rate limiting (429) gracefully
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 30;
        console.warn(`CoinGecko rate limit hit. Retry after ${retryAfter} seconds. Consider adding API key.`);
      } else {
        console.error('CoinGecko API error:', error.message || error);
      }
      // Return empty array on error to prevent breaking the entire request
      return [];
    }
  }

  async getCoinData(coinId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/coins/${coinId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false,
          ...(this.apiKey && { x_cg_demo_api_key: this.apiKey }),
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching coin data for ${coinId}:`, error);
      throw error;
    }
  }
}

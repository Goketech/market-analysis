import { CoinGeckoProvider } from '../providers/coingecko.provider';
import { YahooFinanceProvider } from '../providers/yahoofinance.provider';
import { NGXProvider } from '../providers/ngx.provider';

export interface MarketFilters {
  market: string;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'ytd';
  country?: string;
  limit: number;
  type: 'gainers' | 'losers';
}

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

export class MarketService {
  private coinGeckoProvider: CoinGeckoProvider;
  private yahooFinanceProvider: YahooFinanceProvider;
  private ngxProvider: NGXProvider;

  constructor() {
    this.coinGeckoProvider = new CoinGeckoProvider();
    this.yahooFinanceProvider = new YahooFinanceProvider();
    this.ngxProvider = new NGXProvider();
  }

  async getTopPerformers(filters: MarketFilters): Promise<MarketData[]> {
    const results: MarketData[] = [];

    // Fetch data from multiple sources based on market filter
    if (filters.market === 'all' || filters.market === 'crypto') {
      const cryptoData = await this.coinGeckoProvider.getTopPerformers(
        filters.type,
        filters.limit
      );
      results.push(...cryptoData);
    }

    if (filters.market === 'all' || filters.market === 'us') {
      const stockData = await this.yahooFinanceProvider.getTopPerformers(
        filters.type,
        filters.limit
      );
      results.push(...stockData);
    }

    if (filters.market === 'all' || filters.market === 'ngx') {
      const ngxData = await this.ngxProvider.getTopPerformers(
        filters.type,
        filters.limit
      );
      results.push(...ngxData);
    }

    // Sort by change percentage
    results.sort((a, b) => {
      if (filters.type === 'gainers') {
        return b.changePercent - a.changePercent;
      } else {
        return a.changePercent - b.changePercent;
      }
    });

    // Apply limit
    return results.slice(0, filters.limit);
  }
}

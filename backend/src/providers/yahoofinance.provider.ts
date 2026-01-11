import axios from 'axios';
import { MarketData } from '../services/market.service';

// Yahoo Finance API via yfinance-node or direct API calls
// For now, using a simplified approach with mock data structure
// In production, integrate with actual Yahoo Finance API or yfinance-node library
export class YahooFinanceProvider {
  async getTopPerformers(
    type: 'gainers' | 'losers',
    limit: number = 20
  ): Promise<MarketData[]> {
    try {
      // Get popular US stocks
      const symbols = [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM',
        'V', 'JNJ', 'WMT', 'PG', 'MA', 'UNH', 'HD', 'DIS', 'PYPL', 'BAC',
        'NFLX', 'ADBE', 'CRM', 'NKE', 'INTC', 'CSCO', 'PFE', 'T', 'VZ', 'CMCSA'
      ];

      const results: MarketData[] = [];

      // Fetch data for each symbol
      // Note: In production, use yfinance-node or Yahoo Finance API
      // This is a placeholder implementation
      for (const symbol of symbols.slice(0, limit)) {
        try {
          // Placeholder: In production, replace with actual API call
          // const ticker = yfinance(symbol);
          // const info = await ticker.info();
          // const quote = await ticker.quote();
          
          // Mock data structure for development
          const info = {
            longName: `${symbol} Inc.`,
            regularMarketPrice: 100 + Math.random() * 200,
            regularMarketChange: (type === 'gainers' ? 1 : -1) * (Math.random() * 10 + 5),
            regularMarketChangePercent: (type === 'gainers' ? 1 : -1) * (Math.random() * 15 + 5),
            regularMarketVolume: Math.floor(Math.random() * 10000000),
          };

          if (info) {
            const changePercent = info.regularMarketChangePercent || 0;
            const shouldInclude = type === 'gainers' 
              ? changePercent > 0 
              : changePercent < 0;

            if (shouldInclude) {
              results.push({
                symbol: symbol,
                name: info.longName || symbol,
                price: info.regularMarketPrice || 0,
                change: info.regularMarketChange || 0,
                changePercent: changePercent,
                volume: info.regularMarketVolume || 0,
                market: 'us' as const,
                country: 'US',
              });
            }
          }
        } catch (error) {
          console.error(`Error fetching data for ${symbol}:`, error);
          // Continue with next symbol
        }
      }

      // Sort by change percentage
      results.sort((a, b) => {
        if (type === 'gainers') {
          return b.changePercent - a.changePercent;
        } else {
          return a.changePercent - b.changePercent;
        }
      });

      return results.slice(0, limit);
    } catch (error) {
      console.error('Yahoo Finance API error:', error);
      return [];
    }
  }

  async getStockData(symbol: string): Promise<any> {
    try {
      // Placeholder: In production, replace with actual API call
      // const ticker = yfinance(symbol);
      // const info = await ticker.info();
      // const quote = await ticker.quote();
      
      // Mock data for development
      return {
        info: {
          longName: `${symbol} Inc.`,
          regularMarketPrice: 100 + Math.random() * 200,
          regularMarketChange: Math.random() * 10 - 5,
          regularMarketChangePercent: Math.random() * 10 - 5,
          regularMarketVolume: Math.floor(Math.random() * 10000000),
          marketCap: Math.floor(Math.random() * 1000000000000),
          trailingPE: 15 + Math.random() * 30,
        },
        quote: {},
      };
    } catch (error) {
      console.error(`Error fetching stock data for ${symbol}:`, error);
      throw error;
    }
  }
}

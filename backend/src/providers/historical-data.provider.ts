import axios from 'axios';
import { YahooFinanceProvider } from './yahoofinance.provider';
import { CoinGeckoProvider } from './coingecko.provider';

export interface HistoricalPrice {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface HistoricalDataResult {
  symbol: string;
  market: 'us' | 'crypto' | 'ngx';
  prices: HistoricalPrice[];
  startDate: Date;
  endDate: Date;
}

export class HistoricalDataProvider {
  private yahooFinanceProvider: YahooFinanceProvider;
  private coinGeckoProvider: CoinGeckoProvider;
  private alphaVantageKey: string | undefined;
  private polygonKey: string | undefined;
  private coinGeckoApiKey: string | undefined;

  constructor() {
    this.yahooFinanceProvider = new YahooFinanceProvider();
    this.coinGeckoProvider = new CoinGeckoProvider();
    this.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    this.polygonKey = process.env.POLYGON_API_KEY;
    this.coinGeckoApiKey = process.env.COINGECKO_API_KEY;
  }

  /**
   * Get 5 years of historical data for a symbol
   */
  async getHistoricalData(
    symbol: string,
    market: 'us' | 'crypto' | 'ngx',
    years: number = 5
  ): Promise<HistoricalDataResult> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);

    try {
      if (market === 'crypto') {
        return await this.getCryptoHistoricalData(symbol, startDate, endDate);
      } else if (market === 'us') {
        return await this.getUSStockHistoricalData(symbol, startDate, endDate);
      } else {
        return await this.getNGXHistoricalData(symbol, startDate, endDate);
      }
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get US stock historical data
   */
  private async getUSStockHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalDataResult> {
    // Try Alpha Vantage first if available
    if (this.alphaVantageKey) {
      try {
        return await this.getAlphaVantageData(symbol, startDate, endDate);
      } catch (error) {
        console.warn('Alpha Vantage failed, trying alternative:', error);
      }
    }

    // Try Polygon.io if available
    if (this.polygonKey) {
      try {
        return await this.getPolygonData(symbol, startDate, endDate);
      } catch (error) {
        console.warn('Polygon.io failed, trying Yahoo Finance:', error);
      }
    }

    // Fallback to Yahoo Finance (free, but may have rate limits)
    return await this.getYahooFinanceHistoricalData(symbol, startDate, endDate);
  }

  /**
   * Get Alpha Vantage historical data
   */
  private async getAlphaVantageData(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalDataResult> {
    if (!this.alphaVantageKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    const response = await axios.get('https://www.alphavantage.co/query', {
      params: {
        function: 'TIME_SERIES_DAILY_ADJUSTED',
        symbol: symbol,
        outputsize: 'full',
        apikey: this.alphaVantageKey,
      },
      timeout: 10000,
    });

    if (response.data['Error Message'] || response.data['Note']) {
      throw new Error(response.data['Error Message'] || response.data['Note']);
    }

    const timeSeries = response.data['Time Series (Daily)'];
    if (!timeSeries) {
      throw new Error('No time series data returned');
    }

    const prices: HistoricalPrice[] = [];
    for (const [dateStr, data] of Object.entries(timeSeries as Record<string, any>)) {
      const date = new Date(dateStr);
      if (date >= startDate && date <= endDate) {
        prices.push({
          date,
          open: parseFloat(data['1. open']),
          high: parseFloat(data['2. high']),
          low: parseFloat(data['3. low']),
          close: parseFloat(data['4. close']),
          volume: parseInt(data['6. volume']),
        });
      }
    }

    prices.sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      symbol,
      market: 'us',
      prices,
      startDate,
      endDate,
    };
  }

  /**
   * Get Polygon.io historical data
   */
  private async getPolygonData(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalDataResult> {
    if (!this.polygonKey) {
      throw new Error('Polygon.io API key not configured');
    }

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const response = await axios.get(
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startStr}/${endStr}`,
      {
        params: {
          adjusted: true,
          sort: 'asc',
          limit: 50000,
          apikey: this.polygonKey,
        },
        timeout: 10000,
      }
    );

    if (response.data.status !== 'OK') {
      throw new Error(`Polygon.io error: ${response.data.status}`);
    }

    const prices: HistoricalPrice[] = (response.data.results || []).map((item: any) => ({
      date: new Date(item.t),
      open: item.o,
      high: item.h,
      low: item.l,
      close: item.c,
      volume: item.v,
    }));

    return {
      symbol,
      market: 'us',
      prices,
      startDate,
      endDate,
    };
  }

  /**
   * Get Yahoo Finance historical data (free, but limited)
   * Note: Yahoo Finance doesn't have an official free API
   * This would require yfinance-node or similar library
   */
  private async getYahooFinanceHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalDataResult> {
    // Yahoo Finance doesn't have a direct free API
    // In production, you would use yfinance-node or similar library
    // For now, return empty data (suppress warning since it's expected)
    
    // Return empty structure - this is expected when Yahoo Finance API is not available
    return {
      symbol,
      market: 'us',
      prices: [],
      startDate,
      endDate,
    };
  }

  /**
   * Get crypto historical data from CoinGecko
   */
  private async getCryptoHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalDataResult> {
    try {
      // CoinGecko uses coin IDs, not symbols
      // For now, we'll use the symbol directly (this may need mapping)
      const coinId = symbol.toLowerCase();
      
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);

      // Try the range endpoint first (works for up to ~90 days with free tier, longer with API key)
      try {
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart/range`,
          {
            params: {
              vs_currency: 'usd',
              from: startTimestamp,
              to: endTimestamp,
              ...(this.coinGeckoApiKey && { x_cg_demo_api_key: this.coinGeckoApiKey }),
            },
            timeout: 10000,
          }
        );

        if (response.data.prices && response.data.prices.length > 0) {
          const prices: HistoricalPrice[] = response.data.prices.map((item: [number, number]) => ({
            date: new Date(item[0]),
            open: item[1],
            high: item[1],
            low: item[1],
            close: item[1],
            volume: 0,
          }));

          return {
            symbol,
            market: 'crypto',
            prices,
            startDate,
            endDate,
          };
        }
      } catch (rangeError: any) {
        // If range endpoint fails (401, 429, or no data), try year-by-year aggregation
        if (rangeError.response?.status === 401 || rangeError.response?.status === 429 || rangeError.response?.status === 404) {
          // Silently try year-by-year aggregation (401 might be due to API limits, not key issues)
          return await this.getCryptoHistoricalDataByYear(coinId, startDate, endDate);
        }
        throw rangeError;
      }

      // Fallback to year-by-year if range endpoint returns empty
      return await this.getCryptoHistoricalDataByYear(coinId, startDate, endDate);
    } catch (error: any) {
      // Handle rate limiting gracefully
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || '60';
        console.warn(`CoinGecko rate limit exceeded for ${symbol}. Retry after ${retryAfter} seconds.`);
        throw new Error(`Rate limit exceeded. Please try again later.`);
      }
      // Handle 401 - might be API limits, not necessarily key issue
      if (error.response?.status === 401) {
        // Try year-by-year as fallback (401 might be due to endpoint restrictions)
        try {
          return await this.getCryptoHistoricalDataByYear(coinId, startDate, endDate);
        } catch (fallbackError) {
          // If fallback also fails, throw original error
          throw error;
        }
      }
      // Only log non-rate-limit errors
      if (error.response?.status !== 429 && error.response?.status !== 401) {
        console.warn(`Error fetching crypto historical data for ${symbol}:`, error.message || error);
      }
      throw error;
    }
  }

  /**
   * Fetch historical data year by year and aggregate (fallback method)
   */
  private async getCryptoHistoricalDataByYear(
    coinId: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalDataResult> {
    const allPrices: HistoricalPrice[] = [];
    const currentDate = new Date(endDate);
    
    // Fetch year by year (CoinGecko free tier allows ~90 days, API key allows more)
    while (currentDate > startDate) {
      const yearStart = new Date(currentDate);
      yearStart.setFullYear(yearStart.getFullYear() - 1);
      if (yearStart < startDate) {
        yearStart.setTime(startDate.getTime());
      }

      const yearStartTimestamp = Math.floor(yearStart.getTime() / 1000);
      const yearEndTimestamp = Math.floor(currentDate.getTime() / 1000);

      try {
        const response = await axios.get(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart/range`,
          {
            params: {
              vs_currency: 'usd',
              from: yearStartTimestamp,
              to: yearEndTimestamp,
              ...(this.coinGeckoApiKey && { x_cg_demo_api_key: this.coinGeckoApiKey }),
            },
            timeout: 10000,
          }
        );

        if (response.data.prices && response.data.prices.length > 0) {
          const yearPrices: HistoricalPrice[] = response.data.prices.map((item: [number, number]) => ({
            date: new Date(item[0]),
            open: item[1],
            high: item[1],
            low: item[1],
            close: item[1],
            volume: 0,
          }));
          allPrices.push(...yearPrices);
        }

        // Move to previous year
        currentDate.setTime(yearStart.getTime() - 1);
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        if (error.response?.status === 429) {
          throw new Error(`Rate limit exceeded. Please try again later.`);
        }
        // Continue with next year if this one fails
        currentDate.setTime(yearStart.getTime() - 1);
      }
    }

    if (allPrices.length === 0) {
      throw new Error(`No price data available for ${coinId}`);
    }

    // Sort by date and remove duplicates
    allPrices.sort((a, b) => a.date.getTime() - b.date.getTime());
    const uniquePrices = allPrices.filter((price, index, self) =>
      index === 0 || price.date.getTime() !== self[index - 1].date.getTime()
    );

    return {
      symbol: coinId,
      market: 'crypto',
      prices: uniquePrices,
      startDate,
      endDate,
    };
  }

  /**
   * Get NGX historical data
   */
  private async getNGXHistoricalData(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalDataResult> {
    // NGX historical data would require integration with NGX API
    // This is a placeholder - silently return empty data instead of warning
    // (warnings are expected for NGX stocks)
    
    return {
      symbol,
      market: 'ngx',
      prices: [],
      startDate,
      endDate,
    };
  }
}

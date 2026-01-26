import { HistoricalDataProvider, HistoricalPrice } from '../providers/historical-data.provider';
import { Pool } from 'pg';

export interface PerformanceMetrics {
  symbol: string;
  market: 'us' | 'crypto' | 'ngx';
  fiveYearReturn: number; // Percentage return over 5 years
  annualizedReturn: number; // Annualized return percentage
  volatility: number; // Standard deviation of returns
  sharpeRatio: number; // Risk-adjusted return (assuming risk-free rate of 2%)
  maxDrawdown: number; // Maximum peak-to-trough decline
  startPrice: number;
  endPrice: number;
  lastUpdated: Date;
}

export interface BestPerformersFilter {
  market?: 'us' | 'crypto' | 'ngx';
  limit?: number;
  sortBy?: 'returns' | 'volatility' | 'sharpe';
}

export class PerformanceService {
  private historicalProvider: HistoricalDataProvider;
  private db: Pool | null = null;

  constructor() {
    this.historicalProvider = new HistoricalDataProvider();

    // Initialize database connection if available
    try {
      this.db = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'market_intelligence',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      });
    } catch (error) {
      console.warn('Database not available, performance metrics will not be cached');
      this.db = null;
    }
  }

  /**
   * Calculate performance metrics for a symbol
   */
  async calculatePerformance(
    symbol: string,
    market: 'us' | 'crypto' | 'ngx',
    years: number = 5
  ): Promise<PerformanceMetrics> {
    // Check cache first
    if (this.db) {
      const cached = await this.getCachedPerformance(symbol);
      if (cached) {
        return cached;
      }
    }

    // Fetch historical data
    const historicalData = await this.historicalProvider.getHistoricalData(symbol, market, years);

    if (historicalData.prices.length === 0) {
      throw new Error(`No historical data available for ${symbol}`);
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(historicalData.prices, symbol, market);

    // Cache result
    if (this.db) {
      await this.cachePerformance(metrics);
    }

    return metrics;
  }

  /**
   * Calculate performance metrics from price data
   */
  private calculateMetrics(
    prices: HistoricalPrice[],
    symbol: string,
    market: 'us' | 'crypto' | 'ngx'
  ): PerformanceMetrics {
    if (prices.length < 2) {
      throw new Error('Insufficient data for performance calculation');
    }

    // Sort by date
    const sortedPrices = [...prices].sort((a, b) => a.date.getTime() - b.date.getTime());

    const startPrice = sortedPrices[0].close;
    const endPrice = sortedPrices[sortedPrices.length - 1].close;

    // Calculate returns
    const fiveYearReturn = ((endPrice - startPrice) / startPrice) * 100;
    const years = (sortedPrices[sortedPrices.length - 1].date.getTime() - sortedPrices[0].date.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const annualizedReturn = (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100;

    // Calculate daily returns
    const dailyReturns: number[] = [];
    for (let i = 1; i < sortedPrices.length; i++) {
      const dailyReturn = (sortedPrices[i].close - sortedPrices[i - 1].close) / sortedPrices[i - 1].close;
      dailyReturns.push(dailyReturn);
    }

    // Calculate volatility (annualized standard deviation)
    const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    const volatility = stdDev * Math.sqrt(252) * 100; // Annualized volatility

    // Calculate Sharpe ratio (assuming risk-free rate of 2%)
    const riskFreeRate = 0.02;
    const sharpeRatio = volatility > 0 
      ? ((annualizedReturn / 100 - riskFreeRate) / (volatility / 100))
      : 0;

    // Calculate maximum drawdown
    let maxDrawdown = 0;
    let peak = startPrice;
    for (const price of sortedPrices) {
      if (price.close > peak) {
        peak = price.close;
      }
      const drawdown = ((peak - price.close) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      symbol,
      market,
      fiveYearReturn,
      annualizedReturn,
      volatility,
      sharpeRatio,
      maxDrawdown,
      startPrice,
      endPrice,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get best performing stocks over 5 years
   */
  async getBestPerformers(filter: BestPerformersFilter = {}): Promise<PerformanceMetrics[]> {
    const { market, limit = 20, sortBy = 'returns' } = filter;

    // Get symbols to analyze
    const symbols = await this.getSymbolsToAnalyze(market);
    
    if (symbols.length === 0) {
      return [];
    }

    // Calculate performance for all symbols
    const performances: PerformanceMetrics[] = [];
    let successCount = 0;
    let rateLimitCount = 0;
    
    for (const symbol of symbols) {
      try {
        const marketType = market || this.detectMarket(symbol);
        const performance = await this.calculatePerformance(symbol, marketType);
        performances.push(performance);
        successCount++;
      } catch (error: any) {
        // Suppress expected errors (rate limits, missing data, API auth issues)
        const errorMessage = error?.message || String(error);
        if (errorMessage.includes('Rate limit')) {
          rateLimitCount++;
          // Silently skip rate limit errors
        } else if (
          errorMessage.includes('No historical data') ||
          errorMessage.includes('not implemented') ||
          errorMessage.includes('API authentication')
        ) {
          // Silently skip missing data and API auth errors (might be endpoint restrictions)
        } else {
          // Only log unexpected errors
          console.warn(`Failed to calculate performance for ${symbol}:`, errorMessage);
        }
        // Continue with next symbol
      }
    }

    // Log summary if many failures
    if (rateLimitCount > 0) {
      console.warn(`⚠️  ${rateLimitCount} symbols skipped due to rate limiting. Consider adding API keys or waiting before retry.`);
    }
    
    if (performances.length === 0 && symbols.length > 0) {
      console.warn(`⚠️  No performance data available for ${market || 'selected'} market. This may be due to rate limits or missing data sources.`);
    }

    // Sort by specified metric
    performances.sort((a, b) => {
      switch (sortBy) {
        case 'volatility':
          return a.volatility - b.volatility;
        case 'sharpe':
          return b.sharpeRatio - a.sharpeRatio;
        case 'returns':
        default:
          return b.annualizedReturn - a.annualizedReturn;
      }
    });

    return performances.slice(0, limit);
  }

  /**
   * Get symbols to analyze based on market filter
   */
  private async getSymbolsToAnalyze(market?: 'us' | 'crypto' | 'ngx'): Promise<string[]> {
    // In production, this would fetch from database or use a predefined list
    // For now, return common symbols
    if (market === 'crypto') {
      return ['bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana', 'polkadot', 'dogecoin', 'matic-network'];
    } else if (market === 'ngx') {
      return ['DANGOTE', 'MTN', 'GTB', 'ZENITH', 'ACCESS', 'UBA', 'FIRSTBANK', 'SEPLAT'];
    } else {
      // US stocks
      return [
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM',
        'V', 'JNJ', 'WMT', 'PG', 'MA', 'UNH', 'HD', 'DIS', 'PYPL', 'BAC',
        'NFLX', 'ADBE', 'CRM', 'NKE', 'INTC', 'CSCO', 'PFE', 'T', 'VZ', 'CMCSA',
        'XOM', 'CVX', 'COST', 'AVGO', 'PEP', 'TMO', 'ABT', 'DHR', 'ACN', 'NEE'
      ];
    }
  }

  /**
   * Detect market type from symbol
   */
  private detectMarket(symbol: string): 'us' | 'crypto' | 'ngx' {
    const cryptoKeywords = ['bitcoin', 'ethereum', 'binance', 'cardano', 'solana', 'polkadot', 'dogecoin', 'matic'];
    const lowerSymbol = symbol.toLowerCase();
    
    if (cryptoKeywords.some(keyword => lowerSymbol.includes(keyword))) {
      return 'crypto';
    }
    
    // NGX stocks are typically uppercase and short
    if (symbol.length <= 6 && symbol === symbol.toUpperCase() && !symbol.includes('.')) {
      // Could be NGX, but defaulting to US for now
      return 'us';
    }
    
    return 'us';
  }

  /**
   * Get cached performance from database
   */
  private async getCachedPerformance(symbol: string): Promise<PerformanceMetrics | null> {
    if (!this.db) return null;

    try {
      const result = await this.db.query(
        'SELECT * FROM stock_performance WHERE symbol = $1',
        [symbol.toUpperCase()]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        symbol: row.symbol,
        market: row.market,
        fiveYearReturn: parseFloat(row.five_year_return),
        annualizedReturn: parseFloat(row.annualized_return),
        volatility: parseFloat(row.volatility),
        sharpeRatio: parseFloat(row.sharpe_ratio),
        maxDrawdown: parseFloat(row.max_drawdown),
        startPrice: 0, // Not stored in DB
        endPrice: 0, // Not stored in DB
        lastUpdated: new Date(row.last_updated),
      };
    } catch (error: any) {
      // Suppress PostgreSQL connection errors (expected when DB is not running)
      if (error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')) {
        return null; // Silently return null - DB is optional
      }
      // Only log non-connection errors
      if (error?.message && !error.message.includes('ECONNREFUSED')) {
        console.warn('Error reading performance cache:', error.message);
      }
      return null;
    }
  }

  /**
   * Cache performance metrics in database
   */
  private async cachePerformance(metrics: PerformanceMetrics): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.query(
        `INSERT INTO stock_performance 
         (symbol, market, five_year_return, annualized_return, volatility, sharpe_ratio, max_drawdown, last_updated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (symbol) 
         DO UPDATE SET 
           market = EXCLUDED.market,
           five_year_return = EXCLUDED.five_year_return,
           annualized_return = EXCLUDED.annualized_return,
           volatility = EXCLUDED.volatility,
           sharpe_ratio = EXCLUDED.sharpe_ratio,
           max_drawdown = EXCLUDED.max_drawdown,
           last_updated = EXCLUDED.last_updated`,
        [
          metrics.symbol.toUpperCase(),
          metrics.market,
          metrics.fiveYearReturn,
          metrics.annualizedReturn,
          metrics.volatility,
          metrics.sharpeRatio,
          metrics.maxDrawdown,
          metrics.lastUpdated,
        ]
      );
    } catch (error) {
      console.error('Error caching performance:', error);
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.end();
    }
  }
}

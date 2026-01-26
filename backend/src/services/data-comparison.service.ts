import { YahooFinanceProvider } from '../providers/yahoofinance.provider';
import { CoinGeckoProvider } from '../providers/coingecko.provider';
import { HistoricalDataProvider } from '../providers/historical-data.provider';

export interface PriceComparison {
  symbol: string;
  providers: {
    name: string;
    price: number | null;
    timestamp: Date;
  }[];
  averagePrice: number;
  discrepancy: number; // Percentage difference between highest and lowest
  confidence: number; // 0-100, higher when providers agree
  flags: string[]; // Warnings if discrepancies are high
}

export interface DataQualityMetrics {
  symbol: string;
  priceConsistency: number; // 0-100
  dataFreshness: number; // 0-100 (based on how recent the data is)
  providerCount: number;
  overallConfidence: number; // 0-100
}

export class DataComparisonService {
  private yahooFinanceProvider: YahooFinanceProvider;
  private coinGeckoProvider: CoinGeckoProvider;
  private historicalProvider: HistoricalDataProvider;

  constructor() {
    this.yahooFinanceProvider = new YahooFinanceProvider();
    this.coinGeckoProvider = new CoinGeckoProvider();
    this.historicalProvider = new HistoricalDataProvider();
  }

  /**
   * Compare price data across multiple providers
   */
  async comparePrices(symbol: string, market: 'us' | 'crypto' | 'ngx'): Promise<PriceComparison> {
    const providers: PriceComparison['providers'] = [];
    const flags: string[] = [];

    // Fetch from multiple providers
    try {
      if (market === 'crypto') {
        const coinData = await this.coinGeckoProvider.getCoinData(symbol.toLowerCase());
        if (coinData?.market_data?.current_price?.usd) {
          providers.push({
            name: 'CoinGecko',
            price: coinData.market_data.current_price.usd,
            timestamp: new Date(),
          });
        }
      } else if (market === 'us') {
        const stockData = await this.yahooFinanceProvider.getStockData(symbol);
        if (stockData?.info?.regularMarketPrice) {
          providers.push({
            name: 'Yahoo Finance',
            price: stockData.info.regularMarketPrice,
            timestamp: new Date(),
          });
        }

        // Try Alpha Vantage if available
        try {
          const historical = await this.historicalProvider.getHistoricalData(symbol, 'us', 0.01); // Just get recent data
          if (historical.prices.length > 0) {
            const latestPrice = historical.prices[historical.prices.length - 1].close;
            providers.push({
              name: 'Alpha Vantage',
              price: latestPrice,
              timestamp: new Date(),
            });
          }
        } catch (error) {
          // Alpha Vantage not available or failed
        }
      }
    } catch (error) {
      console.error(`Error comparing prices for ${symbol}:`, error);
    }

    // Calculate metrics
    const validPrices = providers.filter(p => p.price !== null).map(p => p.price!);
    
    if (validPrices.length === 0) {
      return {
        symbol,
        providers,
        averagePrice: 0,
        discrepancy: 100,
        confidence: 0,
        flags: ['No price data available from any provider'],
      };
    }

    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);
    const averagePrice = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
    
    // Calculate discrepancy percentage
    const discrepancy = ((maxPrice - minPrice) / averagePrice) * 100;

    // Calculate confidence (inverse of discrepancy, capped at 100)
    const confidence = Math.max(0, 100 - discrepancy * 2);

    // Flag if discrepancy is too high
    if (discrepancy > 5) {
      flags.push(`High price discrepancy detected: ${discrepancy.toFixed(2)}%`);
    }
    if (validPrices.length < 2) {
      flags.push('Limited provider coverage - only one data source available');
    }

    return {
      symbol,
      providers,
      averagePrice,
      discrepancy,
      confidence,
      flags,
    };
  }

  /**
   * Get data quality metrics for a symbol
   */
  async getDataQuality(symbol: string, market: 'us' | 'crypto' | 'ngx'): Promise<DataQualityMetrics> {
    const priceComparison = await this.comparePrices(symbol, market);

    // Calculate data freshness (how recent the data is)
    const now = new Date();
    const maxAge = Math.max(...priceComparison.providers.map(p => 
      now.getTime() - p.timestamp.getTime()
    ));
    const freshnessScore = Math.max(0, 100 - (maxAge / (1000 * 60 * 60))); // Penalize by hour

    // Price consistency is the confidence score
    const priceConsistency = priceComparison.confidence;

    // Overall confidence is weighted average
    const overallConfidence = (priceConsistency * 0.7 + freshnessScore * 0.3);

    return {
      symbol,
      priceConsistency,
      dataFreshness: freshnessScore,
      providerCount: priceComparison.providers.length,
      overallConfidence,
    };
  }

  /**
   * Validate data across providers and return confidence score
   */
  async validateData(symbol: string, market: 'us' | 'crypto' | 'ngx'): Promise<{
    valid: boolean;
    confidence: number;
    warnings: string[];
    details: PriceComparison;
  }> {
    const comparison = await this.comparePrices(symbol, market);
    
    const valid = comparison.confidence >= 70 && comparison.discrepancy < 10;
    const warnings = [...comparison.flags];

    if (comparison.providers.length < 2) {
      warnings.push('Recommendation: Add more data providers for better validation');
    }

    return {
      valid,
      confidence: comparison.confidence,
      warnings,
      details: comparison,
    };
  }
}

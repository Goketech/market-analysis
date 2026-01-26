import { RSI, MACD } from 'technicalindicators';
import { AnalysisReport } from '../services/analysis.service';
import { AIService } from './ai.service';
import { SentimentService } from '../services/sentiment.service';
import { FilingsService } from '../services/filings.service';
import { PerformanceService } from '../services/performance.service';

export class AnalysisEngine {
  private aiService: AIService;
  private sentimentService: SentimentService;
  private filingsService: FilingsService;
  private performanceService: PerformanceService;

  constructor() {
    this.aiService = new AIService();
    this.sentimentService = new SentimentService();
    this.filingsService = new FilingsService();
    this.performanceService = new PerformanceService();
  }

  async generateReport(
    symbol: string,
    rawData: any,
    marketType: 'us' | 'crypto' | 'ngx'
  ): Promise<AnalysisReport> {
    // Extract price history (mock for now - in production, fetch historical data)
    const prices = this.extractPriceHistory(rawData);
    
    // Calculate technical indicators
    const technical = this.calculateTechnicalIndicators(prices);
    
    // Extract fundamental data
    const fundamental = await this.extractFundamentalData(rawData, marketType, symbol);
    
    // Calculate sentiment
    const sentiment = await this.calculateSentiment(symbol);
    
    // Get performance data (optional, for US stocks)
    let performance: { fiveYearReturn: number; annualizedReturn: number; volatility: number; sharpeRatio: number } | undefined;
    let filings: { latestRevenue?: number; latestNetIncome?: number; latestEPS?: number; latestDebt?: number } | undefined;
    
    if (marketType === 'us') {
      try {
        const perfData = await this.performanceService.calculatePerformance(symbol, 'us', 5);
        performance = {
          fiveYearReturn: perfData.fiveYearReturn,
          annualizedReturn: perfData.annualizedReturn,
          volatility: perfData.volatility,
          sharpeRatio: perfData.sharpeRatio,
        };
      } catch (error) {
        console.warn(`Failed to fetch performance data for ${symbol}:`, error);
      }

      try {
        const filingsData = await this.filingsService.getFilings(symbol, undefined, true, 1);
        const latestFiling = filingsData.latest10K || filingsData.latest10Q;
        if (latestFiling?.metrics) {
          filings = {
            latestRevenue: latestFiling.metrics.revenue,
            latestNetIncome: latestFiling.metrics.netIncome,
            latestEPS: latestFiling.metrics.earningsPerShare,
            latestDebt: latestFiling.metrics.totalDebt,
          };
        }
      } catch (error) {
        console.warn(`Failed to fetch filings data for ${symbol}:`, error);
      }
    }
    
    // Generate AI recommendation with enhanced data
    const recommendation = await this.aiService.generateRecommendation({
      symbol,
      technical,
      fundamental,
      sentiment,
      performance,
      filings,
    });

    return {
      symbol,
      name: rawData.name || symbol,
      market: marketType,
      technical,
      fundamental,
      sentiment,
      recommendation,
      timestamp: new Date().toISOString(),
    };
  }

  private extractPriceHistory(data: any): number[] {
    // Mock price history - in production, fetch from database or API
    const prices: number[] = [];
    const basePrice = data.current_price || data.regularMarketPrice || 100;
    
    for (let i = 0; i < 30; i++) {
      prices.push(basePrice * (1 + (Math.random() - 0.5) * 0.1));
    }
    
    return prices.reverse(); // Oldest to newest
  }

  private calculateTechnicalIndicators(prices: number[]): AnalysisReport['technical'] {
    // Calculate RSI
    const rsiValues = RSI.calculate({ values: prices, period: 14 });
    const rsi = rsiValues[rsiValues.length - 1] || 50;

    // Calculate MACD
    const macdInput = {
      values: prices,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    };
    const macdValues = MACD.calculate(macdInput);
    const lastMacd = macdValues[macdValues.length - 1];
    const macd = lastMacd ? {
      MACD: lastMacd.MACD || 0,
      signal: lastMacd.signal || 0,
      histogram: lastMacd.histogram || 0,
    } : {
      MACD: 0,
      signal: 0,
      histogram: 0,
    };

    // Calculate support and resistance (simplified)
    const support = Math.min(...prices) * 0.95;
    const resistance = Math.max(...prices) * 1.05;

    // Determine trend
    const trend = rsi > 70 ? 'bearish' : rsi < 30 ? 'bullish' : 'neutral';

    return {
      rsi,
      macd: {
        value: macd.MACD,
        signal: macd.signal,
        histogram: macd.histogram,
      },
      support,
      resistance,
      trend,
    };
  }

  private async extractFundamentalData(
    data: any,
    marketType: 'us' | 'crypto' | 'ngx',
    symbol: string
  ): Promise<AnalysisReport['fundamental']> {
    if (marketType === 'crypto') {
      return {
        marketCap: data.market_data?.market_cap?.usd,
        volume24h: data.market_data?.total_volume?.usd,
      };
    } else {
      // Base fundamental data from provider
      const fundamental: AnalysisReport['fundamental'] = {
        pe: data.trailingPE || data.forwardPE,
        marketCap: data.marketCap,
        volume24h: data.regularMarketVolume,
        debt: data.totalDebt,
      };

      // Enhance with SEC filings data for US stocks
      if (marketType === 'us') {
        try {
          const filings = await this.filingsService.getFilings(symbol, undefined, false, 1);
          
          // Use metrics from latest 10-K or 10-Q
          const latestFiling = filings.latest10K || filings.latest10Q;
          if (latestFiling?.metrics) {
            const metrics = latestFiling.metrics;
            
            // Override with SEC data if available
            if (metrics.revenue !== undefined) {
              // Revenue can be used to calculate P/S ratio if market cap is available
            }
            if (metrics.netIncome !== undefined) {
              // Net income can be used to calculate P/E if not available
              if (!fundamental.pe && fundamental.marketCap && metrics.sharesOutstanding) {
                const eps = metrics.earningsPerShare || (metrics.netIncome / metrics.sharesOutstanding);
                if (eps > 0) {
                  fundamental.pe = fundamental.marketCap / (eps * metrics.sharesOutstanding);
                }
              }
            }
            if (metrics.totalDebt !== undefined) {
              fundamental.debt = metrics.totalDebt;
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch SEC filings for ${symbol}:`, error);
          // Continue with base fundamental data
        }
      }

      return fundamental;
    }
  }

  private async calculateSentiment(symbol: string): Promise<AnalysisReport['sentiment']> {
    try {
      // Get real sentiment analysis from Twitter
      const sentimentResult = await this.sentimentService.getSentiment(symbol, false);
      
      // Map to AnalysisReport sentiment format
      const socialSentiment: 'positive' | 'negative' | 'neutral' =
        sentimentResult.weightedScore > 60 ? 'positive' 
        : sentimentResult.weightedScore < 40 ? 'negative' 
        : 'neutral';

      return {
        score: sentimentResult.weightedScore,
        newsCount: sentimentResult.sampleSize,
        socialSentiment,
      };
    } catch (error) {
      console.error(`Error calculating sentiment for ${symbol}:`, error);
      // Fallback to neutral sentiment if service fails
      return {
        score: 50,
        newsCount: 0,
        socialSentiment: 'neutral',
      };
    }
  }
}

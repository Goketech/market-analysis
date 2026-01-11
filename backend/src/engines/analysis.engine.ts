import { RSI, MACD } from 'technicalindicators';
import { AnalysisReport } from '../services/analysis.service';
import { AIService } from './ai.service';

export class AnalysisEngine {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
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
    const fundamental = this.extractFundamentalData(rawData, marketType);
    
    // Calculate sentiment (mock for now)
    const sentiment = await this.calculateSentiment(symbol);
    
    // Generate AI recommendation
    const recommendation = await this.aiService.generateRecommendation({
      symbol,
      technical,
      fundamental,
      sentiment,
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

  private extractFundamentalData(
    data: any,
    marketType: 'us' | 'crypto' | 'ngx'
  ): AnalysisReport['fundamental'] {
    if (marketType === 'crypto') {
      return {
        marketCap: data.market_data?.market_cap?.usd,
        volume24h: data.market_data?.total_volume?.usd,
      };
    } else {
      return {
        pe: data.trailingPE || data.forwardPE,
        marketCap: data.marketCap,
        volume24h: data.regularMarketVolume,
        debt: data.totalDebt,
      };
    }
  }

  private async calculateSentiment(_symbol: string): Promise<AnalysisReport['sentiment']> {
    // Mock sentiment calculation
    // In production, integrate with NewsAPI, Twitter API, etc.
    const score = Math.random() * 100;
    const newsCount = Math.floor(Math.random() * 50);
    const socialSentiment: 'positive' | 'negative' | 'neutral' =
      score > 60 ? 'positive' : score < 40 ? 'negative' : 'neutral';

    return {
      score,
      newsCount,
      socialSentiment,
    };
  }
}

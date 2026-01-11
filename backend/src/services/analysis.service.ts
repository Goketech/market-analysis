import { AnalysisEngine } from '../engines/analysis.engine';
import { CoinGeckoProvider } from '../providers/coingecko.provider';
import { YahooFinanceProvider } from '../providers/yahoofinance.provider';
import { NGXProvider } from '../providers/ngx.provider';

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

export class AnalysisService {
  private analysisEngine: AnalysisEngine;
  private coinGeckoProvider: CoinGeckoProvider;
  private yahooFinanceProvider: YahooFinanceProvider;
  private ngxProvider: NGXProvider;

  constructor() {
    this.analysisEngine = new AnalysisEngine();
    this.coinGeckoProvider = new CoinGeckoProvider();
    this.yahooFinanceProvider = new YahooFinanceProvider();
    this.ngxProvider = new NGXProvider();
  }

  async generateReport(symbol: string, market: string): Promise<AnalysisReport> {
    // Determine market type and fetch data
    let rawData: any;
    let marketType: 'us' | 'crypto' | 'ngx' = 'us';

    if (market === 'crypto' || symbol.includes('BTC') || symbol.includes('ETH')) {
      marketType = 'crypto';
      rawData = await this.coinGeckoProvider.getCoinData(symbol.toLowerCase());
    } else if (market === 'ngx') {
      marketType = 'ngx';
      rawData = await this.ngxProvider.getStockData(symbol);
    } else {
      marketType = 'us';
      rawData = await this.yahooFinanceProvider.getStockData(symbol);
    }

    // Generate comprehensive analysis
    const report = await this.analysisEngine.generateReport(symbol, rawData, marketType);

    return report;
  }
}

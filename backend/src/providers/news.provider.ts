import axios from 'axios';

export interface NewsArticle {
  title: string;
  description: string | null;
  content: string | null;
  source: string;
  publishedAt: Date;
  url: string;
}

export class NewsProvider {
  private apiKey: string | undefined;
  private baseUrl = 'https://newsapi.org/v2';

  constructor() {
    this.apiKey = process.env.NEWS_API_KEY;
    if (!this.apiKey) {
      console.warn('NEWS_API_KEY not set — news sentiment will use fallback mock data');
    }
  }

  /**
   * Search for news articles about a stock/crypto symbol
   */
  async searchArticles(symbol: string, maxResults: number = 20): Promise<NewsArticle[]> {
    if (!this.apiKey) {
      return this.getMockArticles(symbol);
    }

    try {
      // Build search query — use full company names for better results
      const query = this.buildQuery(symbol);

      const response = await axios.get(`${this.baseUrl}/everything`, {
        params: {
          q: query,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: Math.min(maxResults, 100),
          from: this.getDateFrom(7), // Last 7 days
          apiKey: this.apiKey,
        },
        timeout: 10000,
      });

      if (response.data?.articles) {
        return response.data.articles.map((a: any) => ({
          title: a.title || '',
          description: a.description || null,
          content: a.content || null,
          source: a.source?.name || 'Unknown',
          publishedAt: new Date(a.publishedAt),
          url: a.url,
        }));
      }

      return [];
    } catch (error: any) {
      if (error?.response?.status === 401) {
        console.error('NewsAPI: Invalid API key');
      } else if (error?.response?.status === 429) {
        console.warn('NewsAPI: Rate limit exceeded');
      } else {
        console.warn(`NewsAPI error for ${symbol}:`, error.message);
      }
      return this.getMockArticles(symbol);
    }
  }

  /**
   * Build an intelligent search query for the symbol
   */
  private buildQuery(symbol: string): string {
    // Known company name mappings
    const symbolMap: Record<string, string> = {
      AAPL: 'Apple stock',
      MSFT: 'Microsoft stock',
      GOOGL: 'Google Alphabet stock',
      AMZN: 'Amazon stock',
      META: 'Meta Facebook stock',
      TSLA: 'Tesla stock',
      NVDA: 'Nvidia stock',
      BTC: 'Bitcoin',
      ETH: 'Ethereum',
      bitcoin: 'Bitcoin',
      ethereum: 'Ethereum',
      JPM: 'JPMorgan stock',
      NFLX: 'Netflix stock',
    };

    const mapped = symbolMap[symbol.toUpperCase()];
    if (mapped) return mapped;

    // For crypto symbols
    if (symbol.length > 6 || symbol.toLowerCase().includes('coin')) {
      return `${symbol} cryptocurrency`;
    }

    return `${symbol} stock`;
  }

  private getDateFrom(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Mock articles for when API is unavailable
   */
  private getMockArticles(symbol: string): NewsArticle[] {
    return [
      {
        title: `${symbol} Market Analysis: Analysts Watch Key Levels`,
        description: `Investors are closely tracking ${symbol} as the stock approaches key technical levels amid mixed market sentiment.`,
        content: null,
        source: 'Market Watch',
        publishedAt: new Date(Date.now() - 3600000),
        url: '#',
      },
      {
        title: `${symbol} Outlook: Institutional Interest Remains Strong`,
        description: `Despite broader market volatility, institutional investors continue to show interest in ${symbol}.`,
        content: null,
        source: 'Financial Times',
        publishedAt: new Date(Date.now() - 7200000),
        url: '#',
      },
    ];
  }
}

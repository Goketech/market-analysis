import { TwitterProvider } from '../providers/twitter.provider';
import { SentimentEngine, SentimentAnalysisResult } from '../engines/sentiment.engine';
import Redis from 'ioredis';

export interface SentimentServiceResult extends SentimentAnalysisResult {
  symbol: string;
  cached: boolean;
  lastUpdated: Date;
}

export class SentimentService {
  private twitterProvider: TwitterProvider;
  private sentimentEngine: SentimentEngine;
  private redis: Redis | null = null;
  private cacheTTL: number;

  constructor() {
    this.twitterProvider = new TwitterProvider();
    this.sentimentEngine = new SentimentEngine();
    this.cacheTTL = parseInt(process.env.SENTIMENT_CACHE_TTL || '3600', 10); // Default 1 hour

    // Initialize Redis if available
    try {
      const { createRedisConnection } = require('../utils/redis.config');
      this.redis = createRedisConnection();
      // Error handling is already done in createRedisConnection
      if (this.redis) {
        this.redis.on('connect', () => {
          console.log('✅ Redis connected for sentiment caching');
        });
      }
    } catch (error) {
      console.warn('Redis not available, sentiment caching disabled');
      this.redis = null;
    }
  }

  /**
   * Get sentiment analysis for a symbol
   */
  async getSentiment(symbol: string, forceRefresh: boolean = false): Promise<SentimentServiceResult> {
    const cacheKey = `sentiment:${symbol.toUpperCase()}`;

    // Check cache first
    if (!forceRefresh && this.redis) {
      const cached = await this.getCachedSentiment(cacheKey);
      if (cached) {
        return {
          ...cached,
          symbol: symbol.toUpperCase(), // Ensure symbol is included
          cached: true,
          lastUpdated: new Date(cached.lastUpdated),
        };
      }
    }

    // Fetch fresh data
    const sampleSize = parseInt(process.env.SENTIMENT_SAMPLE_SIZE || '100', 10);
    const tweets = await this.twitterProvider.searchTweetsBySymbol(symbol, sampleSize);

    // Analyze sentiment
    const analysis = this.sentimentEngine.analyzeTweets(tweets);

    // Create result
    const result: SentimentServiceResult = {
      ...analysis,
      symbol: symbol.toUpperCase(),
      cached: false,
      lastUpdated: new Date(),
    };

    // Cache result
    if (this.redis) {
      await this.cacheSentiment(cacheKey, result);
    }

    return result;
  }

  /**
   * Get cached sentiment from Redis
   */
  private async getCachedSentiment(cacheKey: string): Promise<SentimentAnalysisResult & { lastUpdated: string } | null> {
    if (!this.redis) return null;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error: any) {
      // Only log if it's not a connection error (expected when Redis is down)
      if (error?.message && !error.message.includes('Connection is closed') && !error.message.includes('ECONNREFUSED')) {
        console.error('Error reading from cache:', error.message);
      }
    }

    return null;
  }

  /**
   * Cache sentiment result in Redis
   */
  private async cacheSentiment(cacheKey: string, result: SentimentServiceResult): Promise<void> {
    if (!this.redis) return;

    try {
      const cacheData = {
        ...result,
        lastUpdated: result.lastUpdated.toISOString(),
      };
      await this.redis.setex(
        cacheKey,
        this.cacheTTL,
        JSON.stringify(cacheData)
      );
    } catch (error: any) {
      // Only log if it's not a connection error (expected when Redis is down)
      if (error?.message && !error.message.includes('Connection is closed') && !error.message.includes('ECONNREFUSED')) {
        console.error('Error caching sentiment:', error.message);
      }
    }
  }

  /**
   * Get sentiment for multiple symbols in batch
   */
  async getBatchSentiment(symbols: string[]): Promise<SentimentServiceResult[]> {
    const results = await Promise.all(
      symbols.map(symbol => this.getSentiment(symbol))
    );
    return results;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

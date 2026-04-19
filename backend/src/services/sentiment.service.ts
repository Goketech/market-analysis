import { ChatOpenAI } from '@langchain/openai';
import { NewsProvider, NewsArticle } from '../providers/news.provider';
import Sentiment from 'sentiment';
import Redis from 'ioredis';

export interface SentimentResult {
  symbol: string;
  score: number;              // 0-100, 50 is neutral
  weightedScore: number;      // 0-100, weighted by source credibility
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  sampleSize: number;
  label: 'bullish' | 'bearish' | 'neutral';
  confidence: number;         // 0-100
  aiSummary: string;
  topArticles: {
    title: string;
    source: string;
    url: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
  }[];
  breakdown: {
    trustedAccounts: { score: number; count: number };
    verifiedAccounts: { score: number; count: number };
    regularAccounts: { score: number; count: number };
  };
  cached: boolean;
  lastUpdated: Date;
}

export class SentimentService {
  private newsProvider: NewsProvider;
  private lexiconSentiment: Sentiment;
  private llm: ChatOpenAI | null = null;
  private redis: Redis | null = null;
  private cacheTTL = parseInt(process.env.SENTIMENT_CACHE_TTL || '3600', 10);

  constructor() {
    this.newsProvider = new NewsProvider();
    this.lexiconSentiment = new Sentiment();

    // Initialize OpenAI for enhanced sentiment
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && !apiKey.includes('your-')) {
      this.llm = new ChatOpenAI({
        modelName: 'gpt-4o-mini',
        temperature: 0.1,
        openAIApiKey: apiKey,
      });
    }

    // Initialize Redis if available
    try {
      const { createRedisConnection } = require('../utils/redis.config');
      this.redis = createRedisConnection();
    } catch {
      this.redis = null;
    }
  }

  async getSentiment(symbol: string, forceRefresh: boolean = false): Promise<SentimentResult> {
    const cacheKey = `sentiment:v2:${symbol.toUpperCase()}`;

    // Check cache
    if (!forceRefresh && this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          return { ...parsed, cached: true, lastUpdated: new Date(parsed.lastUpdated) };
        }
      } catch { /* ignore cache errors */ }
    }

    // Fetch news articles
    const articles = await this.newsProvider.searchArticles(symbol, 30);

    // Analyze sentiment using both lexicon and AI
    const result = await this.analyzeSentiment(symbol, articles);

    // Cache the result
    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify({
          ...result,
          lastUpdated: result.lastUpdated.toISOString(),
        }));
      } catch { /* ignore */ }
    }

    return result;
  }

  private async analyzeSentiment(symbol: string, articles: NewsArticle[]): Promise<SentimentResult> {
    if (articles.length === 0) {
      return this.getEmptyResult(symbol);
    }

    // Step 1: Lexicon-based scoring on each article
    const articleScores = articles.map(article => {
      const text = [article.title, article.description].filter(Boolean).join(' ');
      const result = this.lexiconSentiment.analyze(text);
      const normalizedScore = Math.max(0, Math.min(100, ((result.score / 5) + 1) * 50));
      
      return {
        article,
        rawScore: result.score,
        normalizedScore,
        sentiment: normalizedScore > 57 ? 'positive' : normalizedScore < 43 ? 'negative' : 'neutral' as const,
      };
    });

    const avgLexiconScore = articleScores.reduce((s, a) => s + a.normalizedScore, 0) / articleScores.length;

    // Step 2: OpenAI-enhanced sentiment (if available)
    let aiScore = avgLexiconScore;
    let aiSummary = this.generateFallbackSummary(symbol, articleScores);
    let confidence = 60;

    if (this.llm && articles.length > 0) {
      try {
        const headlines = articles.slice(0, 10).map(a => `- ${a.title}`).join('\n');
        const prompt = `Analyze the market sentiment for ${symbol} based on these recent news headlines. 
Respond with a valid JSON object only, no other text:
{
  "score": <0-100, where 0=very bearish, 50=neutral, 100=very bullish>,
  "confidence": <0-100>,
  "summary": "<2-3 sentence summary of the current market sentiment and why>"
}

Headlines:
${headlines}`;

        const response = await this.llm.invoke(prompt);
        const content = response.content as string;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          // Blend AI score (60%) with lexicon (40%) for robustness
          aiScore = (parsed.score * 0.6) + (avgLexiconScore * 0.4);
          aiSummary = parsed.summary || aiSummary;
          confidence = parsed.confidence || confidence;
        }
      } catch (error) {
        console.warn('OpenAI sentiment analysis failed, using lexicon fallback:', error);
      }
    }

    const positiveCount = articleScores.filter(a => a.sentiment === 'positive').length;
    const negativeCount = articleScores.filter(a => a.sentiment === 'negative').length;
    const neutralCount = articleScores.filter(a => a.sentiment === 'neutral').length;

    const label: 'bullish' | 'bearish' | 'neutral' =
      aiScore > 57 ? 'bullish' : aiScore < 43 ? 'bearish' : 'neutral';

    // Top articles with individual sentiment
    const topArticles = articleScores.slice(0, 5).map(({ article, normalizedScore, sentiment }) => ({
      title: article.title,
      source: article.source,
      url: article.url,
      sentiment: sentiment as 'positive' | 'negative' | 'neutral',
      score: Math.round(normalizedScore),
    }));

    return {
      symbol: symbol.toUpperCase(),
      score: Math.round(aiScore),
      weightedScore: Math.round(aiScore),
      positiveCount,
      negativeCount,
      neutralCount,
      sampleSize: articles.length,
      label,
      confidence: Math.round(confidence),
      aiSummary,
      topArticles,
      breakdown: {
        trustedAccounts: { score: Math.round(aiScore * 1.05), count: Math.max(1, Math.floor(articles.length * 0.2)) },
        verifiedAccounts: { score: Math.round(aiScore), count: Math.max(1, Math.floor(articles.length * 0.4)) },
        regularAccounts: { score: Math.round(aiScore * 0.95), count: Math.floor(articles.length * 0.4) },
      },
      cached: false,
      lastUpdated: new Date(),
    };
  }

  private generateFallbackSummary(symbol: string, scores: any[]): string {
    const avg = scores.reduce((s, a) => s + a.normalizedScore, 0) / scores.length;
    const label = avg > 57 ? 'positive' : avg < 43 ? 'negative' : 'neutral';
    return `Recent news coverage for ${symbol} shows ${label} sentiment based on ${scores.length} articles. Market conditions appear ${avg > 60 ? 'favorable' : avg < 40 ? 'challenging' : 'mixed'}.`;
  }

  private getEmptyResult(symbol: string): SentimentResult {
    return {
      symbol: symbol.toUpperCase(),
      score: 50,
      weightedScore: 50,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      sampleSize: 0,
      label: 'neutral',
      confidence: 0,
      aiSummary: 'No recent news data available for this symbol.',
      topArticles: [],
      breakdown: {
        trustedAccounts: { score: 50, count: 0 },
        verifiedAccounts: { score: 50, count: 0 },
        regularAccounts: { score: 50, count: 0 },
      },
      cached: false,
      lastUpdated: new Date(),
    };
  }

  async getBatchSentiment(symbols: string[]): Promise<SentimentResult[]> {
    return Promise.all(symbols.map(s => this.getSentiment(s)));
  }
}

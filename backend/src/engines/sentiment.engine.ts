import Sentiment from 'sentiment';
import { Tweet } from '../providers/twitter.provider';
import { TRUSTED_FINANCE_ACCOUNTS, FINANCE_KEYWORDS } from '../config/finance-accounts.config';

export interface SentimentAnalysisResult {
  score: number; // Overall sentiment score (0-100, 50 is neutral)
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  weightedScore: number; // Weighted sentiment score
  sampleSize: number;
  breakdown: {
    trustedAccounts: {
      score: number;
      count: number;
    };
    verifiedAccounts: {
      score: number;
      count: number;
    };
    regularAccounts: {
      score: number;
      count: number;
    };
  };
  topTweets: {
    mostPositive: Tweet | null;
    mostNegative: Tweet | null;
  };
}

export class SentimentEngine {
  private sentiment: Sentiment;

  constructor() {
    this.sentiment = new Sentiment();
  }

  /**
   * Analyze sentiment from a collection of tweets
   */
  analyzeTweets(tweets: Tweet[]): SentimentAnalysisResult {
    if (tweets.length === 0) {
      return this.getEmptyResult();
    }

    const trustedTweets: Tweet[] = [];
    const verifiedTweets: Tweet[] = [];
    const regularTweets: Tweet[] = [];

    // Categorize tweets by account type
    for (const tweet of tweets) {
      if (this.isTrustedAccount(tweet.author.username)) {
        trustedTweets.push(tweet);
      } else if (tweet.author.verified || this.isFinanceAccount(tweet.author.bio || '')) {
        verifiedTweets.push(tweet);
      } else {
        regularTweets.push(tweet);
      }
    }

    // Analyze each category
    const trustedAnalysis = this.analyzeTweetCategory(trustedTweets, 2.0);
    const verifiedAnalysis = this.analyzeTweetCategory(verifiedTweets, 1.5);
    const regularAnalysis = this.analyzeTweetCategory(regularTweets, 1.0);

    // Calculate weighted overall score
    const totalWeightedScore = 
      trustedAnalysis.weightedScore + 
      verifiedAnalysis.weightedScore + 
      regularAnalysis.weightedScore;
    
    const totalWeight = 
      (trustedTweets.length * 2.0) + 
      (verifiedTweets.length * 1.5) + 
      (regularTweets.length * 1.0);

    // Calculate unweighted score
    const allScores = [
      ...trustedAnalysis.scores,
      ...verifiedAnalysis.scores,
      ...regularAnalysis.scores,
    ];
    // VADER scores are -1 to 1, convert to 0-100 scale
    const averageScore = allScores.length > 0
      ? ((allScores.reduce((a, b) => a + b, 0) / allScores.length) + 1) * 50
      : 50;

    // Count sentiment categories (VADER scores are -1 to 1)
    const positiveCount = allScores.filter(s => s > 0.05).length;
    const negativeCount = allScores.filter(s => s < -0.05).length;
    const neutralCount = allScores.length - positiveCount - negativeCount;
    
    // Convert weighted score to 0-100 scale (VADER scores are -1 to 1)
    const averageWeightedScore = totalWeight > 0 
      ? totalWeightedScore / totalWeight
      : 0;
    const weightedScoreNormalized = (averageWeightedScore + 1) * 50;

    // Find top tweets
    const topTweets = this.findTopTweets(tweets, allScores);

    return {
      score: averageScore,
      positiveCount,
      negativeCount,
      neutralCount,
      weightedScore: weightedScoreNormalized,
      sampleSize: tweets.length,
      breakdown: {
        trustedAccounts: {
          score: (trustedAnalysis.averageScore + 1) * 50,
          count: trustedTweets.length,
        },
        verifiedAccounts: {
          score: (verifiedAnalysis.averageScore + 1) * 50,
          count: verifiedTweets.length,
        },
        regularAccounts: {
          score: (regularAnalysis.averageScore + 1) * 50,
          count: regularTweets.length,
        },
      },
      topTweets,
    };
  }

  /**
   * Analyze a category of tweets with a specific weight
   */
  private analyzeTweetCategory(tweets: Tweet[], weight: number): {
    scores: number[];
    averageScore: number;
    weightedScore: number;
  } {
    if (tweets.length === 0) {
      return { scores: [], averageScore: 0, weightedScore: 0 };
    }

    const scores: number[] = [];
    for (const tweet of tweets) {
      const result = this.sentiment.analyze(tweet.text);
      // sentiment package returns score from -5 to 5, normalize to -1 to 1 range
      const normalizedScore = Math.max(-1, Math.min(1, result.score / 5));
      scores.push(normalizedScore);
    }

    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const weightedScore = averageScore * weight * tweets.length;

    return { scores, averageScore, weightedScore };
  }

  /**
   * Check if username is in trusted accounts list
   */
  private isTrustedAccount(username: string): boolean {
    return TRUSTED_FINANCE_ACCOUNTS.some(
      account => account.toLowerCase() === username.toLowerCase()
    );
  }

  /**
   * Check if bio contains finance keywords
   */
  private isFinanceAccount(bio: string): boolean {
    const lowerBio = bio.toLowerCase();
    return FINANCE_KEYWORDS.some(keyword => 
      lowerBio.includes(keyword.toLowerCase())
    );
  }

  /**
   * Find most positive and negative tweets
   */
  private findTopTweets(tweets: Tweet[], scores: number[]): {
    mostPositive: Tweet | null;
    mostNegative: Tweet | null;
  } {
    if (tweets.length === 0 || scores.length === 0) {
      return { mostPositive: null, mostNegative: null };
    }

    let maxPositiveIndex = -1;
    let maxNegativeIndex = -1;
    let maxPositive = -Infinity;
    let maxNegative = Infinity;

    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > maxPositive) {
        maxPositive = scores[i];
        maxPositiveIndex = i;
      }
      if (scores[i] < maxNegative) {
        maxNegative = scores[i];
        maxNegativeIndex = i;
      }
    }

    return {
      mostPositive: maxPositiveIndex >= 0 ? tweets[maxPositiveIndex] : null,
      mostNegative: maxNegativeIndex >= 0 ? tweets[maxNegativeIndex] : null,
    };
  }

  /**
   * Get empty result structure
   */
  private getEmptyResult(): SentimentAnalysisResult {
    return {
      score: 50,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      weightedScore: 50,
      sampleSize: 0,
      breakdown: {
        trustedAccounts: { score: 50, count: 0 },
        verifiedAccounts: { score: 50, count: 0 },
        regularAccounts: { score: 50, count: 0 },
      },
      topTweets: {
        mostPositive: null,
        mostNegative: null,
      },
    };
  }
}

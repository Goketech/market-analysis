import { TwitterApi, TwitterApiReadOnly } from 'twitter-api-v2';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface Tweet {
  id: string;
  text: string;
  author: {
    username: string;
    name: string;
    verified: boolean;
    followersCount?: number;
    bio?: string;
  };
  createdAt: Date;
  retweetCount: number;
  likeCount: number;
  replyCount: number;
}

export class TwitterProvider {
  private twitterClient: TwitterApiReadOnly | null = null;
  private bearerToken: string | undefined;
  private apiKey: string | undefined;
  private apiSecret: string | undefined;
  private useScraperFallback: boolean = false;

  constructor() {
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN;
    this.apiKey = process.env.TWITTER_API_KEY;
    this.apiSecret = process.env.TWITTER_API_SECRET;

    // Initialize Twitter API client if credentials are available
    if (this.bearerToken) {
      try {
        const client = new TwitterApi(this.bearerToken);
        this.twitterClient = client.readOnly;
      } catch (error) {
        console.warn('Failed to initialize Twitter API client, will use scraper fallback');
        this.useScraperFallback = true;
      }
    } else {
      console.log('Twitter API credentials not found, using scraper fallback');
      this.useScraperFallback = true;
    }
  }

  /**
   * Search for tweets mentioning a stock symbol (cashtag search)
   * @param symbol Stock symbol (e.g., 'AAPL', 'GOOGL')
   * @param maxResults Maximum number of tweets to fetch (default: 100)
   * @returns Array of tweets
   */
  async searchTweetsBySymbol(symbol: string, maxResults: number = 100): Promise<Tweet[]> {
    try {
      // Try Twitter API first if available
      if (this.twitterClient && !this.useScraperFallback) {
        return await this.searchTweetsViaAPI(symbol, maxResults);
      } else {
        // Fallback to scraper
        return await this.searchTweetsViaScraper(symbol, maxResults);
      }
    } catch (error: any) {
      console.error(`Error searching tweets for ${symbol}:`, error.message);
      
      // If API fails and we haven't tried scraper, try scraper
      if (!this.useScraperFallback && this.twitterClient) {
        console.log('Falling back to scraper method');
        return await this.searchTweetsViaScraper(symbol, maxResults);
      }
      
      // Return empty array if all methods fail
      return [];
    }
  }

  /**
   * Search tweets using Twitter API v2
   */
  private async searchTweetsViaAPI(symbol: string, maxResults: number): Promise<Tweet[]> {
    if (!this.twitterClient) {
      throw new Error('Twitter API client not initialized');
    }

    const cashtag = `$${symbol.toUpperCase()}`;
    const tweets: Tweet[] = [];

    try {
      // Search for tweets with cashtag
      const searchResults = await this.twitterClient.v2.search({
        q: cashtag,
        max_results: Math.min(maxResults, 100), // API limit is 100 per request
        'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
        'user.fields': ['username', 'name', 'verified', 'public_metrics', 'description'],
        expansions: ['author_id'],
      });

      // Map results to Tweet interface
      if (searchResults.data?.data) {
        const users = searchResults.data.includes?.users || [];
        const userMap = new Map(users.map(u => [u.id, u]));

        for (const tweet of searchResults.data.data) {
          const author = userMap.get(tweet.author_id || '');
          if (author) {
            tweets.push({
              id: tweet.id,
              text: tweet.text || '',
              author: {
                username: author.username || '',
                name: author.name || '',
                verified: author.verified || false,
                followersCount: author.public_metrics?.followers_count,
                bio: author.description,
              },
              createdAt: new Date(tweet.created_at || new Date()),
              retweetCount: tweet.public_metrics?.retweet_count || 0,
              likeCount: tweet.public_metrics?.like_count || 0,
              replyCount: tweet.public_metrics?.reply_count || 0,
            });
          }
        }
      }
    } catch (error: any) {
      if (error.code === 429) {
        console.warn('Twitter API rate limit exceeded');
        throw new Error('Rate limit exceeded');
      }
      throw error;
    }

    return tweets;
  }

  /**
   * Search tweets using web scraping (fallback method)
   * Note: This is a simplified implementation. In production, you might want to use
   * a more robust scraper or consider using nitter instances for better reliability
   */
  private async searchTweetsViaScraper(symbol: string, maxResults: number): Promise<Tweet[]> {
    const cashtag = `$${symbol.toUpperCase()}`;
    const tweets: Tweet[] = [];

    try {
      // Note: Direct Twitter scraping is complex and may violate Twitter's Terms of Service
      // Twitter actively blocks scraping attempts
      // 
      // Options for production:
      // 1. Use Twitter API v2 (requires API credentials) - RECOMMENDED
      // 2. Use Nitter instances (public Twitter frontends) - may be unreliable
      // 3. Use third-party services like RapidAPI Twitter endpoints
      // 4. Use RSS feeds from Twitter (limited functionality)
      //
      // For development/testing, we can use mock data or return empty array
      
      // Try to use Nitter as a fallback (if available)
      const nitterInstances = [
        'https://nitter.net',
        'https://nitter.it',
        'https://nitter.pussthecat.org',
      ];

      for (const instance of nitterInstances) {
        try {
          // Nitter search endpoint format
          const searchUrl = `${instance}/search?f=tweets&q=${encodeURIComponent(cashtag)}`;
          const response = await axios.get(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 5000,
          });

          // Parse HTML response (simplified - would need proper HTML parsing)
          // For now, if we get a response, we know the instance is available
          // but parsing would require cheerio or similar
          if (response.status === 200) {
            console.log(`Nitter instance ${instance} is available, but parsing not implemented`);
            // TODO: Implement HTML parsing with cheerio to extract tweets
            // For now, return empty array
            return [];
          }
        } catch (error: any) {
          // Instance not available, try next one
          continue;
        }
      }

      // If all Nitter instances fail, return empty array
      // This is expected behavior when Twitter API credentials are not provided
      return [];
    } catch (error: any) {
      // Silently return empty array - this is expected when scraper is not available
      return [];
    }
  }

  /**
   * Get tweets from a specific user
   */
  async getUserTweets(username: string, maxResults: number = 50): Promise<Tweet[]> {
    if (!this.twitterClient) {
      return [];
    }

    try {
      const user = await this.twitterClient.v2.userByUsername(username);
      if (!user.data?.id) {
        return [];
      }

      const timeline = await this.twitterClient.v2.userTimeline(user.data.id, {
        max_results: Math.min(maxResults, 100),
        'tweet.fields': ['created_at', 'public_metrics'],
        'user.fields': ['username', 'name', 'verified'],
        expansions: ['author_id'],
      });

      const tweets: Tweet[] = [];
      if (timeline.data?.data) {
        for (const tweet of timeline.data.data) {
          tweets.push({
            id: tweet.id,
            text: tweet.text || '',
            author: {
              username: username,
              name: username,
              verified: false,
            },
            createdAt: new Date(tweet.created_at || new Date()),
            retweetCount: tweet.public_metrics?.retweet_count || 0,
            likeCount: tweet.public_metrics?.like_count || 0,
            replyCount: tweet.public_metrics?.reply_count || 0,
          });
        }
      }

      return tweets;
    } catch (error) {
      console.error(`Error fetching tweets for user ${username}:`, error);
      return [];
    }
  }
}

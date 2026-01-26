import { Worker, Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { SentimentService } from '../services/sentiment.service';

interface SentimentUpdateJob {
  symbol: string;
  forceRefresh?: boolean;
}

export class SentimentUpdateWorker {
  private worker: Worker;
  private queue: Queue;
  private sentimentService: SentimentService;
  private redis: Redis;

  constructor() {
    const { createRedisConnection, getBullMQConnectionOptions, suppressBullMQErrors } = require('../utils/redis.config');
    this.redis = createRedisConnection();
    // Error handling is already done in createRedisConnection
    
    this.sentimentService = new SentimentService();

    // BullMQ needs connection options
    const connectionOptions = getBullMQConnectionOptions();

    // Create queue for scheduling jobs
    this.queue = new Queue('sentiment-update', {
      connection: connectionOptions,
    });
    
    // Suppress connection errors from BullMQ
    suppressBullMQErrors(this.queue);

    this.worker = new Worker(
      'sentiment-update',
      async (job: Job<SentimentUpdateJob>) => {
        const { symbol, forceRefresh = false } = job.data;
        
        console.log(`Processing sentiment update for ${symbol}`);
        
        try {
          await this.sentimentService.getSentiment(symbol, forceRefresh);
          console.log(`✅ Sentiment updated for ${symbol}`);
        } catch (error) {
          console.error(`❌ Failed to update sentiment for ${symbol}:`, error);
          throw error;
        }
      },
      {
        connection: connectionOptions,
        concurrency: 5, // Process up to 5 jobs concurrently
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
          count: 1000, // Keep last 1000 failed jobs for debugging
        },
      }
    );
    
    // Suppress connection errors from BullMQ
    suppressBullMQErrors(this.worker);

    this.worker.on('completed', (job) => {
      console.log(`Sentiment update job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Sentiment update job ${job?.id} failed:`, err);
    });
  }

  /**
   * Schedule periodic sentiment updates for tracked symbols
   */
  async scheduleUpdates(symbols: string[], intervalHours: number = 6): Promise<void> {
    
    for (const symbol of symbols) {
      // Add recurring job (runs every intervalHours)
      await this.queue.add(
        `sentiment-${symbol}`,
        { symbol },
        {
          repeat: {
            every: intervalHours * 60 * 60 * 1000, // Convert hours to milliseconds
          },
          jobId: `sentiment-${symbol}`, // Unique job ID
        }
      );
    }

    console.log(`Scheduled sentiment updates for ${symbols.length} symbols`);
  }

  /**
   * Close worker and cleanup
   */
  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.redis.quit();
    await this.sentimentService.close();
  }
}

// Start worker if run directly
if (require.main === module) {
  const worker = new SentimentUpdateWorker();
  console.log('✅ Sentiment update worker started');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down sentiment worker...');
    await worker.close();
    process.exit(0);
  });
}

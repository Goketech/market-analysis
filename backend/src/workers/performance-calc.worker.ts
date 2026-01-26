import { Worker, Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { PerformanceService } from '../services/performance.service';

interface PerformanceCalcJob {
  symbol: string;
  market: 'us' | 'crypto' | 'ngx';
  years?: number;
}

export class PerformanceCalcWorker {
  private worker: Worker;
  private queue: Queue;
  private performanceService: PerformanceService;
  private redis: Redis;

  constructor() {
    const { createRedisConnection, getBullMQConnectionOptions, suppressBullMQErrors } = require('../utils/redis.config');
    this.redis = createRedisConnection();
    // Error handling is already done in createRedisConnection
    
    this.performanceService = new PerformanceService();

    // BullMQ needs connection options
    const connectionOptions = getBullMQConnectionOptions();

    // Create queue for scheduling jobs
    this.queue = new Queue('performance-calc', {
      connection: connectionOptions,
    });
    
    // Suppress connection errors from BullMQ
    suppressBullMQErrors(this.queue);

    this.worker = new Worker(
      'performance-calc',
      async (job: Job<PerformanceCalcJob>) => {
        const { symbol, market, years = 5 } = job.data;
        
        console.log(`Calculating performance for ${symbol} (${market})`);
        
        try {
          await this.performanceService.calculatePerformance(symbol, market, years);
          console.log(`✅ Performance calculated for ${symbol}`);
        } catch (error) {
          console.error(`❌ Failed to calculate performance for ${symbol}:`, error);
          throw error;
        }
      },
      {
        connection: connectionOptions,
        concurrency: 3, // Process up to 3 jobs concurrently (historical data can be slow)
        removeOnComplete: {
          count: 100,
        },
        removeOnFail: {
          count: 1000,
        },
      }
    );
    
    // Suppress connection errors from BullMQ
    suppressBullMQErrors(this.worker);

    this.worker.on('completed', (job) => {
      console.log(`Performance calc job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Performance calc job ${job?.id} failed:`, err);
    });
  }

  /**
   * Schedule daily performance calculations for tracked symbols
   */
  async scheduleDailyUpdates(symbols: { symbol: string; market: 'us' | 'crypto' | 'ngx' }[]): Promise<void> {
    for (const { symbol, market } of symbols) {
      // Add daily recurring job
      await this.queue.add(
        `performance-${symbol}`,
        { symbol, market, years: 5 },
        {
          repeat: {
            pattern: '0 2 * * *', // Run at 2 AM daily (cron pattern)
          },
          jobId: `performance-${symbol}`,
        }
      );
    }

    console.log(`Scheduled daily performance calculations for ${symbols.length} symbols`);
  }

  /**
   * Close worker and cleanup
   */
  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.redis.quit();
    await this.performanceService.close();
  }
}

// Start worker if run directly
if (require.main === module) {
  const worker = new PerformanceCalcWorker();
  console.log('✅ Performance calculation worker started');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down performance worker...');
    await worker.close();
    process.exit(0);
  });
}

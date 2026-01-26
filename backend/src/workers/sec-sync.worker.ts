import { Worker, Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { FilingsService } from '../services/filings.service';

interface SECSyncJob {
  symbol: string;
  filingType?: '10-K' | '10-Q';
}

export class SECSyncWorker {
  private worker: Worker;
  private queue: Queue;
  private filingsService: FilingsService;
  private redis: Redis;

  constructor() {
    const { createRedisConnection, getBullMQConnectionOptions, suppressBullMQErrors } = require('../utils/redis.config');
    this.redis = createRedisConnection();
    // Error handling is already done in createRedisConnection
    
    this.filingsService = new FilingsService();

    // BullMQ needs connection options
    const connectionOptions = getBullMQConnectionOptions();

    // Create queue for scheduling jobs
    this.queue = new Queue('sec-sync', {
      connection: connectionOptions,
    });
    
    // Suppress connection errors from BullMQ
    suppressBullMQErrors(this.queue);

    this.worker = new Worker(
      'sec-sync',
      async (job: Job<SECSyncJob>) => {
        const { symbol, filingType } = job.data;
        
        console.log(`Syncing SEC filings for ${symbol}`);
        
        try {
          await this.filingsService.getFilings(symbol, filingType, true, 10);
          console.log(`✅ SEC filings synced for ${symbol}`);
        } catch (error) {
          console.error(`❌ Failed to sync SEC filings for ${symbol}:`, error);
          throw error;
        }
      },
      {
        connection: connectionOptions,
        concurrency: 2, // Process up to 2 jobs concurrently (SEC API can be slow)
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
      console.log(`SEC sync job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`SEC sync job ${job?.id} failed:`, err);
    });
  }

  /**
   * Schedule weekly SEC filings sync for tracked symbols
   */
  async scheduleWeeklyUpdates(symbols: string[]): Promise<void> {
    for (const symbol of symbols) {
      // Add weekly recurring job (runs every Monday at 3 AM)
      await this.queue.add(
        `sec-sync-${symbol}`,
        { symbol },
        {
          repeat: {
            pattern: '0 3 * * 1', // Every Monday at 3 AM (cron pattern)
          },
          jobId: `sec-sync-${symbol}`,
        }
      );
    }

    console.log(`Scheduled weekly SEC filings sync for ${symbols.length} symbols`);
  }

  /**
   * Close worker and cleanup
   */
  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.redis.quit();
    await this.filingsService.close();
  }
}

// Start worker if run directly
if (require.main === module) {
  const worker = new SECSyncWorker();
  console.log('✅ SEC sync worker started');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down SEC sync worker...');
    await worker.close();
    process.exit(0);
  });
}

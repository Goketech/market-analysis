import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { MarketService } from '../services/market.service';
import { Server } from 'socket.io';

interface PriceAlertJob {
  subscriptionId: string;
  symbol: string;
  alertType: 'price_above' | 'price_below' | 'percent_change';
  threshold: number;
  userId: string;
}

export class PriceAlertWorker {
  private worker: Worker;
  private marketService: MarketService;
  private redis: Redis;
  private io?: Server;

  constructor(io?: Server) {
    this.io = io;
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null, // Required for BullMQ
    });

    this.marketService = new MarketService();

    this.worker = new Worker(
      'price-alerts',
      async (job: Job<PriceAlertJob>) => {
        await this.processPriceAlert(job);
      },
      {
        connection: this.redis,
        concurrency: 5,
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`Price alert job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Price alert job ${job?.id} failed:`, err);
    });
  }

  private async processPriceAlert(job: Job<PriceAlertJob>): Promise<void> {
    const { subscriptionId, symbol, alertType, threshold, userId } = job.data;

    // Check if subscription still exists in Redis
    const subscription = await this.redis.get(subscriptionId);
    if (!subscription) {
      // Subscription was cancelled, remove job
      await job.remove();
      return;
    }

    try {
      // Determine market type from symbol
      let market: 'us' | 'crypto' | 'ngx' = 'us';
      if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.length <= 4) {
        market = 'crypto';
      }

      // Get current price (simplified - in production, use dedicated price lookup)
      const performers = await this.marketService.getTopPerformers({
        market,
        timeframe: 'daily',
        limit: 100,
        type: 'gainers',
      });

      const asset = performers.find((p) => p.symbol === symbol);
      if (!asset) {
        return; // Asset not found, skip this check
      }

      const currentPrice = asset.price;
      const currentChangePercent = asset.changePercent;

      let shouldAlert = false;
      let alertMessage = '';

      switch (alertType) {
        case 'price_above':
          if (currentPrice >= threshold) {
            shouldAlert = true;
            alertMessage = `${symbol} price ($${currentPrice.toFixed(2)}) is above threshold ($${threshold.toFixed(2)})`;
          }
          break;
        case 'price_below':
          if (currentPrice <= threshold) {
            shouldAlert = true;
            alertMessage = `${symbol} price ($${currentPrice.toFixed(2)}) is below threshold ($${threshold.toFixed(2)})`;
          }
          break;
        case 'percent_change':
          if (Math.abs(currentChangePercent) >= Math.abs(threshold)) {
            shouldAlert = true;
            alertMessage = `${symbol} has changed ${currentChangePercent.toFixed(2)}% (threshold: ${threshold}%)`;
          }
          break;
      }

      if (shouldAlert) {
        // Emit WebSocket event to user
        if (this.io) {
          this.io.to(`user:${userId}`).emit('price-alert', {
            subscriptionId,
            symbol,
            message: alertMessage,
            price: currentPrice,
            changePercent: currentChangePercent,
            timestamp: new Date().toISOString(),
          });
        }

        // In production, also send email/SMS here
        console.log(`Alert triggered: ${alertMessage} for user ${userId}`);
      }
    } catch (error) {
      console.error(`Error processing price alert for ${symbol}:`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.redis.quit();
  }
}

// Start worker if this file is run directly
if (require.main === module) {
  const worker = new PriceAlertWorker(undefined);
  console.log('Price alert worker started');

  process.on('SIGTERM', async () => {
    await worker.close();
    process.exit(0);
  });
}

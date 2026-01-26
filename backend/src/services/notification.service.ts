import { Queue } from 'bullmq';
import Redis from 'ioredis';

interface AlertSubscription {
  symbol: string;
  alertType: 'price_above' | 'price_below' | 'percent_change';
  threshold: number;
  userId: string;
}

export class NotificationService {
  private alertQueue: Queue;
  private redis: Redis;

  constructor() {
    const { createRedisConnection, getBullMQConnectionOptions, suppressBullMQErrors } = require('../utils/redis.config');
    // BullMQ requires maxRetriesPerRequest: null
    this.redis = createRedisConnection({ maxRetriesPerRequest: null });
    // Error handling is already done in createRedisConnection

    // BullMQ needs connection options, not the Redis instance
    const connectionOptions = getBullMQConnectionOptions();
    connectionOptions.maxRetriesPerRequest = null;
    
    this.alertQueue = new Queue('price-alerts', {
      connection: connectionOptions,
    });
    
    // Suppress connection errors from BullMQ
    suppressBullMQErrors(this.alertQueue);
  }

  async subscribe(subscription: AlertSubscription): Promise<{ id: string }> {
    const subscriptionId = `alert:${subscription.userId}:${subscription.symbol}:${Date.now()}`;

    // Store subscription in Redis
    await this.redis.set(
      subscriptionId,
      JSON.stringify(subscription),
      'EX',
      86400 * 30 // 30 days expiry
    );

    // Add to alert queue for monitoring
    await this.alertQueue.add('monitor-price', {
      subscriptionId,
      ...subscription,
    }, {
      repeat: {
        every: 60000, // Check every minute
      },
    });

    return { id: subscriptionId };
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    // Remove from Redis
    await this.redis.del(subscriptionId);

    // Remove from queue (simplified - in production, use job removal)
    // This is a placeholder implementation
  }
}

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
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    });

    this.alertQueue = new Queue('price-alerts', {
      connection: this.redis,
    });
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

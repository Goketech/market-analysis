import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  message?: string; // Custom error message
}

class RateLimiter {
  private redis: Redis;
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    });

    this.options = {
      windowMs: options.windowMs,
      maxRequests: options.maxRequests,
      keyGenerator: options.keyGenerator || ((req) => req.ip || 'unknown'),
      message: options.message || 'Too many requests, please try again later.',
    };
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = `rate-limit:${this.options.keyGenerator(req)}`;
        const windowKey = `${key}:${Math.floor(Date.now() / this.options.windowMs)}`;

        // Get current request count
        const current = await this.redis.incr(windowKey);
        
        // Set expiry for the window key
        if (current === 1) {
          await this.redis.expire(windowKey, Math.ceil(this.options.windowMs / 1000));
        }

        // Check if limit exceeded
        if (current > this.options.maxRequests) {
          const ttl = await this.redis.ttl(windowKey);
          res.status(429).json({
            status: 'error',
            message: this.options.message,
            retryAfter: ttl,
          });
          return;
        }

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', this.options.maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, this.options.maxRequests - current));
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + this.options.windowMs).toISOString());

        next();
      } catch (error) {
        // If Redis fails, allow request (fail open)
        console.error('Rate limiter error:', error);
        next();
      }
    };
  }
}

// Pre-configured rate limiters
export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  keyGenerator: (req) => req.ip || 'unknown',
  message: 'Too many API requests. Please try again later.',
});

export const analysisRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // 20 analysis requests per hour
  keyGenerator: (req) => req.ip || 'unknown',
  message: 'Too many analysis requests. Please try again later.',
});

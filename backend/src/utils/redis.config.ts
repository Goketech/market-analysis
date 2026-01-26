import Redis from 'ioredis';

/**
 * Get Redis connection options from environment variables
 * Supports both REDIS_URL and REDIS_HOST/REDIS_PORT patterns
 * Returns options suitable for both ioredis and BullMQ
 */
export function getRedisConnectionOptions(): {
  host?: string;
  port?: number;
  password?: string;
  retryStrategy: () => null;
  enableOfflineQueue: boolean;
  maxRetriesPerRequest?: number | null;
} {
  const baseOptions = {
    retryStrategy: () => null as any, // Don't retry on connection failure
    enableOfflineQueue: false, // Don't queue commands when offline
  };

  // Priority 1: Use REDIS_URL if provided
  // When REDIS_URL is used, we'll parse it for BullMQ connection options
  if (process.env.REDIS_URL && !process.env.REDIS_HOST) {
    // Parse REDIS_URL to extract host, port, password for BullMQ
    try {
      const url = new URL(process.env.REDIS_URL);
      return {
        host: url.hostname,
        port: url.port ? parseInt(url.port, 10) : 6379,
        password: url.password || undefined,
        ...baseOptions,
      };
    } catch {
      // If URL parsing fails, fall back to defaults
    }
  }

  // Priority 2: Use REDIS_HOST and REDIS_PORT
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;

  // Log the connection details for debugging (only once)
  if (!process.env.REDIS_CONNECTION_LOGGED) {
    console.log(`🔌 Redis connection config: ${host}:${port} (from ${process.env.REDIS_URL ? 'REDIS_URL' : process.env.REDIS_PORT ? 'REDIS_PORT' : 'default'})`);
    process.env.REDIS_CONNECTION_LOGGED = 'true';
  }

  return {
    host,
    port,
    password,
    ...baseOptions,
  };
}

/**
 * Check if an error is a connection refused error
 */
function isConnectionRefusedError(err: any): boolean {
  if (err.code === 'ECONNREFUSED') return true;
  if (err.message?.includes('ECONNREFUSED')) return true;
  if (err.errors && Array.isArray(err.errors)) {
    return err.errors.some((e: any) => e.code === 'ECONNREFUSED' || e.message?.includes('ECONNREFUSED'));
  }
  return false;
}

/**
 * Create a Redis connection using environment variables
 * Supports both REDIS_URL and REDIS_HOST/REDIS_PORT patterns
 */
export function createRedisConnection(options?: { maxRetriesPerRequest?: number | null }): Redis {
  const connectionOptions = getRedisConnectionOptions();
  
  if (options?.maxRetriesPerRequest !== undefined) {
    connectionOptions.maxRetriesPerRequest = options.maxRetriesPerRequest;
  }

  let redis: Redis;
  
  // If REDIS_URL is provided, use it directly
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, connectionOptions);
  } else {
    // Otherwise use host/port configuration
    redis = new Redis(connectionOptions);
  }

  // Add global error handler to suppress connection errors
  redis.on('error', (err: any) => {
    if (isConnectionRefusedError(err)) {
      // Silently ignore connection refused errors
      return;
    }
    // Only log non-connection errors
    console.warn('Redis error:', err.message || err);
  });

  return redis;
}

/**
 * Get Redis connection options for BullMQ
 * BullMQ needs connection options, not a Redis instance
 */
export function getBullMQConnectionOptions() {
  return getRedisConnectionOptions();
}

/**
 * Suppress errors from a BullMQ Queue or Worker instance
 */
export function suppressBullMQErrors(instance: any): void {
  // BullMQ instances have an internal connection property
  // We need to catch errors from the connection
  if (instance && typeof instance.on === 'function') {
    instance.on('error', (err: any) => {
      if (isConnectionRefusedError(err)) {
        // Silently ignore connection errors
        return;
      }
      console.warn('BullMQ error:', err.message || err);
    });
  }
}

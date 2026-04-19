import { Request, Response, NextFunction } from 'express';
import { query } from '../utils/database';

type Tier = 'free' | 'pro' | 'enterprise';

const tierLevels: Record<Tier, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

// Daily usage limits per feature per tier
const USAGE_LIMITS: Record<string, Record<Tier, number>> = {
  analysis: { free: 3, pro: 50, enterprise: Infinity },
  sentiment: { free: 0, pro: 100, enterprise: Infinity },
  filings: { free: 0, pro: 50, enterprise: Infinity },
  export: { free: 0, pro: 20, enterprise: Infinity },
  alerts: { free: 0, pro: 5, enterprise: Infinity },
};

// Helper to get user tier from request (attached by auth middleware)
function getUserTier(req: Request): Tier {
  return ((req as any).user?.tier as Tier) || 'free';
}

function getUserId(req: Request): string | undefined {
  return (req as any).user?.id;
}

/**
 * Middleware factory: require minimum tier
 */
export function requireTier(minTier: Tier) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userTier = getUserTier(req);

    if (tierLevels[userTier] < tierLevels[minTier]) {
      res.status(403).json({
        status: 'error',
        code: 'UPGRADE_REQUIRED',
        message: `This feature requires a ${minTier} subscription.`,
        requiredTier: minTier,
        currentTier: userTier,
        upgradeUrl: `${process.env.APP_URL || 'http://localhost:5173'}/pricing`,
      });
      return;
    }
    next();
  };
}

/**
 * Middleware factory: track and enforce daily usage limits
 */
export function trackUsage(feature: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = getUserId(req);
    const tier = getUserTier(req);
    const limit = USAGE_LIMITS[feature]?.[tier] ?? Infinity;

    // If limit is 0 for this tier, block immediately
    if (limit === 0) {
      res.status(403).json({
        status: 'error',
        code: 'UPGRADE_REQUIRED',
        message: `This feature requires a paid subscription.`,
        requiredTier: 'pro',
        currentTier: tier,
        upgradeUrl: `${process.env.APP_URL || 'http://localhost:5173'}/pricing`,
      });
      return;
    }

    // If no user or infinite limit, skip tracking
    if (!userId || limit === Infinity) {
      next();
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      const { rows } = await query<{ count: string }>(
        `INSERT INTO usage_tracking (user_id, feature, date, count)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (user_id, feature, date)
         DO UPDATE SET count = usage_tracking.count + 1
         RETURNING count`,
        [userId, feature, today]
      );

      const currentCount = parseInt(rows[0]?.count || '1', 10);

      res.setHeader('X-Usage-Limit', limit);
      res.setHeader('X-Usage-Remaining', Math.max(0, limit - currentCount));
      res.setHeader('X-Usage-Reset', new Date(Date.now() + 86400000).toISOString());

      if (currentCount > limit) {
        res.status(429).json({
          status: 'error',
          code: 'USAGE_LIMIT_EXCEEDED',
          message: `Daily limit of ${limit} ${feature} requests reached. Upgrade for more access.`,
          limit,
          used: currentCount,
          tier,
          upgradeUrl: `${process.env.APP_URL || 'http://localhost:5173'}/pricing`,
        });
        return;
      }
    } catch (error) {
      // If DB is unavailable, allow the request (graceful degradation)
      console.warn('Usage tracking unavailable:', error);
    }

    next();
  };
}

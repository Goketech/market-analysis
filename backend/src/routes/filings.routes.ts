import { Router, Request, Response, NextFunction } from 'express';
import { getFilings } from '../controllers/filings.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTier, trackUsage } from '../middleware/featureGate.middleware';

export const filingsRouter = Router();

const authMiddleware = requireAuth as (req: Request, res: Response, next: NextFunction) => void;
const proMiddleware = requireTier('pro') as (req: Request, res: Response, next: NextFunction) => void;

// SEC Filings gated to pro+ only
filingsRouter.get('/:symbol',
  authMiddleware,
  proMiddleware,
  trackUsage('filings'),
  getFilings
);

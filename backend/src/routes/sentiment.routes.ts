import { Router, Request, Response, NextFunction } from 'express';
import { getSentiment } from '../controllers/sentiment.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTier, trackUsage } from '../middleware/featureGate.middleware';

export const sentimentRouter = Router();

const authMiddleware = requireAuth as (req: Request, res: Response, next: NextFunction) => void;
const proMiddleware = requireTier('pro') as (req: Request, res: Response, next: NextFunction) => void;

// Sentiment is pro+ only
sentimentRouter.get('/:symbol',
  authMiddleware,
  proMiddleware,
  trackUsage('sentiment'),
  getSentiment
);

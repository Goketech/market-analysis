import { Router } from 'express';
import { getSentiment } from '../controllers/sentiment.controller';
import { analysisRateLimiter } from '../middleware/rateLimiter';

export const sentimentRouter = Router();

sentimentRouter.get('/:symbol', analysisRateLimiter.middleware(), getSentiment);

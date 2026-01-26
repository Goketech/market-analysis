import { Router } from 'express';
import { getFilings } from '../controllers/filings.controller';
import { analysisRateLimiter } from '../middleware/rateLimiter';

export const filingsRouter = Router();

filingsRouter.get('/:symbol', analysisRateLimiter.middleware(), getFilings);

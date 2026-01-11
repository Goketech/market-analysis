import { Router } from 'express';
import { getTopPerformers } from '../controllers/market.controller';
import { apiRateLimiter } from '../middleware/rateLimiter';

export const marketRouter = Router();

marketRouter.get('/top-performers', apiRateLimiter.middleware(), getTopPerformers);

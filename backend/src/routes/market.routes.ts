import { Router } from 'express';
import { getTopPerformers } from '../controllers/market.controller';
import { getBestPerformers5Y, getSymbolPerformance } from '../controllers/performance.controller';
import { apiRateLimiter } from '../middleware/rateLimiter';

export const marketRouter = Router();

marketRouter.get('/top-performers', apiRateLimiter.middleware(), getTopPerformers);
marketRouter.get('/best-performers-5y', apiRateLimiter.middleware(), getBestPerformers5Y);
marketRouter.get('/performance/:symbol', apiRateLimiter.middleware(), getSymbolPerformance);
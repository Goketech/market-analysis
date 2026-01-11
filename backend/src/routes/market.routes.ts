import { Router } from 'express';
import { getTopPerformers } from '../controllers/market.controller';

export const marketRouter = Router();

marketRouter.get('/top-performers', getTopPerformers);

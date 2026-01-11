import { Router } from 'express';
import { getAnalysisReport } from '../controllers/analysis.controller';
import { exportAnalysisPDF } from '../controllers/export.controller';
import { analysisRateLimiter } from '../middleware/rateLimiter';

export const analysisRouter = Router();

analysisRouter.get('/:symbol', analysisRateLimiter.middleware(), getAnalysisReport);
analysisRouter.get('/:symbol/export/pdf', analysisRateLimiter.middleware(), exportAnalysisPDF);

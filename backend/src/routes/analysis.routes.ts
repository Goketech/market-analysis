import { Router, Request, Response, NextFunction } from 'express';
import { getAnalysisReport } from '../controllers/analysis.controller';
import { exportAnalysisPDF } from '../controllers/export.controller';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';
import { trackUsage } from '../middleware/featureGate.middleware';
import { analysisRateLimiter } from '../middleware/rateLimiter';

export const analysisRouter = Router();

const optAuth = optionalAuth as (req: Request, res: Response, next: NextFunction) => void;
const reqAuth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

// Analysis requires auth + usage tracking (3/day free, 50/day pro)
analysisRouter.get('/:symbol',
  optAuth,
  reqAuth,
  trackUsage('analysis'),
  analysisRateLimiter.middleware(),
  getAnalysisReport
);

// PDF export is pro+ only
analysisRouter.get('/:symbol/export/pdf',
  reqAuth,
  trackUsage('export'),
  exportAnalysisPDF
);

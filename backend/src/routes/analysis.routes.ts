import { Router } from 'express';
import { getAnalysisReport } from '../controllers/analysis.controller';

export const analysisRouter = Router();

analysisRouter.get('/:symbol', getAnalysisReport);

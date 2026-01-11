import { Request, Response, NextFunction } from 'express';
import { AnalysisService } from '../services/analysis.service';
import { AppError } from '../middleware/errorHandler';

const analysisService = new AnalysisService();

export const getAnalysisReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { symbol } = req.params;
    const { market = 'all' } = req.query;

    if (!symbol) {
      throw new AppError('Symbol parameter is required', 400);
    }

    const report = await analysisService.generateReport(
      symbol,
      market as string
    );

    res.json({
      status: 'success',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

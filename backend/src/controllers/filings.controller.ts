import { Request, Response, NextFunction } from 'express';
import { FilingsService } from '../services/filings.service';
import { AppError } from '../middleware/errorHandler';

const filingsService = new FilingsService();

export const getFilings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { symbol } = req.params;
    const { type, includeMetrics = 'false', limit = '10' } = req.query;

    if (!symbol) {
      throw new AppError('Symbol parameter is required', 400);
    }

    const filings = await filingsService.getFilings(
      symbol,
      type as '10-K' | '10-Q' | undefined,
      includeMetrics === 'true',
      parseInt(limit as string, 10)
    );

    res.json({
      status: 'success',
      data: filings,
    });
  } catch (error) {
    next(error);
  }
};

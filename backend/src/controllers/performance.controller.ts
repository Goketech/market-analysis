import { Request, Response, NextFunction } from 'express';
import { PerformanceService } from '../services/performance.service';
import { AppError } from '../middleware/errorHandler';

const performanceService = new PerformanceService();

export const getBestPerformers5Y = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      market,
      limit = '20',
      sortBy = 'returns',
    } = req.query;

    const filter = {
      market: market as 'us' | 'crypto' | 'ngx' | undefined,
      limit: parseInt(limit as string, 10),
      sortBy: (sortBy as 'returns' | 'volatility' | 'sharpe') || 'returns',
    };

    const performers = await performanceService.getBestPerformers(filter);

    // Return empty array gracefully if no data available
    res.json({
      status: 'success',
      data: performers || [],
      filter,
      count: performers?.length || 0,
      message: performers?.length === 0 
        ? 'No performance data available. This may be due to rate limits or missing data sources.'
        : undefined,
    });
  } catch (error) {
    next(error);
  }
};

export const getSymbolPerformance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { symbol } = req.params;
    const { market = 'us', years = '5' } = req.query;

    if (!symbol) {
      throw new AppError('Symbol parameter is required', 400);
    }

    const performance = await performanceService.calculatePerformance(
      symbol,
      market as 'us' | 'crypto' | 'ngx',
      parseInt(years as string, 10)
    );

    res.json({
      status: 'success',
      data: performance,
    });
  } catch (error) {
    next(error);
  }
};

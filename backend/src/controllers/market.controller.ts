import { Request, Response, NextFunction } from 'express';
import { MarketService } from '../services/market.service';

const marketService = new MarketService();

export const getTopPerformers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      market = 'all',
      timeframe = 'daily',
      country,
      limit = 20,
      type = 'gainers',
    } = req.query;

    const filters = {
      market: market as string,
      timeframe: timeframe as 'daily' | 'weekly' | 'monthly' | 'ytd',
      country: country as string | undefined,
      limit: parseInt(limit as string, 10),
      type: type as 'gainers' | 'losers',
    };

    const performers = await marketService.getTopPerformers(filters);

    res.json({
      status: 'success',
      data: performers,
      filters,
    });
  } catch (error) {
    next(error);
  }
};

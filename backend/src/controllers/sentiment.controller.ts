import { Request, Response, NextFunction } from 'express';
import { SentimentService } from '../services/sentiment.service';
import { AppError } from '../middleware/errorHandler';

const sentimentService = new SentimentService();

export const getSentiment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { symbol } = req.params;
    const { refresh } = req.query;

    if (!symbol) {
      throw new AppError('Symbol parameter is required', 400);
    }

    const forceRefresh = refresh === 'true';
    const sentiment = await sentimentService.getSentiment(symbol, forceRefresh);

    res.json({
      status: 'success',
      data: sentiment,
    });
  } catch (error) {
    next(error);
  }
};

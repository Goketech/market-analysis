import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { AppError } from '../middleware/errorHandler';

const notificationService = new NotificationService();

export const subscribeToAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { symbol, alertType, threshold, userId } = req.body;

    if (!symbol || !alertType || !threshold) {
      throw new AppError('Missing required fields: symbol, alertType, threshold', 400);
    }

    const subscription = await notificationService.subscribe({
      symbol,
      alertType,
      threshold,
      userId: userId || 'anonymous',
    });

    res.json({
      status: 'success',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

export const unsubscribeFromAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      throw new AppError('subscriptionId is required', 400);
    }

    await notificationService.unsubscribe(subscriptionId);

    res.json({
      status: 'success',
      message: 'Unsubscribed successfully',
    });
  } catch (error) {
    next(error);
  }
};

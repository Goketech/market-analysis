import { Router } from 'express';
import { subscribeToAlerts, unsubscribeFromAlerts } from '../controllers/notifications.controller';

export const notificationsRouter = Router();

notificationsRouter.post('/subscribe', subscribeToAlerts);
notificationsRouter.post('/unsubscribe', unsubscribeFromAlerts);

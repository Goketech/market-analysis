import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { BillingService } from '../services/billing.service';

const router = Router();
const billingService = new BillingService();

// Helper to cast auth middleware
const authMiddleware = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

// All billing routes require authentication
router.use(authMiddleware);

// --- Create Checkout Session ---
router.post('/checkout', async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const { tier } = req.body;
  if (!tier || !['pro', 'enterprise'].includes(tier)) {
    res.status(400).json({ status: 'error', message: 'Valid tier (pro or enterprise) required' });
    return;
  }
  try {
    const { url } = await billingService.createCheckoutSession(user.id, user.email, tier);
    res.json({ status: 'success', data: { url } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// --- Customer Portal ---
router.post('/portal', async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  try {
    const { url } = await billingService.createPortalSession(user.id);
    res.json({ status: 'success', data: { url } });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// --- Get Subscription Status ---
router.get('/subscription', async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  try {
    const status = await billingService.getSubscriptionStatus(user.id);
    res.json({ status: 'success', data: status });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export { router as billingRouter };

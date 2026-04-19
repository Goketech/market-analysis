import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireTier } from '../middleware/featureGate.middleware';
import { query } from '../utils/database';

const router = Router();
const authMiddleware = requireAuth as (req: Request, res: Response, next: NextFunction) => void;
const proMiddleware = requireTier('pro') as (req: Request, res: Response, next: NextFunction) => void;

router.use(authMiddleware);
router.use(proMiddleware);

// GET /api/v1/watchlist
router.get('/', async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  try {
    const { rows } = await query('SELECT * FROM watchlists WHERE user_id = $1 ORDER BY added_at DESC', [user.id]);
    res.json({ status: 'success', data: rows });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// POST /api/v1/watchlist
router.post('/', async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  const { symbol, name, market } = req.body;
  if (!symbol) { res.status(400).json({ status: 'error', message: 'Symbol required' }); return; }
  try {
    const { rows } = await query(
      `INSERT INTO watchlists (user_id, symbol, name, market) VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, symbol) DO NOTHING RETURNING *`,
      [user.id, symbol.toUpperCase(), name || symbol, market || 'us']
    );
    res.status(201).json({ status: 'success', data: rows[0] });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// DELETE /api/v1/watchlist/:symbol
router.delete('/:symbol', async (req: Request, res: Response) => {
  const user = (req as AuthenticatedRequest).user!;
  try {
    await query('DELETE FROM watchlists WHERE user_id = $1 AND symbol = $2', [user.id, req.params.symbol.toUpperCase()]);
    res.json({ status: 'success', message: 'Removed from watchlist' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export { router as watchlistRouter };

import { Router, Request, Response, RequestHandler } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/auth.service';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware';

const router = Router();
const authService = new AuthService();

// --- Register ---
router.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').optional().trim().isLength({ max: 100 }),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ status: 'error', errors: errors.array() });
      return;
    }

    try {
      const { email, password, name } = req.body;
      const { user, tokens } = await authService.register(email, password, name);

      res.status(201).json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            tier: user.tier,
            email_verified: user.email_verified,
          },
          ...tokens,
        },
      });
    } catch (error: any) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }
);

// --- Login ---
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ status: 'error', errors: errors.array() });
      return;
    }

    try {
      const { email, password } = req.body;
      const { user, tokens } = await authService.login(email, password);

      res.json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar_url: user.avatar_url,
            tier: user.tier,
            email_verified: user.email_verified,
          },
          ...tokens,
        },
      });
    } catch (error: any) {
      res.status(401).json({ status: 'error', message: error.message });
    }
  }
);

// --- Refresh Token ---
router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ status: 'error', message: 'Refresh token required' });
    return;
  }

  try {
    const tokens = await authService.refreshToken(refreshToken);
    res.json({ status: 'success', data: tokens });
  } catch (error: any) {
    res.status(401).json({ status: 'error', message: error.message });
  }
});

// --- Me (current user) ---
router.get('/me', requireAuth as RequestHandler, (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await authService.getUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }
    res.json({
      status: 'success',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        tier: user.tier,
        subscription_status: user.subscription_status,
        email_verified: user.email_verified,
        created_at: user.created_at,
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}) as RequestHandler);

// --- Google OAuth (token-based for SPA) ---
router.post('/google', async (req: Request, res: Response) => {
  const { googleId, email, name, avatar } = req.body;

  if (!googleId || !email) {
    res.status(400).json({ status: 'error', message: 'Google ID and email required' });
    return;
  }

  try {
    const { user, tokens, isNew } = await authService.findOrCreateGoogleUser({
      id: googleId,
      email,
      name,
      avatar,
    });

    res.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
          tier: user.tier,
          email_verified: user.email_verified,
        },
        ...tokens,
        isNew,
      },
    });
  } catch (error: any) {
    res.status(400).json({ status: 'error', message: error.message });
  }
});

export { router as authRouter };

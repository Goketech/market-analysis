import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    tier: 'free' | 'pro' | 'enterprise';
  };
}

/**
 * Middleware: require a valid JWT, attach req.user
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Please log in.',
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = authService.verifyAccessToken(token);
    req.user = {
      id: payload.id,
      email: payload.email,
      tier: (payload.tier as 'free' | 'pro' | 'enterprise') || 'free',
    };
    next();
  } catch {
    res.status(401).json({
      status: 'error',
      code: 'TOKEN_EXPIRED',
      message: 'Your session has expired. Please log in again.',
    });
  }
}

/**
 * Middleware: optionally attach user if token present (don't reject if missing)
 */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = authService.verifyAccessToken(token);
      req.user = {
        id: payload.id,
        email: payload.email,
        tier: (payload.tier as 'free' | 'pro' | 'enterprise') || 'free',
      };
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }
  next();
}

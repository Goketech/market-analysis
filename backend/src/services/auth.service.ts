import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../utils/database';
import { logger } from '../utils/logger';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  google_id?: string;
  tier: 'free' | 'pro' | 'enterprise';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: string;
  email_verified: boolean;
  created_at: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export class AuthService {
  /**
   * Register a new user with email/password
   */
  async register(email: string, password: string, name?: string): Promise<{ user: User; tokens: AuthTokens }> {
    // Check if user already exists
    const { rows: existing } = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.length > 0) {
      throw new Error('An account with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const { rows } = await query<User>(
      `INSERT INTO users (email, password_hash, name, email_verified)
       VALUES ($1, $2, $3, false)
       RETURNING id, email, name, avatar_url, tier, stripe_customer_id, email_verified, created_at`,
      [email.toLowerCase(), passwordHash, name || null]
    );

    const user = rows[0];
    const tokens = this.generateTokens(user);

    logger.info(`New user registered: ${email}`);
    return { user, tokens };
  }

  /**
   * Login with email/password
   */
  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const { rows } = await query<any>(
      `SELECT id, email, name, avatar_url, password_hash, tier, stripe_customer_id,
              stripe_subscription_id, subscription_status, email_verified, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const userRow = rows[0];

    if (!userRow.password_hash) {
      throw new Error('This account uses Google login. Please sign in with Google.');
    }

    const isValid = await bcrypt.compare(password, userRow.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const user: User = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      avatar_url: userRow.avatar_url,
      tier: userRow.tier,
      stripe_customer_id: userRow.stripe_customer_id,
      stripe_subscription_id: userRow.stripe_subscription_id,
      subscription_status: userRow.subscription_status,
      email_verified: userRow.email_verified,
      created_at: userRow.created_at,
    };

    const tokens = this.generateTokens(user);
    logger.info(`User logged in: ${email}`);
    return { user, tokens };
  }

  /**
   * Find or create user from Google OAuth
   */
  async findOrCreateGoogleUser(profile: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  }): Promise<{ user: User; tokens: AuthTokens; isNew: boolean }> {
    // Check if user exists by google_id
    let { rows } = await query<any>(
      `SELECT id, email, name, avatar_url, google_id, tier, stripe_customer_id,
              stripe_subscription_id, subscription_status, email_verified, created_at
       FROM users WHERE google_id = $1`,
      [profile.id]
    );

    let isNew = false;

    if (rows.length === 0) {
      // Check by email
      const { rows: emailRows } = await query<any>(
        'SELECT id FROM users WHERE email = $1',
        [profile.email.toLowerCase()]
      );

      if (emailRows.length > 0) {
        // Merge google_id into existing account
        const { rows: updated } = await query<any>(
          `UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2), email_verified = true
           WHERE email = $3
           RETURNING id, email, name, avatar_url, tier, stripe_customer_id, subscription_status, email_verified, created_at`,
          [profile.id, profile.avatar, profile.email.toLowerCase()]
        );
        rows = updated;
      } else {
        // Create new user from Google
        const { rows: created } = await query<any>(
          `INSERT INTO users (email, google_id, name, avatar_url, email_verified)
           VALUES ($1, $2, $3, $4, true)
           RETURNING id, email, name, avatar_url, tier, stripe_customer_id, subscription_status, email_verified, created_at`,
          [profile.email.toLowerCase(), profile.id, profile.name, profile.avatar]
        );
        rows = created;
        isNew = true;
        logger.info(`New Google user created: ${profile.email}`);
      }
    }

    const user: User = {
      id: rows[0].id,
      email: rows[0].email,
      name: rows[0].name,
      avatar_url: rows[0].avatar_url,
      tier: rows[0].tier || 'free',
      stripe_customer_id: rows[0].stripe_customer_id,
      subscription_status: rows[0].subscription_status,
      email_verified: rows[0].email_verified,
      created_at: rows[0].created_at,
    };

    const tokens = this.generateTokens(user);
    return { user, tokens, isNew };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      
      const { rows } = await query<any>(
        'SELECT id, email, name, tier, email_verified FROM users WHERE id = $1',
        [payload.id]
      );

      if (rows.length === 0) {
        throw new Error('User not found');
      }

      return this.generateTokens(rows[0]);
    } catch {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    const { rows } = await query<User>(
      `SELECT id, email, name, avatar_url, tier, stripe_customer_id,
              stripe_subscription_id, subscription_status, email_verified, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Generate access + refresh token pair
   */
  generateTokens(user: { id: string; email: string; tier?: string }): AuthTokens {
    const payload = {
      id: user.id,
      email: user.email,
      tier: user.tier || 'free',
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN } as any);

    return { accessToken, refreshToken };
  }

  /**
   * Verify JWT access token
   */
  verifyAccessToken(token: string): { id: string; email: string; tier: string } {
    return jwt.verify(token, JWT_SECRET) as any;
  }
}

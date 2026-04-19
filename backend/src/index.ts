import 'dotenv/config'; // Load env vars immediately (must be first import)
import 'express-async-errors';
import express from 'express';
import cors from 'cors';

import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { marketRouter } from './routes/market.routes';
import { analysisRouter } from './routes/analysis.routes';
import { notificationsRouter } from './routes/notifications.routes';
import { sentimentRouter } from './routes/sentiment.routes';
import { filingsRouter } from './routes/filings.routes';
import { authRouter } from './routes/auth.routes';
import { billingRouter } from './routes/billing.routes';
import { watchlistRouter } from './routes/watchlist.routes';
import { errorHandler } from './middleware/errorHandler';
import { setupSocketIO } from './websocket/socket';
import { PriceAlertWorker } from './workers/price-alert.worker';
import { runMigrations, closeDb } from './utils/database';
import { logger } from './utils/logger';
import { BillingService } from './services/billing.service';

// Suppress Redis connection errors from BullMQ
process.on('unhandledRejection', (reason: any) => {
  if (reason && typeof reason === 'object') {
    if (reason.code === 'ECONNREFUSED' ||
        reason.message?.includes('ECONNREFUSED') ||
        (reason.errors && Array.isArray(reason.errors) &&
         reason.errors.some((e: any) => e.code === 'ECONNREFUSED'))) {
      return;
    }
  }
  logger.error('Unhandled rejection:', reason);
});

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (important for rate limiting behind load balancers)
app.set('trust proxy', 1);

// ─── Stripe Webhook (must come before express.json()) ───────────────────────
const billingService = new BillingService();
app.post(
  '/api/v1/billing/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;
    try {
      await billingService.handleWebhook(req.body, signature);
      res.json({ received: true });
    } catch (error: any) {
      logger.error('Stripe webhook error:', error.message);
      res.status(400).json({ error: error.message });
    }
  }
);

// ─── Security Middleware ─────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));
app.use(compression());

// CORS
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
app.use(cors({
  origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── WebSocket Setup ─────────────────────────────────────────────────────────
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/billing', billingRouter);
app.use('/api/v1/market', marketRouter);
app.use('/api/v1/analysis', analysisRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/sentiment', sentimentRouter);
app.use('/api/v1/filings', filingsRouter);
app.use('/api/v1/watchlist', watchlistRouter);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── WebSocket ────────────────────────────────────────────────────────────────
setupSocketIO(io);

// ─── Price Alert Worker ───────────────────────────────────────────────────────
let priceAlertWorker: PriceAlertWorker | null = null;
if (process.env.ENABLE_WORKERS === 'true') {
  priceAlertWorker = new PriceAlertWorker(io);
  logger.info('✅ Price alert worker started');
}

// ─── Start Server ─────────────────────────────────────────────────────────────
async function bootstrap() {
  // Run database migrations
  await runMigrations();

  httpServer.listen(PORT, () => {
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
    logger.info(`📊 Market Intelligence Hub API v2.0.0`);
    logger.info(`🔐 Auth: JWT + Google OAuth enabled`);
    logger.info(`💳 Billing: Stripe integration active`);
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  if (priceAlertWorker) await priceAlertWorker.close();
  await closeDb();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { io };

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { marketRouter } from './routes/market.routes';
import { analysisRouter } from './routes/analysis.routes';
import { notificationsRouter } from './routes/notifications.routes';
import { sentimentRouter } from './routes/sentiment.routes';
import { filingsRouter } from './routes/filings.routes';
import { errorHandler } from './middleware/errorHandler';
import { setupSocketIO } from './websocket/socket';
import { PriceAlertWorker } from './workers/price-alert.worker';

dotenv.config();

// Suppress Redis connection errors globally (BullMQ creates its own connections)
process.on('unhandledRejection', (reason: any) => {
  if (reason && typeof reason === 'object') {
    // Check if it's a Redis connection error
    if (reason.code === 'ECONNREFUSED' || 
        reason.message?.includes('ECONNREFUSED') ||
        (reason.errors && Array.isArray(reason.errors) && 
         reason.errors.some((e: any) => e.code === 'ECONNREFUSED'))) {
      // Silently ignore Redis connection errors
      return;
    }
  }
  // Log other unhandled rejections
  console.error('Unhandled rejection:', reason);
});

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - ensure single origin value (no arrays, no brackets)
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware - CORS must be set before other middleware
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/market', marketRouter);
app.use('/api/v1/analysis', analysisRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/sentiment', sentimentRouter);
app.use('/api/v1/filings', filingsRouter);

// Error handling
app.use(errorHandler);

// Setup WebSocket
setupSocketIO(io);

// Start BullMQ worker for price alerts
let priceAlertWorker: PriceAlertWorker | null = null;
if (process.env.ENABLE_WORKERS !== 'false') {
  priceAlertWorker = new PriceAlertWorker(io);
  console.log('✅ Price alert worker started');
}

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Market Intelligence Hub API v1.0.0`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (priceAlertWorker) {
    await priceAlertWorker.close();
  }
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { io };

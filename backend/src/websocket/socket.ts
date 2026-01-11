import { Server } from 'socket.io';
import { MarketService } from '../services/market.service';

const marketService = new MarketService();

export function setupSocketIO(io: Server): void {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle user room joining for price alerts
    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined their alert room`);
    });
    
    socket.on('leave:user', (userId: string) => {
      socket.leave(`user:${userId}`);
      console.log(`User ${userId} left their alert room`);
    });

    // Subscribe to market updates
    socket.on('subscribe:market', async (data: { market: string; type: 'gainers' | 'losers' }) => {
      try {
        const performers = await marketService.getTopPerformers({
          market: data.market,
          timeframe: 'daily',
          limit: 20,
          type: data.type,
        });

        socket.emit('market:update', performers);

        // Send periodic updates every 30 seconds
        const interval = setInterval(async () => {
          const updated = await marketService.getTopPerformers({
            market: data.market,
            timeframe: 'daily',
            limit: 20,
            type: data.type,
          });
          socket.emit('market:update', updated);
        }, 30000);

        socket.on('disconnect', () => {
          clearInterval(interval);
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to fetch market data' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

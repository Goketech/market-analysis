import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMarketStore } from '../store/marketStore';

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { filters } = useMarketStore();

  useEffect(() => {
    // Connect to WebSocket server
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      
      // Subscribe to market updates based on current filters
      socket.emit('subscribe:market', {
        market: filters.market === 'all' ? 'all' : filters.market,
        type: filters.type,
      });
    });

    socket.on('market:update', (data) => {
      // Handle real-time market updates
      // This will be handled by React Query refetch
      console.log('Market update received:', data);
    });

    socket.on('price-alert', (data) => {
      // Handle price alerts
      console.log('Price alert:', data);
      // You can show a notification here
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Price Alert', {
          body: data.message,
          icon: '/favicon.ico',
        });
      }
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [filters.market, filters.type]);

  return socketRef.current;
}

import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import { useAuthStore, AuthUser } from '../store/authStore';

// --- Register ---
export const useRegister = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (data: { email: string; password: string; name?: string }) => {
      const res = await apiClient.post('/api/v1/auth/register', data);
      return res.data.data;
    },
    onSuccess: ({ user, accessToken, refreshToken }) => {
      setAuth(user, accessToken, refreshToken);
    },
  });
};

// --- Login ---
export const useLogin = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiClient.post('/api/v1/auth/login', data);
      return res.data.data;
    },
    onSuccess: ({ user, accessToken, refreshToken }) => {
      setAuth(user, accessToken, refreshToken);
    },
  });
};

// --- Google OAuth ---
export const useGoogleAuth = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: async (profile: { googleId: string; email: string; name?: string; avatar?: string }) => {
      const res = await apiClient.post('/api/v1/auth/google', profile);
      return res.data.data;
    },
    onSuccess: ({ user, accessToken, refreshToken }) => {
      setAuth(user, accessToken, refreshToken);
    },
  });
};

// --- Me (current user) ---
export const useMe = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const updateUser = useAuthStore((s) => s.updateUser);
  return useQuery<AuthUser>({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/auth/me');
      return res.data.data;
    },
    enabled: isAuthenticated,
    onSuccess: (data: AuthUser) => updateUser(data),
  } as any);
};

// --- Get Subscription Status ---
export const useSubscriptionStatus = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/billing/subscription');
      return res.data.data;
    },
    enabled: isAuthenticated,
    staleTime: 60000,
  });
};

// --- Create Checkout Session ---
export const useCreateCheckout = () =>
  useMutation({
    mutationFn: async (tier: 'pro' | 'enterprise') => {
      const res = await apiClient.post('/api/v1/billing/checkout', { tier });
      return res.data.data;
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

// --- Customer Portal ---
export const useCustomerPortal = () =>
  useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/api/v1/billing/portal');
      return res.data.data;
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

// --- Watchlist ---
export const useWatchlist = () =>
  useQuery({
    queryKey: ['watchlist'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/watchlist');
      return res.data.data;
    },
    enabled: useAuthStore.getState().isAuthenticated,
  });

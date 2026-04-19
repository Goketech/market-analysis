import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserTier = 'free' | 'pro' | 'enterprise';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  tier: UserTier;
  email_verified: boolean;
  subscription_status?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),

      setAccessToken: (token) => set({ accessToken: token }),
    }),
    {
      name: 'mih-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Tier helpers
export const tierLevel = (tier: UserTier): number => {
  const levels: Record<UserTier, number> = { free: 0, pro: 1, enterprise: 2 };
  return levels[tier] ?? 0;
};

export const hasTier = (userTier: UserTier, required: UserTier): boolean =>
  tierLevel(userTier) >= tierLevel(required);

export const isPro = (tier?: UserTier) => hasTier(tier || 'free', 'pro');
export const isEnterprise = (tier?: UserTier) => hasTier(tier || 'free', 'enterprise');

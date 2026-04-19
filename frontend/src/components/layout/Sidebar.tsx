import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3, TrendingUp, FileText, Bell, Star, Home,
  LogOut, Settings, CreditCard, ChevronRight, Zap, Shield
} from 'lucide-react';
import { useAuthStore, isPro, isEnterprise } from '../../store/authStore';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

const nav = [
  { to: '/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/market', icon: BarChart3, label: 'Market' },
  { to: '/performers', icon: TrendingUp, label: 'Best Performers' },
  { to: '/analysis', icon: Zap, label: 'AI Analysis', requireAuth: true },
  { to: '/sentiment', icon: TrendingUp, label: 'Sentiment', tier: 'pro' as const },
  { to: '/filings', icon: FileText, label: 'SEC Filings', tier: 'pro' as const },
  { to: '/watchlist', icon: Star, label: 'Watchlist', tier: 'pro' as const },
  { to: '/alerts', icon: Bell, label: 'Alerts', tier: 'pro' as const },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const tier = user?.tier || 'free';

  const handleLogout = () => {
    logout();
    navigate('/auth');
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-lg glow-brand">
            <BarChart3 size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Market Intelligence</p>
            <p className="text-xs text-muted-foreground">Hub</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label, tier: requiredTier }) => {
          const locked = requiredTier === 'pro' && !isPro(user?.tier) ||
                        (requiredTier as string) === 'enterprise' && !isEnterprise(user?.tier);

          return (
            <NavLink
              key={to}
              to={locked ? '/pricing' : to}
              onClick={onClose}
              className={({ isActive }) =>
                cn('sidebar-link group', isActive && !locked && 'active')
              }
            >
              <Icon size={18} className="shrink-0" />
              <span className="flex-1">{label}</span>
              {locked && (
                <span className="text-xs text-muted-foreground opacity-60">
                  <Shield size={12} />
                </span>
              )}
              {requiredTier && !locked && (
                <Badge variant={requiredTier} className="text-[10px] px-1.5 py-0">
                  {requiredTier.toUpperCase()}
                </Badge>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Tier Upsell Banner */}
      {!isPro(user?.tier) && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/20">
          <p className="text-xs font-semibold text-blue-400 mb-1">Upgrade to Pro</p>
          <p className="text-xs text-muted-foreground mb-2">
            Unlock sentiment analysis, SEC filings, and unlimited AI reports
          </p>
          <NavLink
            to="/pricing"
            className="flex items-center gap-1 text-xs text-blue-400 font-medium hover:text-blue-300"
          >
            View plans <ChevronRight size={12} />
          </NavLink>
        </div>
      )}

      {/* User section */}
      <div className="border-t border-border px-3 py-4 space-y-1">
        {user ? (
          <>
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-semibold">
                {user.name?.[0] || user.email[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name || user.email.split('@')[0]}</p>
                <Badge variant={tier as any} className="mt-0.5">
                  {tier.toUpperCase()}
                </Badge>
              </div>
            </div>
            <NavLink to="/billing" onClick={onClose} className="sidebar-link">
              <CreditCard size={16} /> Billing
            </NavLink>
            <NavLink to="/settings" onClick={onClose} className="sidebar-link">
              <Settings size={16} /> Settings
            </NavLink>
            <button onClick={handleLogout} className="sidebar-link w-full text-left text-rose-500 hover:text-rose-400 hover:bg-rose-500/10">
              <LogOut size={16} /> Sign out
            </button>
          </>
        ) : (
          <NavLink to="/auth" className="sidebar-link">
            <LogOut size={16} /> Sign in
          </NavLink>
        )}
      </div>
    </div>
  );
}

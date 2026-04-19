import { TrendingUp, TrendingDown, BarChart3, Zap, Star, ArrowRight, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { useTopPerformers } from '../api/market.api';
import { useAuthStore } from '../store/authStore';
import { formatPercent, formatCurrency, getChangeColor, cn } from '../lib/utils';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

// Mini sparkline mock data generator
const genSparkline = (trend: 'up' | 'down') =>
  Array.from({ length: 10 }, (_, i) => ({
    v: 100 + (trend === 'up' ? 1 : -1) * i * 2 + Math.random() * 8 - 4,
  }));

interface KpiCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  gradient: string;
  sparkline?: { v: number }[];
}

function KpiCard({ title, value, change, icon, gradient, sparkline }: KpiCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', gradient)}>
            {icon}
          </div>
          {change !== undefined && (
            <Badge variant={change >= 0 ? 'bullish' : 'bearish'}>
              {formatPercent(change)}
            </Badge>
          )}
        </div>
        <p className="text-2xl font-bold mb-0.5">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
        {sparkline && (
          <div className="mt-3 -mx-2">
            <ResponsiveContainer width="100%" height={40}>
              <AreaChart data={sparkline}>
                <defs>
                  <linearGradient id={`sg-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={change && change >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={change && change >= 0 ? '#10b981' : '#ef4444'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={change && change >= 0 ? '#10b981' : '#ef4444'}
                  strokeWidth={1.5}
                  fill={`url(#sg-${title})`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: gainers, isLoading } = useTopPerformers({ market: 'all', timeframe: 'daily', type: 'gainers', limit: 5 });
  const { data: losers } = useTopPerformers({ market: 'all', timeframe: 'daily', type: 'losers', limit: 5 });

  const topGainer = gainers?.data?.[0];
  const topLoser = losers?.data?.[0];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}
            {user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here's your market overview for today.</p>
        </div>
        <Button onClick={() => navigate('/market')} variant="outline" size="sm" className="gap-2">
          Full Market <ArrowRight size={14} />
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)
        ) : (
          <>
            <KpiCard
              title="Top Gainer Today"
              value={topGainer ? `${topGainer.symbol} +${topGainer.changePercent.toFixed(2)}%` : 'N/A'}
              change={topGainer?.changePercent}
              icon={<TrendingUp size={18} className="text-white" />}
              gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
              sparkline={genSparkline('up')}
            />
            <KpiCard
              title="Top Loser Today"
              value={topLoser ? `${topLoser.symbol} ${topLoser.changePercent.toFixed(2)}%` : 'N/A'}
              change={topLoser?.changePercent}
              icon={<TrendingDown size={18} className="text-white" />}
              gradient="bg-gradient-to-br from-rose-500 to-red-500"
              sparkline={genSparkline('down')}
            />
            <KpiCard
              title="Markets Tracked"
              value="3"
              icon={<BarChart3 size={18} className="text-white" />}
              gradient="bg-gradient-to-br from-blue-500 to-indigo-500"
            />
            <KpiCard
              title="Your Tier"
              value={user?.tier?.toUpperCase() || 'FREE'}
              icon={<Zap size={18} className="text-white" />}
              gradient={user?.tier === 'pro' ? 'bg-gradient-to-br from-purple-500 to-violet-500' : 'gradient-brand'}
            />
          </>
        )}
      </div>

      {/* Market Tables */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top Gainers */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-500" />
                Top Gainers
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/market')} className="text-xs gap-1">
                See all <ArrowRight size={12} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {gainers?.data?.slice(0, 5).map((item) => (
                  <div
                    key={item.symbol}
                    onClick={() => navigate('/analysis', { state: { symbol: item.symbol, market: item.market } })}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-500">
                        {item.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.symbol}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">{item.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(item.price)}</p>
                      <p className="text-xs table-cell-positive">{formatPercent(item.changePercent)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Losers */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown size={16} className="text-rose-500" />
                Top Losers
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/market')} className="text-xs gap-1">
                See all <ArrowRight size={12} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {losers?.data?.slice(0, 5).map((item) => (
                  <div
                    key={item.symbol}
                    onClick={() => navigate('/analysis', { state: { symbol: item.symbol, market: item.market } })}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-xs font-bold text-rose-500">
                        {item.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{item.symbol}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">{item.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(item.price)}</p>
                      <p className="text-xs table-cell-negative">{formatPercent(item.changePercent)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Run AI Analysis', icon: Zap, to: '/analysis', color: 'text-blue-500' },
          { label: 'View 5Y Performers', icon: TrendingUp, to: '/performers', color: 'text-emerald-500' },
          { label: 'My Watchlist', icon: Star, to: '/watchlist', color: 'text-amber-500' },
          { label: 'Market Overview', icon: Activity, to: '/market', color: 'text-purple-500' },
        ].map(({ label, icon: Icon, to, color }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="glass-card rounded-xl p-4 flex flex-col items-start gap-2 hover:bg-accent/50 transition-colors text-left"
          >
            <Icon size={20} className={color} />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

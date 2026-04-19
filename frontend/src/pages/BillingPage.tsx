import { CreditCard, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { useSubscriptionStatus, useCustomerPortal, useCreateCheckout } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function BillingPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data: subscription, isLoading } = useSubscriptionStatus();
  const portal = useCustomerPortal();
  const checkout = useCreateCheckout();

  const statusIcon = ({
    active: <CheckCircle size={16} className="text-emerald-500" />,
    trialing: <Clock size={16} className="text-amber-500" />,
    canceled: <XCircle size={16} className="text-rose-500" />,
    inactive: <XCircle size={16} className="text-muted-foreground" />,
  } as Record<string, JSX.Element>)[subscription?.status || 'inactive'];

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard size={18} /> Subscription
          </CardTitle>
          <CardDescription>Manage your plan and billing details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-24 rounded-xl" />
          ) : (
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={(user?.tier || 'free') as any}>
                    {(user?.tier || 'free').toUpperCase()}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-sm">
                    {statusIcon}
                    <span className="capitalize text-muted-foreground">{subscription?.status || 'inactive'}</span>
                  </div>
                </div>
                {subscription?.periodEnd && (
                  <p className="text-xs text-muted-foreground">
                    {subscription?.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
                    {new Date(subscription.periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
              {user?.tier !== 'free' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => portal.mutate()}
                  disabled={portal.isPending}
                >
                  <ExternalLink size={13} /> Manage
                </Button>
              )}
            </div>
          )}

          {user?.tier === 'free' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Upgrade to unlock more features:</p>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => checkout.mutateAsync('pro')} disabled={checkout.isPending}>
                  Upgrade to Pro — $19/mo
                </Button>
                <Button variant="premium" className="flex-1" onClick={() => checkout.mutateAsync('enterprise')} disabled={checkout.isPending}>
                  Enterprise — $79/mo
                </Button>
              </div>
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')}>
            View all plans →
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {[
              { label: 'AI Analysis Reports', value: user?.tier === 'free' ? '3/day' : user?.tier === 'pro' ? '50/day' : 'Unlimited' },
              { label: 'Sentiment Analysis', value: user?.tier === 'free' ? 'Not included' : 'Included' },
              { label: 'SEC Filings', value: user?.tier === 'free' ? 'Not included' : 'Included' },
              { label: 'Price Alerts', value: user?.tier === 'free' ? 'Not included' : user?.tier === 'pro' ? 'Up to 5' : 'Unlimited' },
              { label: 'Personal Watchlist', value: user?.tier === 'free' ? 'Not included' : 'Included' },
              { label: 'PDF/CSV Export', value: user?.tier === 'free' ? 'Not included' : 'Included' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-border last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

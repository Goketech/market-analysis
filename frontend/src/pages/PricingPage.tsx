import { Check, Zap, Shield, Star, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useAuthStore } from '../store/authStore';
import { useCreateCheckout } from '../api/auth.api';
import { cn } from '../lib/utils';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Get started with real-time market data',
    badge: null,
    icon: <Star size={20} />,
    gradient: 'from-slate-500 to-slate-600',
    features: [
      { text: 'Top 10 market gainers/losers', included: true },
      { text: 'Basic market data (US, Crypto, NGX)', included: true },
      { text: '3 AI analysis reports per day', included: true },
      { text: 'Best Performers 5Y (top 5 only)', included: true },
      { text: 'Real-time WebSocket updates', included: true },
      { text: 'Sentiment analysis', included: false },
      { text: 'SEC filings access', included: false },
      { text: 'Price alerts', included: false },
      { text: 'Personal watchlist', included: false },
      { text: 'PDF/CSV export', included: false },
    ],
    cta: 'Get Started Free',
    tier: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For active traders and investors',
    badge: 'Most Popular',
    icon: <Zap size={20} />,
    gradient: 'from-blue-500 to-indigo-600',
    features: [
      { text: 'Everything in Free', included: true },
      { text: '50 AI analysis reports per day', included: true },
      { text: 'Real-time sentiment analysis (NewsAPI + GPT)', included: true },
      { text: 'SEC filings with financial metrics', included: true },
      { text: '5 price alerts', included: true },
      { text: 'Personal watchlist', included: true },
      { text: 'PDF & CSV export', included: true },
      { text: 'Full 5Y best performers view', included: true },
      { text: 'Priority support', included: true },
      { text: 'API access', included: false },
    ],
    cta: 'Start Pro',
    tier: 'pro' as const,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$79',
    period: '/month',
    description: 'For institutions and power users',
    badge: null,
    icon: <Shield size={20} />,
    gradient: 'from-purple-500 to-violet-600',
    features: [
      { text: 'Everything in Pro', included: true },
      { text: 'Unlimited AI analysis reports', included: true },
      { text: 'Unlimited price alerts', included: true },
      { text: 'API key access', included: true },
      { text: 'Custom branding', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'SLA guarantee', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'Team members (coming soon)', included: true },
      { text: 'Advanced backtesting (coming soon)', included: true },
    ],
    cta: 'Start Enterprise',
    tier: 'enterprise' as const,
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const createCheckout = useCreateCheckout();

  const handleUpgrade = async (tier: 'pro' | 'enterprise') => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    await createCheckout.mutateAsync(tier);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-3">
        <Badge variant="default" className="mb-2">Pricing</Badge>
        <h1 className="text-4xl font-bold gradient-text">
          Simple, transparent pricing
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Start free. Upgrade when you need more power. No hidden fees, cancel anytime.
        </p>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = user?.tier === plan.id;
          const isPopular = plan.badge === 'Most Popular';

          return (
            <Card
              key={plan.id}
              className={cn(
                'relative flex flex-col transition-transform hover:-translate-y-1 duration-300',
                isPopular && 'ring-2 ring-primary shadow-xl shadow-primary/20'
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="pro" className="shadow-lg">{plan.badge}</Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className={cn('w-11 h-11 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white mb-3 shadow-md', plan.gradient)}>
                  {plan.icon}
                </div>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-3">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-2.5 text-sm">
                      {feature.included ? (
                        <Check size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <X size={15} className="text-muted-foreground/40 shrink-0 mt-0.5" />
                      )}
                      <span className={feature.included ? 'text-foreground' : 'text-muted-foreground line-through'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan ✓
                  </Button>
                ) : plan.tier ? (
                  <Button
                    className="w-full gap-2"
                    variant={plan.id === 'enterprise' ? 'premium' : 'default'}
                    onClick={() => handleUpgrade(plan.tier!)}
                    disabled={createCheckout.isPending}
                  >
                    {plan.cta} <ArrowRight size={14} />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
                  >
                    {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="text-center pt-4">
        <p className="text-sm text-muted-foreground">
          Questions? Email us at{' '}
          <a href="mailto:support@marketintelligencehub.com" className="text-primary hover:underline">
            support@marketintelligencehub.com
          </a>
        </p>
      </div>
    </div>
  );
}

import { Lock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, UserTier, isPro, isEnterprise } from '../../store/authStore';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface FeatureGateProps {
  tier: UserTier;
  children: React.ReactNode;
  className?: string;
  /** If true, shows a blurred preview of the content. If false, shows placeholder */
  blurPreview?: boolean;
  featureName?: string;
}

export function FeatureGate({ tier, children, className, blurPreview = true, featureName }: FeatureGateProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const hasAccess =
    tier === 'pro' ? isPro(user?.tier) :
    tier === 'enterprise' ? isEnterprise(user?.tier) :
    true;

  if (hasAccess) return <>{children}</>;

  return (
    <div className={cn('relative rounded-xl overflow-hidden', className)}>
      {/* Blurred preview */}
      {blurPreview && (
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
          <div className="opacity-30 blur-sm scale-[1.02] transform-gpu">
            {children}
          </div>
        </div>
      )}

      {/* Upgrade overlay */}
      <div className={cn(
        'flex flex-col items-center justify-center text-center p-8 z-10',
        blurPreview ? 'absolute inset-0 backdrop-blur-sm bg-background/70' : 'glass-card min-h-[200px]'
      )}>
        <div className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center mb-4 shadow-lg glow-brand">
          <Lock size={22} className="text-white" />
        </div>
        <h3 className="text-lg font-semibold mb-1">
          {featureName || 'Premium Feature'}
        </h3>
        <p className="text-sm text-muted-foreground mb-5 max-w-xs">
          This feature is available on the{' '}
          <span className="font-semibold text-primary">{tier.charAt(0).toUpperCase() + tier.slice(1)}</span>{' '}
          plan and above.
        </p>
        <Button
          onClick={() => navigate('/pricing')}
          size="sm"
          className="gap-2"
        >
          <Zap size={14} />
          Upgrade to {tier.charAt(0).toUpperCase() + tier.slice(1)}
        </Button>
      </div>

      {/* Invisible placeholder to maintain layout height when blurPreview is false */}
      {!blurPreview && <div className="invisible">{children}</div>}
    </div>
  );
}

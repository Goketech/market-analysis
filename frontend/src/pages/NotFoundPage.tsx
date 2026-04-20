import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        {/* Animated 404 number */}
        <div className="relative mb-6">
          <h1
            className="text-[8rem] font-extrabold leading-none tracking-tighter select-none"
            style={{
              background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(271 81% 56%))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'pulse 3s ease-in-out infinite',
            }}
          >
            404
          </h1>
          <div
            className="absolute inset-0 blur-3xl opacity-20 -z-10"
            style={{
              background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(271 81% 56%))',
            }}
          />
        </div>

        <h2 className="text-xl font-semibold mb-2">Page not found</h2>
        <p className="text-muted-foreground text-sm mb-2">
          The page{' '}
          <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">
            {location.pathname}
          </code>{' '}
          doesn't exist.
        </p>

        {/* Countdown */}
        <p className="text-muted-foreground text-xs mb-6">
          Redirecting to dashboard in{' '}
          <span className="font-mono font-semibold text-primary">{countdown}s</span>
        </p>

        {/* Progress bar */}
        <div className="w-48 h-1 mx-auto bg-muted rounded-full overflow-hidden mb-8">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${((10 - countdown) / 10) * 100}%`,
              background: 'linear-gradient(90deg, hsl(217 91% 60%), hsl(271 81% 56%))',
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft size={14} />
            Go Back
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="gap-2"
          >
            <Home size={14} />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

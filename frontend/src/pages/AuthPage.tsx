import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Eye, EyeOff, Loader2, Chrome } from 'lucide-react';
import { useLogin, useRegister, useGoogleAuth } from '../api/auth.api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const login = useLogin();
  const register = useRegister();
  const googleAuth = useGoogleAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        await login.mutateAsync({ email: form.email, password: form.password });
      } else {
        await register.mutateAsync({ email: form.email, password: form.password, name: form.name });
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Something went wrong');
    }
  };

  const handleGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Get user info from Google
        const { data } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        await googleAuth.mutateAsync({
          googleId: data.id,
          email: data.email,
          name: data.name,
          avatar: data.picture,
        });
        navigate('/dashboard');
      } catch (err: any) {
        setError('Google login failed. Please try again.');
      }
    },
    onError: () => setError('Google login failed. Please try again.'),
  });

  const isLoading = login.isPending || register.isPending || googleAuth.isPending;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40" />
      <div className="absolute top-1/4 -left-64 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="absolute bottom-1/4 -right-64 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl gradient-brand flex items-center justify-center shadow-xl glow-brand">
            <BarChart3 size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Market Intelligence</h1>
            <p className="text-xs text-muted-foreground">Hub</p>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle>{mode === 'login' ? 'Welcome back' : 'Create your account'}</CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Sign in to access real-time market intelligence'
                : 'Start with a free account — upgrade anytime'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google OAuth */}
            <Button
              variant="outline"
              className="w-full gap-3"
              onClick={() => handleGoogle()}
              disabled={isLoading}
            >
              <Chrome size={18} className="text-blue-500" />
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs text-muted-foreground">
                <span className="bg-card px-3">or continue with email</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'register' && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={mode === 'register' ? 'Min. 8 characters' : '••••••••'}
                    required
                    minLength={mode === 'register' ? 8 : undefined}
                    className="w-full h-10 px-3 pr-10 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                className="text-primary font-medium hover:underline"
              >
                {mode === 'login' ? 'Sign up free' : 'Sign in'}
              </button>
            </p>

            {/* Free tier callout */}
            {mode === 'register' && (
              <div className="text-center text-xs text-muted-foreground pt-2 border-t border-border">
                ✅ Free forever · No credit card required · Upgrade anytime
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { useMarketStore } from './store/marketStore';
import { useAuthStore } from './store/authStore';
import { useEffect, lazy, Suspense } from 'react';
import { Skeleton } from './components/ui/skeleton';
import { useWebSocket } from './hooks/useWebSocket';

// Pages (lazy loaded)
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MarketPage = lazy(() => import('./pages/MarketPage'));
const AnalysisPage = lazy(() => import('./pages/AnalysisPage'));
const SentimentPage = lazy(() => import('./pages/SentimentPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Legacy imports kept for backward compat
const BestPerformers5Y = lazy(() => import('./components/BestPerformers5Y').then(m => ({ default: m.BestPerformers5Y })));
const SECFilings = lazy(() => import('./components/SECFilings').then(m => ({ default: m.SECFilings })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function PageLoader() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function AppInner() {
  const { darkMode } = useMarketStore();
  useWebSocket();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth page (no layout) */}
        <Route path="/auth" element={<AuthPage />} />

        {/* Main app with sidebar layout */}
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/sentiment" element={<SentimentPage />} />
          <Route path="/performers" element={
            <Suspense fallback={<PageLoader />}>
              <BestPerformers5Y />
            </Suspense>
          } />
          <Route path="/filings" element={
            <Suspense fallback={<PageLoader />}>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Enter a US stock symbol to view SEC filings.</p>
                <SECFilings symbol="AAPL" />
              </div>
            </Suspense>
          } />
          <Route path="/watchlist" element={
            <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
              <p className="font-medium">Watchlist coming soon</p>
              <p className="text-sm mt-1">Add symbols to track them here.</p>
            </div>
          } />
          <Route path="/alerts" element={
            <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
              <p className="font-medium">Price Alerts</p>
              <p className="text-sm mt-1">Price alert management coming soon.</p>
            </div>
          } />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/settings" element={
            <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
              <p className="font-medium">Settings</p>
              <p className="text-sm mt-1">Account settings coming soon.</p>
            </div>
          } />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppInner />
        </BrowserRouter>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

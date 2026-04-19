import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useMarketStore } from '../../store/marketStore';
import { useEffect } from 'react';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/market': 'Market Overview',
  '/performers': 'Best Performers',
  '/analysis': 'AI Analysis',
  '/sentiment': 'Sentiment Analysis',
  '/filings': 'SEC Filings',
  '/watchlist': 'My Watchlist',
  '/alerts': 'Price Alerts',
  '/pricing': 'Plans & Pricing',
  '/billing': 'Billing',
  '/settings': 'Settings',
};

export function DashboardLayout() {
  const { darkMode } = useMarketStore();
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Market Intelligence Hub';

  // Sync dark mode class to html
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card overflow-y-auto">
        <Sidebar />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto animate-slide-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

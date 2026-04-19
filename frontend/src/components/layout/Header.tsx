import { useState } from 'react';
import { Menu, Moon, Sun, Bell, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useMarketStore } from '../../store/marketStore';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Sidebar } from './Sidebar';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuthStore();
  const { darkMode, toggleDarkMode } = useMarketStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="h-16 border-b border-border glass-card px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-lg hover:bg-accent text-muted-foreground"
        >
          <Menu size={20} />
        </button>

        {/* Page title */}
        {title && (
          <h1 className="hidden lg:block text-lg font-semibold">{title}</h1>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Notifications (placeholder) */}
          <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-500" />
          </button>

          {/* Tier badge */}
          {user && (
            <Badge variant={user.tier as any} className="hidden sm:flex">
              {user.tier.toUpperCase()}
            </Badge>
          )}

          {/* User avatar */}
          {user && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-semibold cursor-pointer">
              {user.name?.[0] || user.email[0].toUpperCase()}
            </div>
          )}
        </div>
      </header>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <span className="font-semibold">Menu</span>
              <button onClick={() => setMobileOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

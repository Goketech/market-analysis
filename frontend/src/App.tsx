import { useState } from 'react';
import { FilterBar } from './components/FilterBar';
import { MarketTable } from './components/MarketTable';
import { AnalysisReport } from './components/AnalysisReport';
import { BestPerformers5Y } from './components/BestPerformers5Y';
import { useMarketStore } from './store/marketStore';
import { useWebSocket } from './hooks/useWebSocket';
import { Trophy, BarChart3, FileText } from 'lucide-react';

function App() {
  const { activeView, setActiveView } = useMarketStore();
  
  // Initialize WebSocket connection for real-time updates
  useWebSocket();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Market Intelligence Hub
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Real-time financial data aggregation and AI-powered analysis
              </p>
            </div>
            <nav className="flex gap-3">
              <button
                onClick={() => setActiveView('table')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'table'
                    ? 'bg-market-blue text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <BarChart3 size={18} />
                Market Table
              </button>
              <button
                onClick={() => setActiveView('bestPerformers')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'bestPerformers'
                    ? 'bg-market-blue text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Trophy size={18} />
                Best Performers 5Y
              </button>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          <aside className="w-64 flex-shrink-0">
            <FilterBar />
          </aside>

          <main className="flex-1">
            {activeView === 'table' && <MarketTable />}
            {activeView === 'analysis' && <AnalysisReport />}
            {activeView === 'bestPerformers' && <BestPerformers5Y />}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;

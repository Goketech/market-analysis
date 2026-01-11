import { useState } from 'react';
import { FilterBar } from './components/FilterBar';
import { MarketTable } from './components/MarketTable';
import { AnalysisReport } from './components/AnalysisReport';
import { useMarketStore } from './store/marketStore';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const { activeView } = useMarketStore();
  
  // Initialize WebSocket connection for real-time updates
  useWebSocket();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Market Intelligence Hub
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time financial data aggregation and AI-powered analysis
          </p>
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
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;

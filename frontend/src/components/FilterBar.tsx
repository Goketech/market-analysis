import { useMarketStore } from '../store/marketStore';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

export function FilterBar() {
  const { filters, setFilters, setActiveView } = useMarketStore();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Filters
      </h2>

      <div className="space-y-4">
        {/* Market Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Market
          </label>
          <select
            value={filters.market}
            onChange={(e) =>
              setFilters({ market: e.target.value as any })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Markets</option>
            <option value="us">US Stocks</option>
            <option value="crypto">Crypto</option>
            <option value="ngx">NGX</option>
          </select>
        </div>

        {/* Timeframe */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Timeframe
          </label>
          <select
            value={filters.timeframe}
            onChange={(e) =>
              setFilters({ timeframe: e.target.value as any })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="ytd">Year to Date</option>
          </select>
        </div>

        {/* Country Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Country (Optional)
          </label>
          <select
            value={filters.country || ''}
            onChange={(e) =>
              setFilters({ country: e.target.value || undefined })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Countries</option>
            <option value="US">United States</option>
            <option value="NG">Nigeria</option>
            <option value="GB">United Kingdom</option>
            <option value="CA">Canada</option>
          </select>
        </div>

        {/* Type (Gainers/Losers) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Type
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters({ type: 'gainers' })}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md font-medium transition-colors ${
                filters.type === 'gainers'
                  ? 'bg-market-green text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <TrendingUp size={16} />
              Gainers
            </button>
            <button
              onClick={() => setFilters({ type: 'losers' })}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md font-medium transition-colors ${
                filters.type === 'losers'
                  ? 'bg-market-red text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <TrendingDown size={16} />
              Losers
            </button>
          </div>
        </div>

        {/* Limit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Results Limit
          </label>
          <select
            value={filters.limit}
            onChange={(e) =>
              setFilters({ limit: parseInt(e.target.value, 10) })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
            <option value={100}>Top 100</option>
          </select>
        </div>

        {/* View Toggle */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveView('table')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-market-blue text-white font-medium hover:bg-blue-600 transition-colors"
          >
            <BarChart3 size={16} />
            Market Table
          </button>
        </div>
      </div>
    </div>
  );
}

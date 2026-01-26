import { useBestPerformers5Y } from '../api/market.api';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';

export function BestPerformers5Y() {
  const [market, setMarket] = useState<string>('us');
  const [sortBy, setSortBy] = useState<'returns' | 'volatility' | 'sharpe'>('returns');
  const { data, isLoading, error } = useBestPerformers5Y(market, 20, sortBy);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-gray-600 dark:text-gray-400">
          Loading 5-year performance data...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-red-600 dark:text-red-400">
          Error loading performance data. Please try again.
        </div>
      </div>
    );
  }

  const performers = data.data || [];
  const hasData = performers.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Best Performers (5 Years)
        </h3>
        <div className="flex items-center gap-3">
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="us">US Stocks</option>
            <option value="crypto">Crypto</option>
            <option value="ngx">NGX</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="returns">By Returns</option>
            <option value="volatility">By Volatility</option>
            <option value="sharpe">By Sharpe Ratio</option>
          </select>
        </div>
      </div>

      {!hasData && (
        <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ No performance data available for {market === 'us' ? 'US Stocks' : market === 'crypto' ? 'Crypto' : 'NGX'} market.
          </p>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
            {market === 'crypto' 
              ? 'This may be due to CoinGecko API rate limits. Please wait a minute and try again.'
              : market === 'ngx'
              ? 'NGX historical data integration is not yet implemented. This feature requires integration with NGX data providers.'
              : 'This may be due to rate limits or missing data sources. Please try again later.'}
          </p>
        </div>
      )}

      {hasData && (
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Symbol</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">5Y Return</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Annualized</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Volatility</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Sharpe</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Max Drawdown</th>
            </tr>
          </thead>
          <tbody>
            {performers.map((perf: any) => (
              <tr key={perf.symbol} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{perf.symbol}</td>
                <td className="py-3 px-4 text-right">
                  <span className={`flex items-center justify-end gap-1 ${perf.fiveYearReturn >= 0 ? 'text-market-green' : 'text-market-red'}`}>
                    {perf.fiveYearReturn >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {perf.fiveYearReturn.toFixed(2)}%
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                  {perf.annualizedReturn.toFixed(2)}%
                </td>
                <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                  {perf.volatility.toFixed(2)}%
                </td>
                <td className="py-3 px-4 text-right text-gray-900 dark:text-white">
                  {perf.sharpeRatio.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-right text-market-red">
                  {perf.maxDrawdown.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

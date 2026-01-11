import { useAnalysisReport } from '../api/market.api';
import { useMarketStore } from '../store/marketStore';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Download } from 'lucide-react';
import { apiClient } from '../api/client';

export function AnalysisReport() {
  const { selectedSymbol, filters, setActiveView, setSelectedSymbol } = useMarketStore();
  const { data, isLoading, error } = useAnalysisReport(
    selectedSymbol || '',
    filters.market
  );

  if (!selectedSymbol) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center text-gray-600 dark:text-gray-400">
          Select a symbol from the table to view analysis
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center text-gray-600 dark:text-gray-400">
          Generating analysis report...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center text-red-600 dark:text-red-400">
          Error loading analysis. Please try again.
        </div>
      </div>
    );
  }

  const report = data.data;
  const { technical, fundamental, sentiment, recommendation } = report;

  const getRecommendationColor = (action: string) => {
    switch (action) {
      case 'BUY':
        return 'bg-market-green text-white';
      case 'SELL':
        return 'bg-market-red text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return <TrendingUp className="text-market-green" size={20} />;
      case 'bearish':
        return <TrendingDown className="text-market-red" size={20} />;
      default:
        return <Minus className="text-gray-500" size={20} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <button
          onClick={() => {
            setSelectedSymbol(null);
            setActiveView('table');
          }}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft size={16} />
          Back to Table
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {report.name} ({report.symbol})
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {report.market.toUpperCase()} • Last updated: {new Date(report.timestamp).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={async () => {
                try {
                  const response = await apiClient.get(
                    `/api/v1/analysis/${report.symbol}/export/pdf`,
                    {
                      params: { market: filters.market },
                      responseType: 'blob',
                    }
                  );
                  const url = window.URL.createObjectURL(new Blob([response.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `${report.symbol}_analysis_${Date.now()}.pdf`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                } catch (error) {
                  console.error('Error exporting PDF:', error);
                  alert('Failed to export PDF. Please try again.');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-market-blue text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              <Download size={16} />
              Export PDF
            </button>
            <div
              className={`px-4 py-2 rounded-lg font-semibold ${getRecommendationColor(
                recommendation.action
              )}`}
            >
              {recommendation.action}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendation Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          AI Recommendation
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {recommendation.confidence}%
            </span>
          </div>
          {recommendation.entryTarget && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Entry Target:</span>
              <span className="font-semibold text-market-green">
                ${recommendation.entryTarget.toFixed(2)}
              </span>
            </div>
          )}
          {recommendation.exitTarget && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Exit Target:</span>
              <span className="font-semibold text-market-red">
                ${recommendation.exitTarget.toFixed(2)}
              </span>
            </div>
          )}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {recommendation.reasoning}
            </p>
          </div>
        </div>
      </div>

      {/* Technical Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Technical Analysis
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">RSI</span>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {technical.rsi.toFixed(2)}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Trend</span>
            <div className="flex items-center gap-2 mt-1">
              {getTrendIcon(technical.trend)}
              <span className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                {technical.trend}
              </span>
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Support</span>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              ${technical.support.toFixed(2)}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Resistance</span>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              ${technical.resistance.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-600 dark:text-gray-400">MACD</span>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div>
              <span className="text-xs text-gray-500">Value</span>
              <p className="text-sm font-medium">{technical.macd.value.toFixed(4)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Signal</span>
              <p className="text-sm font-medium">{technical.macd.signal.toFixed(4)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500">Histogram</span>
              <p className="text-sm font-medium">{technical.macd.histogram.toFixed(4)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fundamental Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Fundamental Analysis
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {fundamental.pe && (
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">P/E Ratio</span>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {fundamental.pe.toFixed(2)}
              </p>
            </div>
          )}
          {fundamental.marketCap && (
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Market Cap</span>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                ${(fundamental.marketCap / 1e9).toFixed(2)}B
              </p>
            </div>
          )}
          {fundamental.volume24h && (
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">24h Volume</span>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                ${(fundamental.volume24h / 1e6).toFixed(2)}M
              </p>
            </div>
          )}
          {fundamental.debt && (
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Debt</span>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                ${(fundamental.debt / 1e6).toFixed(2)}M
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sentiment Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Sentiment Analysis
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Sentiment Score</span>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {sentiment.score.toFixed(2)}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">News Count</span>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {sentiment.newsCount}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Social Sentiment</span>
            <p className="text-xl font-semibold capitalize text-gray-900 dark:text-white">
              {sentiment.socialSentiment}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

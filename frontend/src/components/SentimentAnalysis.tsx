import { useSentiment } from '../api/market.api';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface SentimentAnalysisProps {
  symbol: string;
}

export function SentimentAnalysis({ symbol }: SentimentAnalysisProps) {
  const [refresh, setRefresh] = useState(false);
  const { data, isLoading, error, refetch } = useSentiment(symbol, refresh);

  const handleRefresh = () => {
    setRefresh(true);
    refetch().then(() => setRefresh(false));
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-gray-600 dark:text-gray-400">
          Loading sentiment analysis...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-2">
            Error loading sentiment data
          </p>
          <button
            onClick={handleRefresh}
            className="text-sm text-market-blue hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-gray-600 dark:text-gray-400">
          Loading sentiment analysis...
        </div>
      </div>
    );
  }

  const sentiment = data.data;
  
  // Check if we have real data or just defaults
  const hasRealData = sentiment.sampleSize > 0;
  
  const getSentimentColor = (score: number) => {
    if (score > 60) return 'text-market-green';
    if (score < 40) return 'text-market-red';
    return 'text-gray-500';
  };

  const getSentimentIcon = (score: number) => {
    if (score > 60) return <TrendingUp className="text-market-green" size={20} />;
    if (score < 40) return <TrendingDown className="text-market-red" size={20} />;
    return <Minus className="text-gray-500" size={20} />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sentiment Analysis
        </h3>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          title="Refresh sentiment data"
        >
          <RefreshCw size={16} className={refresh ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {!hasRealData && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ No sentiment data available. Twitter API credentials are required for real-time sentiment analysis.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Overall Sentiment */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-3">
            {getSentimentIcon(sentiment.weightedScore)}
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Weighted Score</span>
              <p className={`text-2xl font-bold ${getSentimentColor(sentiment.weightedScore)}`}>
                {sentiment.weightedScore.toFixed(1)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-600 dark:text-gray-400">Sample Size</span>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {sentiment.sampleSize} tweets
            </p>
          </div>
        </div>

        {/* Sentiment Breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400">Positive</span>
            <p className="text-xl font-semibold text-market-green">
              {sentiment.positiveCount}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400">Neutral</span>
            <p className="text-xl font-semibold text-gray-600 dark:text-gray-400">
              {sentiment.neutralCount}
            </p>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400">Negative</span>
            <p className="text-xl font-semibold text-market-red">
              {sentiment.negativeCount}
            </p>
          </div>
        </div>

        {/* Breakdown by Account Type */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Sentiment by Account Type
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Trusted Accounts</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {sentiment.breakdown.trustedAccounts.score.toFixed(1)} ({sentiment.breakdown.trustedAccounts.count} tweets)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Verified Accounts</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {sentiment.breakdown.verifiedAccounts.score.toFixed(1)} ({sentiment.breakdown.verifiedAccounts.count} tweets)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Regular Accounts</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {sentiment.breakdown.regularAccounts.score.toFixed(1)} ({sentiment.breakdown.regularAccounts.count} tweets)
              </span>
            </div>
          </div>
        </div>

        {sentiment.cached && (
          <div className="pt-2 text-xs text-gray-500 dark:text-gray-400">
            Cached data • Last updated: {new Date(sentiment.lastUpdated).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

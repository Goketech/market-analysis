import { useFilings } from '../api/market.api';
import { FileText, ExternalLink, Calendar } from 'lucide-react';

interface SECFilingsProps {
  symbol: string;
}

export function SECFilings({ symbol }: SECFilingsProps) {
  const { data, isLoading, error } = useFilings(symbol, undefined, false, 10);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-gray-600 dark:text-gray-400">
          Loading SEC filings...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center text-red-600 dark:text-red-400">
          Error loading SEC filings. Please try again.
        </div>
      </div>
    );
  }

  const filings = data.data;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        SEC Filings
      </h3>

      {filings.filings.length === 0 ? (
        <div className="text-center text-gray-600 dark:text-gray-400 py-8">
          No SEC filings found for {symbol}
        </div>
      ) : (
        <div className="space-y-3">
          {filings.filings.map((filing: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-gray-500 dark:text-gray-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {filing.filingType}
                    </span>
                    {filing === filings.latest10K || filing === filings.latest10Q ? (
                      <span className="text-xs px-2 py-0.5 bg-market-blue text-white rounded">
                        Latest
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar size={12} />
                    <span>
                      Filed: {new Date(filing.filingDate).toLocaleDateString()}
                    </span>
                    {filing.periodEnd && (
                      <>
                        <span>•</span>
                        <span>
                          Period: {new Date(filing.periodEnd).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <a
                href={filing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1 text-sm text-market-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                <ExternalLink size={14} />
                View
              </a>
            </div>
          ))}
        </div>
      )}

      {filings.latest10K && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Latest 10-K Metrics
          </h4>
          {filings.latest10K.metrics ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {filings.latest10K.metrics.revenue && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Revenue:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    ${(filings.latest10K.metrics.revenue / 1e9).toFixed(2)}B
                  </p>
                </div>
              )}
              {filings.latest10K.metrics.netIncome && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Net Income:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    ${(filings.latest10K.metrics.netIncome / 1e9).toFixed(2)}B
                  </p>
                </div>
              )}
              {filings.latest10K.metrics.earningsPerShare && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">EPS:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    ${filings.latest10K.metrics.earningsPerShare.toFixed(2)}
                  </p>
                </div>
              )}
              {filings.latest10K.metrics.totalDebt && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total Debt:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    ${(filings.latest10K.metrics.totalDebt / 1e9).toFixed(2)}B
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Metrics not extracted. Click "View" to see full filing.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

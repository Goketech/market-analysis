import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Download, Zap, Activity, BarChart2 } from 'lucide-react';
import { useAnalysisReport } from '../api/market.api';
import { useMarketStore } from '../store/marketStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { FeatureGate } from '../components/gates/FeatureGate';
import { apiClient } from '../api/client';
import { formatCurrency } from '../lib/utils';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';

export default function AnalysisPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { filters } = useMarketStore();
  const [symbol, setSymbol] = useState(location.state?.symbol || '');
  const [market, setMarket] = useState(location.state?.market || filters.market);
  const [inputSymbol, setInputSymbol] = useState('');

  const { data, isLoading, error } = useAnalysisReport(symbol, market === 'all' ? 'us' : market);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputSymbol.trim()) {
      setSymbol(inputSymbol.trim().toUpperCase());
    }
  };

  const report = data?.data;
  const technical = report?.technical;
  const recommendation = report?.recommendation;

  const radarData = technical ? [
    { subject: 'RSI', value: technical.rsi, fullMark: 100 },
    { subject: 'MACD', value: Math.max(0, Math.min(100, (technical.macd.histogram + 5) * 10)), fullMark: 100 },
    { subject: 'Trend', value: technical.trend === 'bullish' ? 80 : technical.trend === 'bearish' ? 20 : 50, fullMark: 100 },
    { subject: 'Support', value: 60, fullMark: 100 },
    { subject: 'Sentiment', value: report?.sentiment.score || 50, fullMark: 100 },
  ] : [];

  const exportPdf = async () => {
    try {
      const response = await apiClient.get(`/api/v1/analysis/${symbol}/export/pdf`, {
        params: { market }, responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${symbol}_analysis_${Date.now()}.pdf`;
      a.click();
    } catch {
      alert('Export failed. This feature requires a Pro subscription.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Symbol search */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-3 items-center">
            <input
              type="text"
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
              placeholder="Enter symbol (e.g., AAPL, BTC, DANGOTE)"
              className="flex-1 h-10 px-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <select
              value={market === 'all' ? 'us' : market}
              onChange={(e) => setMarket(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none"
            >
              <option value="us">US Stocks</option>
              <option value="crypto">Crypto</option>
              <option value="ngx">NGX</option>
            </select>
            <Button type="submit" className="gap-2">
              <Zap size={15} /> Analyze
            </Button>
          </form>
        </CardContent>
      </Card>

      {!symbol && (
        <div className="text-center py-20 text-muted-foreground">
          <Zap size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Enter a symbol to generate AI analysis</p>
          <p className="text-sm mt-1">Try AAPL, bitcoin, DANGOTE...</p>
        </div>
      )}

      {symbol && isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      )}

      {symbol && error && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p className="text-destructive">Failed to load analysis. Make sure the symbol is correct.</p>
            <p className="text-sm mt-1 text-muted-foreground">Note: Analysis requires authentication (3/day free, 50/day pro)</p>
          </CardContent>
        </Card>
      )}

      {report && (
        <>
          {/* Header */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{report.symbol}</h2>
                  <p className="text-muted-foreground">{report.name} · {report.market.toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last updated: {new Date(report.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={exportPdf} className="gap-1.5">
                    <Download size={13} /> Export PDF
                  </Button>
                  <div className={`px-4 py-2 rounded-xl font-bold text-sm ${
                    recommendation?.action === 'BUY' ? 'market-buy' :
                    recommendation?.action === 'SELL' ? 'market-sell' : 'market-hold'
                  }`}>
                    {recommendation?.action}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* AI Recommendation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap size={16} className="text-primary" /> AI Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full gradient-brand"
                        style={{ width: `${recommendation?.confidence}%` }}
                      />
                    </div>
                    <span className="font-semibold">{recommendation?.confidence}%</span>
                  </div>
                </div>
                {recommendation?.entryTarget && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Entry Target</span>
                    <span className="font-semibold text-emerald-500">{formatCurrency(recommendation.entryTarget)}</span>
                  </div>
                )}
                {recommendation?.exitTarget && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Exit Target</span>
                    <span className="font-semibold text-rose-500">{formatCurrency(recommendation.exitTarget)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-border">
                  <p className="text-sm text-muted-foreground leading-relaxed">{recommendation?.reasoning}</p>
                </div>
              </CardContent>
            </Card>

            {/* Technical Radar */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity size={16} className="text-primary" /> Technical Indicators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: 'RSI', value: technical?.rsi.toFixed(1) },
                    { label: 'Trend', value: technical?.trend, color: technical?.trend === 'bullish' ? 'text-emerald-500' : technical?.trend === 'bearish' ? 'text-rose-500' : 'text-amber-500' },
                    { label: 'Support', value: technical?.support ? formatCurrency(technical.support) : 'N/A' },
                    { label: 'Resistance', value: technical?.resistance ? formatCurrency(technical.resistance) : 'N/A' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                      <p className={`text-base font-semibold capitalize ${color || ''}`}>{value}</p>
                    </div>
                  ))}
                </div>
                {radarData.length > 0 && (
                  <ResponsiveContainer width="100%" height={150}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgb(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'rgb(var(--muted-foreground))' }} />
                      <Radar dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Fundamental Analysis */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart2 size={16} className="text-primary" /> Fundamentals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {report.fundamental.pe && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">P/E Ratio</p>
                      <p className="text-lg font-semibold">{report.fundamental.pe.toFixed(2)}</p>
                    </div>
                  )}
                  {report.fundamental.marketCap && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Market Cap</p>
                      <p className="text-lg font-semibold">${(report.fundamental.marketCap / 1e9).toFixed(2)}B</p>
                    </div>
                  )}
                  {report.fundamental.volume24h && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">24h Volume</p>
                      <p className="text-lg font-semibold">${(report.fundamental.volume24h / 1e6).toFixed(2)}M</p>
                    </div>
                  )}
                  {report.fundamental.debt && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Total Debt</p>
                      <p className="text-lg font-semibold">${(report.fundamental.debt / 1e6).toFixed(2)}M</p>
                    </div>
                  )}
                  {!report.fundamental.pe && !report.fundamental.marketCap && (
                    <p className="text-sm text-muted-foreground col-span-2">No fundamental data available for this symbol.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* MACD Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">MACD</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Value', value: technical?.macd.value.toFixed(4) },
                    { label: 'Signal', value: technical?.macd.signal.toFixed(4) },
                    { label: 'Histogram', value: technical?.macd.histogram.toFixed(4), color: (technical?.macd.histogram || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{label}</p>
                      <p className={`text-sm font-semibold font-mono ${color || ''}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Newspaper } from 'lucide-react';
import { useSentiment } from '../api/market.api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { FeatureGate } from '../components/gates/FeatureGate';
import { useAuthStore } from '../store/authStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

function SentimentPageContent({ symbol, market }: { symbol: string; market: string }) {
  const [refresh, setRefresh] = useState(false);
  const { data, isLoading, refetch } = useSentiment(symbol, refresh);

  const handleRefresh = () => {
    setRefresh(true);
    refetch().finally(() => setRefresh(false));
  };

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-32 rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );

  const s = data?.data;
  if (!s) return null;

  const breakdownData = [
    { name: 'Positive', value: s.positiveCount, fill: '#10b981' },
    { name: 'Neutral', value: s.neutralCount, fill: '#f59e0b' },
    { name: 'Negative', value: s.negativeCount, fill: '#ef4444' },
  ];

  const categoryData = [
    { name: 'Trusted', score: s.breakdown.trustedAccounts.score.toFixed(1), count: s.breakdown.trustedAccounts.count },
    { name: 'Verified', score: s.breakdown.verifiedAccounts.score.toFixed(1), count: s.breakdown.verifiedAccounts.count },
    { name: 'Regular', score: s.breakdown.regularAccounts.score.toFixed(1), count: s.breakdown.regularAccounts.count },
  ];

  const sentimentIcon = s.score > 57
    ? <TrendingUp size={20} className="text-emerald-500" />
    : s.score < 43
    ? <TrendingDown size={20} className="text-rose-500" />
    : <Minus size={20} className="text-amber-500" />;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {sentimentIcon}
              <div>
                <p className="text-3xl font-bold">{s.score.toFixed(0)}<span className="text-sm text-muted-foreground">/100</span></p>
                <Badge variant={s.label as any}>{s.label.toUpperCase()}</Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{s.sampleSize} articles analyzed</p>
              {s.cached && <p className="text-xs text-muted-foreground">Cached · {new Date(s.lastUpdated).toLocaleTimeString()}</p>}
              <Button size="sm" variant="outline" onClick={handleRefresh} className="mt-2 gap-1.5">
                <RefreshCw size={13} className={refresh ? 'animate-spin' : ''} /> Refresh
              </Button>
            </div>
          </div>
          {s.aiSummary && (
            <p className="text-sm text-muted-foreground mt-4 pt-4 border-t border-border leading-relaxed">
              🤖 <strong>AI Summary:</strong> {s.aiSummary}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Sentiment breakdown pie */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Sentiment Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={breakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {breakdownData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source breakdown bar */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Score by Source Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgb(var(--muted-foreground))' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'rgb(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'rgb(var(--card))', border: '1px solid rgb(var(--border))', borderRadius: 8 }} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {categoryData.map((entry) => (
                    <Cell key={entry.name} fill={parseFloat(entry.score) > 55 ? '#10b981' : parseFloat(entry.score) < 45 ? '#ef4444' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top articles */}
      {s.topArticles && s.topArticles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Newspaper size={15} /> Recent News
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.topArticles.map((article: any, i: number) => (
              <a
                key={i}
                href={article.url !== '#' ? article.url : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
              >
                <Badge variant={article.sentiment as any} className="shrink-0 mt-0.5">{article.sentiment}</Badge>
                <div className="min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{article.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{article.source} · Score: {article.score}</p>
                </div>
              </a>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SentimentPage() {
  const { user } = useAuthStore();
  const [symbol, setSymbol] = useState('AAPL');
  const [market, setMarket] = useState('us');
  const [inputSymbol, setInputSymbol] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputSymbol.trim()) setSymbol(inputSymbol.trim().toUpperCase());
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={inputSymbol}
              onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
              placeholder="Enter symbol (e.g., AAPL, BTC)"
              className="flex-1 h-10 px-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <Button type="submit">Analyze Sentiment</Button>
          </form>
        </CardContent>
      </Card>

      <FeatureGate tier="pro" featureName="Sentiment Analysis" blurPreview>
        <SentimentPageContent symbol={symbol} market={market} />
      </FeatureGate>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, flexRender,
  createColumnHelper, SortingState, getPaginationRowModel, getFilteredRowModel,
} from '@tanstack/react-table';
import { Search, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { useTopPerformers } from '../api/market.api';
import { useMarketStore } from '../store/marketStore';
import { MarketData } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { formatCurrency, formatPercent, formatVolume } from '../lib/utils';

const columnHelper = createColumnHelper<MarketData>();

export default function MarketPage() {
  const navigate = useNavigate();
  const { filters, setFilters } = useMarketStore();
  const { data, isLoading } = useTopPerformers(filters);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = [
    columnHelper.accessor('symbol', {
      header: 'Symbol',
      cell: (info) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {info.getValue().slice(0, 2)}
          </div>
          <span className="font-semibold">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('name', {
      header: 'Name',
      cell: (info) => <span className="text-muted-foreground text-sm truncate max-w-[160px] block">{info.getValue()}</span>,
    }),
    columnHelper.accessor('market', {
      header: 'Market',
      cell: (info) => (
        <Badge variant="outline" className="text-xs">{info.getValue().toUpperCase()}</Badge>
      ),
    }),
    columnHelper.accessor('price', {
      header: 'Price',
      cell: (info) => <span className="font-mono font-medium">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('change', {
      header: 'Change',
      cell: (info) => {
        const v = info.getValue();
        return (
          <span className={v >= 0 ? 'table-cell-positive' : 'table-cell-negative'}>
            {v >= 0 ? '+' : ''}{v.toFixed(2)}
          </span>
        );
      },
    }),
    columnHelper.accessor('changePercent', {
      header: 'Change %',
      cell: (info) => {
        const v = info.getValue();
        return (
          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${v >= 0 ? 'market-buy' : 'market-sell'}`}>
            {v >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
            {Math.abs(v).toFixed(2)}%
          </div>
        );
      },
    }),
    columnHelper.accessor('volume', {
      header: 'Volume',
      cell: (info) => <span className="font-mono text-sm text-muted-foreground">{formatVolume(info.getValue())}</span>,
    }),
  ];

  const table = useReactTable({
    data: data?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _, filterValue) => {
      const q = filterValue.toLowerCase();
      return (row.getValue('symbol') as string).toLowerCase().includes(q) ||
             (row.getValue('name') as string).toLowerCase().includes(q);
    },
    state: { sorting, globalFilter },
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Market filter */}
            <div className="flex gap-1.5">
              {(['all', 'us', 'crypto', 'ngx'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setFilters({ market: m })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filters.market === m ? 'gradient-brand text-white shadow-sm' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Gainers/Losers */}
            <div className="flex gap-1.5">
              {(['gainers', 'losers'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilters({ type: t })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filters.type === t ? (t === 'gainers' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Timeframe */}
            <div className="flex gap-1.5 ml-auto">
              {(['daily', 'weekly', 'monthly', 'ytd'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setFilters({ timeframe: tf })}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${filters.timeframe === tf ? 'bg-secondary border border-primary/40 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base">
              {filters.type === 'gainers' ? '📈 Top Gainers' : '📉 Top Losers'}
              {data && <span className="text-sm font-normal text-muted-foreground ml-2">({data.data.length} results)</span>}
            </CardTitle>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <input
                type="text"
                placeholder="Search symbol or name..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="w-full h-9 pl-9 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id} className="border-b border-border bg-muted/50">
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1.5">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className="text-muted-foreground/50">
                              {header.column.getIsSorted() === 'asc' ? <ArrowUp size={12} /> :
                               header.column.getIsSorted() === 'desc' ? <ArrowDown size={12} /> :
                               <ArrowUpDown size={12} />}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Action</th>
                  </tr>
                ))}
              </thead>
              <tbody>
                {isLoading ? (
                  Array(10).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array(7).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-6 w-full" /></td>
                      ))}
                      <td className="px-4 py-3"><Skeleton className="h-7 w-20" /></td>
                    </tr>
                  ))
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border hover:bg-accent/50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs h-7"
                          onClick={() => navigate('/analysis', { state: { symbol: row.original.symbol, market: row.original.market } })}
                        >
                          <Zap size={11} /> Analyze
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {table.getPageCount() > 1 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </p>
              <div className="flex gap-1.5">
                <Button size="icon" variant="outline" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                  <ChevronLeft size={15} />
                </Button>
                <Button size="icon" variant="outline" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                  <ChevronRight size={15} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

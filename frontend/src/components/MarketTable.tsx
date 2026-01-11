import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  getPaginationRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';
import { useState } from 'react';
import { useTopPerformers } from '../api/market.api';
import { useMarketStore } from '../store/marketStore';
import { MarketData } from '../api/client';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const columnHelper = createColumnHelper<MarketData>();

export function MarketTable() {
  const { filters, setSelectedSymbol, setActiveView } = useMarketStore();
  const { data, isLoading, error } = useTopPerformers(filters);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = [
    columnHelper.accessor('symbol', {
      header: 'Symbol',
      cell: (info) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('name', {
      header: 'Name',
      cell: (info) => (
        <span className="text-gray-700 dark:text-gray-300">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('price', {
      header: 'Price',
      cell: (info) => (
        <span className="font-medium text-gray-900 dark:text-white">
          ${info.getValue().toFixed(2)}
        </span>
      ),
    }),
    columnHelper.accessor('change', {
      header: 'Change',
      cell: (info) => {
        const value = info.getValue();
        const isPositive = value >= 0;
        return (
          <span
            className={isPositive ? 'table-cell-positive' : 'table-cell-negative'}
          >
            {isPositive ? '+' : ''}
            {value.toFixed(2)}
          </span>
        );
      },
    }),
    columnHelper.accessor('changePercent', {
      header: 'Change %',
      cell: (info) => {
        const value = info.getValue();
        const isPositive = value >= 0;
        return (
          <span
            className={isPositive ? 'table-cell-positive' : 'table-cell-negative'}
          >
            {isPositive ? '+' : ''}
            {value.toFixed(2)}%
          </span>
        );
      },
    }),
    columnHelper.accessor('volume', {
      header: 'Volume',
      cell: (info) => {
        const volume = info.getValue();
        if (volume >= 1e9) {
          return `${(volume / 1e9).toFixed(2)}B`;
        } else if (volume >= 1e6) {
          return `${(volume / 1e6).toFixed(2)}M`;
        } else if (volume >= 1e3) {
          return `${(volume / 1e3).toFixed(2)}K`;
        }
        return volume.toFixed(0);
      },
    }),
    columnHelper.accessor('market', {
      header: 'Market',
      cell: (info) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          {info.getValue().toUpperCase()}
        </span>
      ),
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
    globalFilterFn: (row, columnId, filterValue) => {
      const searchValue = filterValue.toLowerCase();
      const symbol = row.getValue('symbol') as string;
      const name = row.getValue('name') as string;
      return (
        symbol.toLowerCase().includes(searchValue) ||
        name.toLowerCase().includes(searchValue)
      );
    },
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: filters.limit || 20,
      },
    },
  });

  const handleRowClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveView('analysis');
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center text-gray-600 dark:text-gray-400">
          Loading market data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center text-red-600 dark:text-red-400">
          Error loading market data. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by symbol or name..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-market-blue"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="text-gray-400">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp size={14} />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDown size={14} />
                          ) : (
                            <ArrowUpDown size={14} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => handleRowClick(row.original.symbol)}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.getRowModel().rows.length === 0 && (
        <div className="p-8 text-center text-gray-600 dark:text-gray-400">
          {globalFilter ? 'No results found' : 'No data available'}
        </div>
      )}

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { SECProvider, SECFiling, FilingMetrics } from '../providers/sec.provider';
import { Pool } from 'pg';

export interface FilingServiceResult {
  symbol: string;
  filings: (SECFiling & { metrics?: FilingMetrics })[];
  latest10K: (SECFiling & { metrics?: FilingMetrics }) | null;
  latest10Q: (SECFiling & { metrics?: FilingMetrics }) | null;
}

export class FilingsService {
  private secProvider: SECProvider;
  private db: Pool | null = null;

  constructor() {
    this.secProvider = new SECProvider();

    // Initialize database connection if available
    try {
      this.db = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'market_intelligence',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      });
    } catch (error) {
      console.warn('Database not available, filings will not be cached');
      this.db = null;
    }
  }

  /**
   * Get SEC filings for a symbol
   */
  async getFilings(
    symbol: string,
    filingType?: '10-K' | '10-Q',
    includeMetrics: boolean = false,
    limit: number = 10
  ): Promise<FilingServiceResult> {
    // Check cache first
    if (this.db && !includeMetrics) {
      const cached = await this.getCachedFilings(symbol, filingType);
      if (cached && cached.filings.length > 0) {
        return cached;
      }
    }

    // Fetch from SEC
      let filings: any[] = [];
      try {
        filings = await this.secProvider.getFilingsByTicker(symbol, filingType);
      } catch (error: any) {
        // If CIK not found, return empty structure (expected for non-US stocks)
        if (error?.message?.includes('Could not find CIK')) {
          return {
            symbol: symbol.toUpperCase(),
            latest10K: null,
            latest10Q: null,
            otherFilings: [],
          };
        }
        throw error; // Re-throw other errors
      }

    // Limit results
    const limitedFilings = filings.slice(0, limit);

    // Extract metrics if requested (this is slow, so we do it selectively)
    const filingsWithMetrics: (SECFiling & { metrics?: FilingMetrics })[] = [];
    
    if (includeMetrics) {
      for (const filing of limitedFilings) {
        if (filing.filingType === '10-K' || filing.filingType === '10-Q') {
          try {
            const metrics = await this.secProvider.extractFilingMetrics(filing);
            filingsWithMetrics.push({ ...filing, metrics });
          } catch (error) {
            console.warn(`Failed to extract metrics for ${filing.url}:`, error);
            filingsWithMetrics.push(filing);
          }
        } else {
          filingsWithMetrics.push(filing);
        }
      }
    } else {
      filingsWithMetrics.push(...limitedFilings);
    }

    // Find latest 10-K and 10-Q
    const latest10K = filingsWithMetrics.find(f => f.filingType === '10-K') || null;
    const latest10Q = filingsWithMetrics.find(f => f.filingType === '10-Q') || null;

    const result: FilingServiceResult = {
      symbol: symbol.toUpperCase(),
      filings: filingsWithMetrics,
      latest10K,
      latest10Q,
    };

    // Cache result
    if (this.db) {
      await this.cacheFilings(result);
    }

    return result;
  }

  /**
   * Get cached filings from database
   */
  private async getCachedFilings(
    symbol: string,
    filingType?: '10-K' | '10-Q'
  ): Promise<FilingServiceResult | null> {
    if (!this.db) return null;

    try {
      let query = 'SELECT * FROM sec_filings WHERE symbol = $1';
      const params: any[] = [symbol.toUpperCase()];

      if (filingType) {
        query += ' AND filing_type = $2';
        params.push(filingType);
      }

      query += ' ORDER BY filing_date DESC LIMIT 10';

      const result = await this.db.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      const filings = result.rows.map((row) => ({
        symbol: row.symbol,
        filingType: row.filing_type as SECFiling['filingType'],
        filingDate: new Date(row.filing_date),
        periodEnd: row.period_end ? new Date(row.period_end) : null,
        url: row.url,
        accessionNumber: '',
        companyName: '',
        metrics: row.metrics || undefined,
      }));

      const latest10K = filings.find(f => f.filingType === '10-K') || null;
      const latest10Q = filings.find(f => f.filingType === '10-Q') || null;

      return {
        symbol: symbol.toUpperCase(),
        filings,
        latest10K,
        latest10Q,
      };
    } catch (error) {
      console.error('Error reading cached filings:', error);
      return null;
    }
  }

  /**
   * Cache filings in database
   */
  private async cacheFilings(result: FilingServiceResult): Promise<void> {
    if (!this.db) return;

    try {
      for (const filing of result.filings) {
        await this.db.query(
          `INSERT INTO sec_filings 
           (symbol, filing_type, filing_date, period_end, url, metrics)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (symbol, filing_type, filing_date) 
           DO UPDATE SET 
             period_end = EXCLUDED.period_end,
             url = EXCLUDED.url,
             metrics = EXCLUDED.metrics`,
          [
            result.symbol,
            filing.filingType,
            filing.filingDate,
            filing.periodEnd,
            filing.url,
            filing.metrics ? JSON.stringify(filing.metrics) : null,
          ]
        );
      }
    } catch (error) {
      console.error('Error caching filings:', error);
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.end();
    }
  }
}

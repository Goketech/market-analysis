import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SECFiling {
  symbol: string;
  filingType: '10-K' | '10-Q' | '8-K' | 'DEF 14A' | 'OTHER';
  filingDate: Date;
  periodEnd: Date | null;
  url: string;
  accessionNumber: string;
  companyName: string;
}

export interface FilingMetrics {
  revenue?: number;
  netIncome?: number;
  earningsPerShare?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  totalDebt?: number;
  cashAndEquivalents?: number;
  operatingCashFlow?: number;
  freeCashFlow?: number;
  sharesOutstanding?: number;
}

export class SECProvider {
  private baseUrl = 'https://data.sec.gov';
  private userAgent: string;

  constructor() {
    // SEC requires a User-Agent header identifying the requester
    this.userAgent = process.env.SEC_USER_AGENT || 'Market Intelligence Hub (contact@example.com)';
  }

  /**
   * Get SEC filings for a company by CIK (Central Index Key)
   */
  async getFilingsByCIK(cik: string, filingType?: '10-K' | '10-Q'): Promise<SECFiling[]> {
    try {
      // Pad CIK with zeros to 10 digits
      const paddedCIK = cik.padStart(10, '0');
      
      const response = await axios.get(
        `${this.baseUrl}/submissions/CIK${paddedCIK}.json`,
        {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'application/json',
          },
          timeout: 10000,
        }
      );

      const filings: SECFiling[] = [];
      const recentFilings = response.data.filings?.recent || {};

      if (!recentFilings.form || recentFilings.form.length === 0) {
        return filings;
      }

      // Process filings
      for (let i = 0; i < recentFilings.form.length; i++) {
        const form = recentFilings.form[i];
        const filingDate = recentFilings.filingDate?.[i];
        const accessionNumber = recentFilings.accessionNumber?.[i];

        // Filter by filing type if specified
        if (filingType && form !== filingType) {
          continue;
        }

        // Only process 10-K and 10-Q for now
        if (form !== '10-K' && form !== '10-Q' && form !== '8-K') {
          continue;
        }

        if (filingDate && accessionNumber) {
          const url = this.buildFilingURL(cik, accessionNumber);
          
          filings.push({
            symbol: response.data.tickerSymbols?.[0] || '',
            filingType: form as SECFiling['filingType'],
            filingDate: new Date(filingDate),
            periodEnd: this.parsePeriodEnd(recentFilings.reportDate?.[i]),
            url,
            accessionNumber: accessionNumber.replace(/-/g, ''),
            companyName: response.data.name || '',
          });
        }
      }

      // Sort by filing date (most recent first)
      filings.sort((a, b) => b.filingDate.getTime() - a.filingDate.getTime());

      return filings;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn(`CIK ${cik} not found in SEC database`);
        return [];
      }
      console.error(`Error fetching SEC filings for CIK ${cik}:`, error.message);
      throw error;
    }
  }

  /**
   * Get CIK (Central Index Key) for a ticker symbol
   */
  async getCIKByTicker(symbol: string): Promise<string | null> {
    try {
      // SEC provides a ticker-to-CIK mapping
      // Try the correct endpoint - SEC EDGAR API structure
      // The correct endpoint is /files/company_tickers.json on data.sec.gov
      // If that fails, try alternative formats
      const endpoints = [
        `https://www.sec.gov/files/company_tickers.json`, // Primary endpoint
        `${this.baseUrl}/files/company_tickers.json`, // Alternative
        `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${symbol}`, // Direct CIK lookup (fallback)
      ];

      let tickers: any = null;

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, {
            headers: {
              'User-Agent': this.userAgent,
              'Accept': 'application/json',
            },
            timeout: 10000,
          });
          tickers = response.data;
          break; // Success, exit loop
        } catch (error: any) {
          // Capture error for potential debugging
          // If it's a 404, try next endpoint
          if (error.response?.status === 404) {
            continue;
          }
          // For other errors, log and continue
          console.warn(`Failed to fetch from ${endpoint}:`, error.message);
        }
      }

      if (!tickers) {
        // If all endpoints failed, return null silently (not an error for non-US stocks)
        return null;
      }
      
      // Search for the symbol (case-insensitive)
      // The data structure might be an object with numeric keys or an array
      if (Array.isArray(tickers)) {
        for (const company of tickers) {
          if (company.ticker && company.ticker.toUpperCase() === symbol.toUpperCase()) {
            return company.cik_str?.toString().padStart(10, '0') || company.cik?.toString().padStart(10, '0') || null;
          }
        }
      } else {
        // Object structure
        for (const key in tickers) {
          const company = tickers[key];
          if (company.ticker && company.ticker.toUpperCase() === symbol.toUpperCase()) {
            return company.cik_str?.toString().padStart(10, '0') || company.cik?.toString().padStart(10, '0') || null;
          }
        }
      }

      return null;
    } catch (error: any) {
      // Only log if it's not a 404 (expected for non-US stocks)
      if (error.response?.status !== 404) {
        console.warn(`Error fetching CIK for symbol ${symbol}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Get filings for a ticker symbol
   */
  async getFilingsByTicker(symbol: string, filingType?: '10-K' | '10-Q'): Promise<SECFiling[]> {
    const cik = await this.getCIKByTicker(symbol);
    if (!cik) {
      // Return empty array instead of throwing - this is expected for non-US stocks
      return [];
    }

    return this.getFilingsByCIK(cik, filingType);
  }

  /**
   * Extract metrics from a 10-K or 10-Q filing
   */
  async extractFilingMetrics(filing: SECFiling): Promise<FilingMetrics> {
    try {
      // Fetch the filing document
      const response = await axios.get(filing.url, {
        headers: {
          'User-Agent': this.userAgent,
        },
        timeout: 30000,
        maxContentLength: 50 * 1024 * 1024, // 50MB max
      });

      // Parse HTML/XBRL
      const $ = cheerio.load(response.data);
      
      const metrics: FilingMetrics = {};

      // Try to extract from XBRL data
      // This is a simplified extraction - in production, you'd want a proper XBRL parser
      const text = $.text().toLowerCase();

      // Extract revenue (simplified regex patterns)
      const revenueMatch = text.match(/revenue[:\s]+[\$]?([\d,]+\.?\d*)\s*(?:million|billion|thousand)?/i);
      if (revenueMatch) {
        let value = parseFloat(revenueMatch[1].replace(/,/g, ''));
        if (text.includes('billion')) value *= 1000000000;
        else if (text.includes('million')) value *= 1000000;
        else if (text.includes('thousand')) value *= 1000;
        metrics.revenue = value;
      }

      // Extract net income
      const netIncomeMatch = text.match(/net income[:\s]+[\$]?([\d,]+\.?\d*)\s*(?:million|billion|thousand)?/i);
      if (netIncomeMatch) {
        let value = parseFloat(netIncomeMatch[1].replace(/,/g, ''));
        if (text.includes('billion')) value *= 1000000000;
        else if (text.includes('million')) value *= 1000000;
        else if (text.includes('thousand')) value *= 1000;
        metrics.netIncome = value;
      }

      // Extract EPS
      const epsMatch = text.match(/earnings per share[:\s]+[\$]?([\d,]+\.?\d*)/i);
      if (epsMatch) {
        metrics.earningsPerShare = parseFloat(epsMatch[1].replace(/,/g, ''));
      }

      // Extract total assets
      const assetsMatch = text.match(/total assets[:\s]+[\$]?([\d,]+\.?\d*)\s*(?:million|billion|thousand)?/i);
      if (assetsMatch) {
        let value = parseFloat(assetsMatch[1].replace(/,/g, ''));
        if (text.includes('billion')) value *= 1000000000;
        else if (text.includes('million')) value *= 1000000;
        else if (text.includes('thousand')) value *= 1000;
        metrics.totalAssets = value;
      }

      // Extract total debt
      const debtMatch = text.match(/total debt[:\s]+[\$]?([\d,]+\.?\d*)\s*(?:million|billion|thousand)?/i);
      if (debtMatch) {
        let value = parseFloat(debtMatch[1].replace(/,/g, ''));
        if (text.includes('billion')) value *= 1000000000;
        else if (text.includes('million')) value *= 1000000;
        else if (text.includes('thousand')) value *= 1000;
        metrics.totalDebt = value;
      }

      return metrics;
    } catch (error) {
      console.error(`Error extracting metrics from filing ${filing.url}:`, error);
      return {};
    }
  }

  /**
   * Build filing URL from CIK and accession number
   */
  private buildFilingURL(cik: string, accessionNumber: string): string {
    const cleanAccession = accessionNumber.replace(/-/g, '');
    const paddedCIK = cik.padStart(10, '0');
    return `${this.baseUrl}/cgi-bin/viewer?action=view&cik=${paddedCIK}&accession_number=${cleanAccession}&xbrl_type=v`;
  }

  /**
   * Parse period end date
   */
  private parsePeriodEnd(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    try {
      return new Date(dateStr);
    } catch {
      return null;
    }
  }
}

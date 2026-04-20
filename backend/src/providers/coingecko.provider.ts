import axios from 'axios';
import { MarketData } from '../services/market.service';

// Map of common ticker symbols to CoinGecko coin IDs
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  btc: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana',
  bnb: 'binancecoin',
  xrp: 'ripple',
  ada: 'cardano',
  doge: 'dogecoin',
  dot: 'polkadot',
  matic: 'matic-network',
  pol: 'matic-network',
  avax: 'avalanche-2',
  link: 'chainlink',
  atom: 'cosmos',
  uni: 'uniswap',
  ltc: 'litecoin',
  shib: 'shiba-inu',
  trx: 'tron',
  near: 'near',
  xlm: 'stellar',
  apt: 'aptos',
  arb: 'arbitrum',
  op: 'optimism',
  sui: 'sui',
  ton: 'the-open-network',
  fil: 'filecoin',
  icp: 'internet-computer',
  vet: 'vechain',
  hbar: 'hedera-hashgraph',
  algo: 'algorand',
  ftm: 'fantom',
  aave: 'aave',
  mkr: 'maker',
  sand: 'the-sandbox',
  mana: 'decentraland',
  axs: 'axie-infinity',
  crv: 'curve-dao-token',
  snx: 'havven',
  comp: 'compound-governance-token',
  usdt: 'tether',
  usdc: 'usd-coin',
  dai: 'dai',
  pepe: 'pepe',
  wbtc: 'wrapped-bitcoin',
  leo: 'leo-token',
  okb: 'okb',
  kas: 'kaspa',
  etc: 'ethereum-classic',
  bch: 'bitcoin-cash',
};

export class CoinGeckoProvider {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private apiKey: string | undefined;
  // Runtime cache for search-resolved IDs
  private resolvedIdCache: Map<string, string> = new Map();

  constructor() {
    this.apiKey = process.env.COINGECKO_API_KEY;
  }

  /**
   * Resolves a ticker symbol (e.g. "btc") to a CoinGecko coin ID (e.g. "bitcoin").
   * Uses a hardcoded map for common coins, then falls back to the search API.
   */
  async resolveSymbolToId(symbol: string): Promise<string> {
    const lower = symbol.toLowerCase();

    // 1. Check hardcoded map
    if (SYMBOL_TO_COINGECKO_ID[lower]) {
      return SYMBOL_TO_COINGECKO_ID[lower];
    }

    // 2. Check runtime cache
    if (this.resolvedIdCache.has(lower)) {
      return this.resolvedIdCache.get(lower)!;
    }

    // 3. Try the search API
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          query: lower,
          ...(this.apiKey && { x_cg_demo_api_key: this.apiKey }),
        },
        timeout: 10000,
      });

      const coins = response.data?.coins;
      if (coins && coins.length > 0) {
        // Find exact symbol match first, otherwise take the top result
        const exactMatch = coins.find(
          (c: any) => c.symbol?.toLowerCase() === lower
        );
        const coinId = exactMatch ? exactMatch.id : coins[0].id;
        this.resolvedIdCache.set(lower, coinId);
        console.log(`Resolved symbol "${symbol}" to CoinGecko ID "${coinId}"`);
        return coinId;
      }
    } catch (err: any) {
      console.warn(`CoinGecko search failed for "${symbol}":`, err.message);
    }

    // 4. Last resort: return the symbol as-is (may still 404)
    return lower;
  }

  async getTopPerformers(
    type: 'gainers' | 'losers',
    limit: number = 20
  ): Promise<MarketData[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          order: type === 'gainers' ? 'price_change_percentage_24h_desc' : 'price_change_percentage_24h_asc',
          per_page: limit,
          page: 1,
          sparkline: false,
          ...(this.apiKey && { x_cg_demo_api_key: this.apiKey }),
        },
        timeout: 10000, // 10 second timeout
      });

      return response.data.map((coin: any) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change: coin.price_change_24h || 0,
        changePercent: coin.price_change_percentage_24h || 0,
        volume: coin.total_volume || 0,
        market: 'crypto' as const,
      }));
    } catch (error: any) {
      // Handle rate limiting (429) gracefully
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 30;
        console.warn(`CoinGecko rate limit hit. Retry after ${retryAfter} seconds. Consider adding API key.`);
      } else {
        console.error('CoinGecko API error:', error.message || error);
      }
      // Return empty array on error to prevent breaking the entire request
      return [];
    }
  }

  async getCoinData(coinId: string): Promise<any> {
    // Resolve ticker symbols to CoinGecko IDs
    const resolvedId = await this.resolveSymbolToId(coinId);

    try {
      const response = await axios.get(`${this.baseUrl}/coins/${resolvedId}`, {
        params: {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false,
          ...(this.apiKey && { x_cg_demo_api_key: this.apiKey }),
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching coin data for ${coinId} (resolved: ${resolvedId}):`, error);
      throw error;
    }
  }
}

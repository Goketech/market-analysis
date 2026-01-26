/**
 * Trusted finance accounts for weighted sentiment analysis
 * Accounts in this list will have 2.0x weight in sentiment calculations
 */
export const TRUSTED_FINANCE_ACCOUNTS = [
  // Major financial news outlets
  'WSJ',
  'Bloomberg',
  'CNBC',
  'FinancialTimes',
  'Reuters',
  'MarketWatch',
  'YahooFinance',
  'Forbes',
  'Business',
  'FT',
  
  // Finance influencers and analysts
  'jimcramer',
  'WarrenBuffett',
  'elonmusk',
  'RayDalio',
  'Carl_C_Icahn',
  'ReformedBroker',
  'howardlindzon',
  'StockTwits',
  'TradingView',
  'Benzinga',
  
  // Financial institutions
  'GoldmanSachs',
  'JPMorgan',
  'MorganStanley',
  'BlackRock',
  'Fidelity',
  
  // Add more trusted accounts as needed
];

/**
 * Finance-related keywords to identify finance accounts
 * Accounts with these keywords in bio get 1.5x weight
 */
export const FINANCE_KEYWORDS = [
  'finance',
  'trading',
  'investor',
  'analyst',
  'economist',
  'trader',
  'stock market',
  'crypto',
  'bitcoin',
  'equity',
  'portfolio',
  'hedge fund',
  'investment',
  'financial',
  'market',
  'stocks',
  'securities',
  'wealth',
  'capital',
];

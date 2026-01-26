-- Migration: Create performance and sentiment tables
-- Run this migration to set up the database schema for the enhanced features

-- Stock performance metrics table
CREATE TABLE IF NOT EXISTS stock_performance (
  symbol VARCHAR(10) PRIMARY KEY,
  market VARCHAR(10) NOT NULL,
  five_year_return DECIMAL(10,4),
  annualized_return DECIMAL(10,4),
  volatility DECIMAL(10,4),
  sharpe_ratio DECIMAL(10,4),
  max_drawdown DECIMAL(10,4),
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Twitter sentiment cache table
CREATE TABLE IF NOT EXISTS sentiment_cache (
  symbol VARCHAR(10) NOT NULL,
  sentiment_score DECIMAL(5,2),
  positive_count INTEGER,
  negative_count INTEGER,
  neutral_count INTEGER,
  weighted_score DECIMAL(5,2),
  sample_size INTEGER,
  cached_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (symbol, cached_at)
);

-- Create index on sentiment_cache for faster lookups
CREATE INDEX IF NOT EXISTS idx_sentiment_cache_symbol ON sentiment_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_sentiment_cache_cached_at ON sentiment_cache(cached_at DESC);

-- SEC filings metadata table
CREATE TABLE IF NOT EXISTS sec_filings (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  filing_type VARCHAR(10) NOT NULL,
  filing_date DATE NOT NULL,
  period_end DATE,
  url TEXT,
  metrics JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(symbol, filing_type, filing_date)
);

-- Create indexes on sec_filings
CREATE INDEX IF NOT EXISTS idx_sec_filings_symbol ON sec_filings(symbol);
CREATE INDEX IF NOT EXISTS idx_sec_filings_filing_date ON sec_filings(filing_date DESC);
CREATE INDEX IF NOT EXISTS idx_sec_filings_type ON sec_filings(filing_type);

-- Add comments for documentation
COMMENT ON TABLE stock_performance IS 'Stores 5-year performance metrics for stocks';
COMMENT ON TABLE sentiment_cache IS 'Caches Twitter sentiment analysis results';
COMMENT ON TABLE sec_filings IS 'Stores SEC filing metadata and extracted metrics';

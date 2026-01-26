import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { AnalysisReport } from '../services/analysis.service';

interface RecommendationInput {
  symbol: string;
  technical: AnalysisReport['technical'];
  fundamental: AnalysisReport['fundamental'];
  sentiment: AnalysisReport['sentiment'];
  performance?: {
    fiveYearReturn: number;
    annualizedReturn: number;
    volatility: number;
    sharpeRatio: number;
  };
  filings?: {
    latestRevenue?: number;
    latestNetIncome?: number;
    latestEPS?: number;
    latestDebt?: number;
  };
}

export class AIService {
  private llm: ChatOpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.llm = new ChatOpenAI({
        modelName: 'gpt-4',
        temperature: 0.3,
        openAIApiKey: apiKey,
      });
    }
  }

  async generateRecommendation(input: RecommendationInput): Promise<AnalysisReport['recommendation']> {
    // If no API key, return mock recommendation
    if (!this.llm) {
      return this.getMockRecommendation(input);
    }

    try {
      // Build enhanced prompt with all available data
      let performanceSection = '';
      if (input.performance) {
        performanceSection = `
5-Year Performance:
- 5-Year Return: ${input.performance.fiveYearReturn.toFixed(2)}%
- Annualized Return: ${input.performance.annualizedReturn.toFixed(2)}%
- Volatility: ${input.performance.volatility.toFixed(2)}%
- Sharpe Ratio: ${input.performance.sharpeRatio.toFixed(2)}
`;
      }

      let filingsSection = '';
      if (input.filings) {
        filingsSection = `
SEC Filings Data:
${input.filings.latestRevenue ? `- Revenue: $${(input.filings.latestRevenue / 1e9).toFixed(2)}B` : ''}
${input.filings.latestNetIncome ? `- Net Income: $${(input.filings.latestNetIncome / 1e9).toFixed(2)}B` : ''}
${input.filings.latestEPS ? `- EPS: $${input.filings.latestEPS.toFixed(2)}` : ''}
${input.filings.latestDebt ? `- Total Debt: $${(input.filings.latestDebt / 1e9).toFixed(2)}B` : ''}
`;
      }

      const prompt = PromptTemplate.fromTemplate(`
You are a Senior Equity Analyst with 20+ years of experience in financial markets.
Analyze the following comprehensive data and provide a trading recommendation.

Symbol: {symbol}
RSI: {rsi} ({rsiStatus})
MACD: {macdValue} (Signal: {macdSignal})
Support Level: ${input.technical.support}
Resistance Level: ${input.technical.resistance}
Trend: {trend}
P/E Ratio: {pe}
Market Cap: {marketCap}
Sentiment Score: {sentimentScore} ({sentimentStatus})
News Count: {newsCount}
${performanceSection}
${filingsSection}
Based on this comprehensive data, provide:
1. A clear BUY, SELL, or HOLD recommendation
2. A confidence score (0-100)
3. Entry target price (if BUY) or Exit target price (if SELL)
4. Brief reasoning (2-3 sentences) that considers technical indicators, fundamentals, sentiment, historical performance, and SEC filings data

Format your response as JSON:
{{
  "action": "BUY|SELL|HOLD",
  "confidence": 0-100,
  "entryTarget": number or null,
  "exitTarget": number or null,
  "reasoning": "string"
}}
      `);

      const formattedPrompt = await prompt.format({
        symbol: input.symbol,
        rsi: input.technical.rsi.toFixed(2),
        rsiStatus: input.technical.rsi > 70 ? 'Overbought' : input.technical.rsi < 30 ? 'Oversold' : 'Neutral',
        macdValue: input.technical.macd.value.toFixed(4),
        macdSignal: input.technical.macd.signal.toFixed(4),
        trend: input.technical.trend,
        pe: input.fundamental.pe?.toFixed(2) || 'N/A',
        marketCap: input.fundamental.marketCap ? `$${(input.fundamental.marketCap / 1e9).toFixed(2)}B` : 'N/A',
        sentimentScore: input.sentiment.score.toFixed(2),
        sentimentStatus: input.sentiment.socialSentiment,
        newsCount: input.sentiment.newsCount,
      });

      const response = await this.llm.invoke(formattedPrompt);
      const content = response.content as string;

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          action: parsed.action || 'HOLD',
          confidence: parsed.confidence || 50,
          entryTarget: parsed.entryTarget || undefined,
          exitTarget: parsed.exitTarget || undefined,
          reasoning: parsed.reasoning || 'Analysis completed',
        };
      }

      return this.getMockRecommendation(input);
    } catch (error) {
      console.error('AI recommendation error:', error);
      return this.getMockRecommendation(input);
    }
  }

  private getMockRecommendation(input: RecommendationInput): AnalysisReport['recommendation'] {
    // Fallback mock recommendation based on technical indicators
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let confidence = 50;

    if (input.technical.rsi < 30 && input.sentiment.socialSentiment === 'positive') {
      action = 'BUY';
      confidence = 75;
    } else if (input.technical.rsi > 70 && input.sentiment.socialSentiment === 'negative') {
      action = 'SELL';
      confidence = 75;
    }

    return {
      action,
      confidence,
      entryTarget: action === 'BUY' ? input.technical.support : undefined,
      exitTarget: action === 'SELL' ? input.technical.resistance : undefined,
      reasoning: `RSI at ${input.technical.rsi.toFixed(2)} indicates ${input.technical.rsi < 30 ? 'oversold' : input.technical.rsi > 70 ? 'overbought' : 'neutral'} conditions. Sentiment is ${input.sentiment.socialSentiment}.`,
    };
  }
}

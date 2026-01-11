import { Request, Response, NextFunction } from 'express';
import { AnalysisService } from '../services/analysis.service';
import { AppError } from '../middleware/errorHandler';
import jsPDF from 'jspdf';

const analysisService = new AnalysisService();

export const exportAnalysisPDF = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { symbol } = req.params;
    const { market = 'all' } = req.query;

    if (!symbol) {
      throw new AppError('Symbol parameter is required', 400);
    }

    const report = await analysisService.generateReport(
      symbol,
      market as string
    );

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // Title
    doc.setFontSize(20);
    doc.text(`${report.name} (${report.symbol})`, margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Market: ${report.market.toUpperCase()}`, margin, yPos);
    yPos += 8;
    doc.text(`Generated: ${new Date(report.timestamp).toLocaleString()}`, margin, yPos);
    yPos += 15;

    // Recommendation
    doc.setFontSize(16);
    doc.text('AI Recommendation', margin, yPos);
    yPos += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Action: ${report.recommendation.action}`, margin, yPos);
    yPos += 6;
    doc.setFont(undefined, 'normal');
    doc.text(`Confidence: ${report.recommendation.confidence}%`, margin, yPos);
    yPos += 6;
    if (report.recommendation.entryTarget) {
      doc.text(`Entry Target: $${report.recommendation.entryTarget.toFixed(2)}`, margin, yPos);
      yPos += 6;
    }
    if (report.recommendation.exitTarget) {
      doc.text(`Exit Target: $${report.recommendation.exitTarget.toFixed(2)}`, margin, yPos);
      yPos += 6;
    }
    doc.text(`Reasoning: ${report.recommendation.reasoning}`, margin, yPos, {
      maxWidth: pageWidth - 2 * margin,
    });
    yPos += 15;

    // Technical Analysis
    if (yPos > 250) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(16);
    doc.text('Technical Analysis', margin, yPos);
    yPos += 8;
    doc.setFontSize(12);
    doc.text(`RSI: ${report.technical.rsi.toFixed(2)}`, margin, yPos);
    yPos += 6;
    doc.text(`Trend: ${report.technical.trend}`, margin, yPos);
    yPos += 6;
    doc.text(`Support: $${report.technical.support.toFixed(2)}`, margin, yPos);
    yPos += 6;
    doc.text(`Resistance: $${report.technical.resistance.toFixed(2)}`, margin, yPos);
    yPos += 6;
    doc.text(`MACD Value: ${report.technical.macd.value.toFixed(4)}`, margin, yPos);
    yPos += 6;
    doc.text(`MACD Signal: ${report.technical.macd.signal.toFixed(4)}`, margin, yPos);
    yPos += 15;

    // Fundamental Analysis
    if (yPos > 250) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(16);
    doc.text('Fundamental Analysis', margin, yPos);
    yPos += 8;
    doc.setFontSize(12);
    if (report.fundamental.pe) {
      doc.text(`P/E Ratio: ${report.fundamental.pe.toFixed(2)}`, margin, yPos);
      yPos += 6;
    }
    if (report.fundamental.marketCap) {
      doc.text(`Market Cap: $${(report.fundamental.marketCap / 1e9).toFixed(2)}B`, margin, yPos);
      yPos += 6;
    }
    if (report.fundamental.volume24h) {
      doc.text(`24h Volume: $${(report.fundamental.volume24h / 1e6).toFixed(2)}M`, margin, yPos);
      yPos += 6;
    }
    yPos += 10;

    // Sentiment Analysis
    doc.setFontSize(16);
    doc.text('Sentiment Analysis', margin, yPos);
    yPos += 8;
    doc.setFontSize(12);
    doc.text(`Sentiment Score: ${report.sentiment.score.toFixed(2)}`, margin, yPos);
    yPos += 6;
    doc.text(`News Count: ${report.sentiment.newsCount}`, margin, yPos);
    yPos += 6;
    doc.text(`Social Sentiment: ${report.sentiment.socialSentiment}`, margin, yPos);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${report.symbol}_analysis_${Date.now()}.pdf"`
    );

    // Send PDF
    const pdfOutput = doc.output('arraybuffer');
    res.send(Buffer.from(pdfOutput));
  } catch (error) {
    next(error);
  }
};

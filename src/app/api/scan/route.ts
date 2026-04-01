import { NextResponse } from 'next/server';
import { fetchStockReport, StockData } from '@/lib/stock-service';

export async function POST(req: Request) {
  try {
    const { symbols, apiKey } = await req.json();

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({ error: 'Invalid symbols list' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key required' }, { status: 400 });
    }

    // Process all stocks concurrently
    const reports = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          return await fetchStockReport(symbol, apiKey);
        } catch (e) {
          console.error(`Failed for ${symbol}:`, e);
          return null;
        }
      })
    );

    // Filter out nulls and apply strategy logic
    const validReports = reports.filter((r): r is StockData => r !== null);

    // STRATEGY LOGIC:
    // 1. Volume > 100,000 (basic liquidity)
    // Removed strict RSI bands and SMA 50 criteria per user request
    const candidates = validReports.filter(stock => 
      stock.volume > 100000 &&
      stock.rsi > 0 // Just ensure it actually calculated
    );

    // Pick best (Lowest RSI)
    const bestStock = candidates.length > 0 
      ? candidates.sort((a, b) => a.rsi - b.rsi)[0] 
      : null;

    return NextResponse.json({
      bestStock,
      totalScanned: validReports.length,
      potentialCandidates: candidates.length,
      allReports: validReports
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

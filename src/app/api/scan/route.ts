import { NextResponse } from 'next/server';
import { fetchStockReport, StockData } from '@/lib/stock-service';

const NIFTY_50 = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'HINDUNILVR.NS', 'LT.NS',
  'BAJFINANCE.NS', 'HCLTECH.NS', 'MARUTI.NS', 'SUNPHARMA.NS', 'TATAMOTORS.NS', 'KOTAKBANK.NS', 'ONGC.NS', 'NTPC.NS', 'M&M.NS', 'AXISBANK.NS',
  'COALINDIA.NS', 'TITAN.NS', 'ASIANPAINT.NS', 'ULTRACEMCO.NS', 'BAJAJFINSV.NS', 'WIPRO.NS', 'POWERGRID.NS', 'NESTLEIND.NS', 'JSWSTEEL.NS', 'TATASTEEL.NS',
  'GRASIM.NS', 'ADANIENT.NS', 'HDFCLIFE.NS', 'TECHM.NS', 'CIPLA.NS', 'APOLLOHOSP.NS', 'BRITANNIA.NS', 'EICHERMOT.NS', 'DIVISLAB.NS', 'DRREDDY.NS',
  'HINDALCO.NS', 'INDUSINDBK.NS', 'TATACONSUM.NS', 'UPL.NS', 'SBILIFE.NS', 'ADANIPORTS.NS', 'HEROMOTOCO.NS', 'LTIM.NS', 'BAJAJ-AUTO.NS', 'BPCL.NS'
];

export async function POST(req: Request) {
  try {
    // Process all Nifty 50 stocks concurrently
    const reports = await Promise.all(
      NIFTY_50.map(async (symbol) => {
        try {
          return await fetchStockReport(symbol);
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
    // 2. Weekly RSI between 20 and 35
    const candidates = validReports.filter(stock => 
      stock.volume > 100000 &&
      stock.rsi >= 20 &&
      stock.rsi <= 35
    );

    if (candidates.length > 0) {
      // Pick top 3 (Lowest RSI first)
      const topStocks = candidates.sort((a, b) => a.rsi - b.rsi).slice(0, 3);
      return NextResponse.json({
        topStocks,
        totalScanned: validReports.length,
        potentialCandidates: candidates.length,
        allReports: validReports,
        scanMode: 'filtered',
      });
    }

    // No stocks matched criteria — return all Nifty 50 sorted by highest weekly gain
    const sortedByGain = validReports
      .filter(s => s.priceChangePct != null)
      .sort((a, b) => b.priceChangePct - a.priceChangePct);

    return NextResponse.json({
      topStocks: sortedByGain,
      totalScanned: validReports.length,
      potentialCandidates: 0,
      allReports: validReports,
      scanMode: 'full_list',
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

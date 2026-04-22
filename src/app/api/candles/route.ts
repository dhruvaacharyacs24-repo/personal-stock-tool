import { NextResponse } from 'next/server';
import { fetchCandles, calculateRSIHistory, calculateSMAData } from '@/lib/stock-service';

export async function POST(req: Request) {
  try {
    const { symbol } = await req.json();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    console.log(`[API] Fetching candles for ${symbol}...`);
    const data = await fetchCandles(symbol) as any;
    console.log(`[API] Yahoo response status: ${data.s}`);

    if (data.s !== 'ok' || !data.c) {
      console.error(`[API] Finnhub error for ${symbol}:`, data);
      const msg = data.s === 'no_data' ? 'No history available for this market.' : (data.msg || data.s || 'Invalid response');
      return NextResponse.json({ error: `Finnhub: ${msg}` }, { status: 400 });
    }

    const candles = data.t.map((time: number, i: number) => ({
      time: time, // Already Unix timestamp
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      value: data.v[i], // For the volume histogram
      color: data.c[i] >= data.o[i] ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'
    }));

    // Calculate RSI history for the chart
    const rsiRaw = calculateRSIHistory(data.c);
    const rsiData = rsiRaw.map((item) => ({
      time: data.t[item.time], // map index back to timestamp
      value: item.value
    }));

    // Calculate SMA of RSI
    const rsiSmaData = calculateSMAData(rsiData, 14);

    return NextResponse.json({
      candles,
      rsiData,
      rsiSmaData,
      symbol: symbol.toUpperCase()
    });
  } catch (error) {
    console.error('Candles API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

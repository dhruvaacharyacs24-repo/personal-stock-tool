import { NextResponse } from 'next/server';
import { fetchFundamentalSnapshot } from '@/lib/stock-service';

export async function POST(req: Request) {
  try {
    const { symbol } = await req.json();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    const snapshot = await fetchFundamentalSnapshot(symbol);
    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error('Fundamentals API error:', error);
    return NextResponse.json({ error: 'Fundamentals fetch failed' }, { status: 500 });
  }
}

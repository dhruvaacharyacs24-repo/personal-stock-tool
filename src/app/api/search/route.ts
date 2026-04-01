import { NextResponse } from 'next/server';
import yf from 'yahoo-finance2';

const yahooFinance = new (yf as any)();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const result = await yahooFinance.search(query, { quotesCount: 8, newsCount: 0 });
    
    const equities = result.quotes.filter((q: any) => q.quoteType === 'EQUITY');
    
    return NextResponse.json({ results: equities });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal server error', results: [] }, { status: 500 });
  }
}

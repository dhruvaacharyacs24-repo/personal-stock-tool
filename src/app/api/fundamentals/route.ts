import { NextResponse } from 'next/server';
import { fetchFundamentalSnapshot } from '@/lib/stock-service';

export async function POST(req: Request) {
  try {
    const { symbol } = await req.json();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required', snapshot: null }, { status: 400 });
    }

    const snapshot = await fetchFundamentalSnapshot(symbol);
    
    // If snapshot has an error property, include it
    if (snapshot && (snapshot as any).error) {
      return NextResponse.json({ 
        snapshot: null, 
        error: (snapshot as any).error 
      });
    }

    return NextResponse.json({ snapshot, error: null });
  } catch (error: any) {
    console.error('Fundamentals API error:', error);
    return NextResponse.json({ 
      snapshot: null, 
      error: error.message || 'Fundamentals fetch failed' 
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import yf from 'yahoo-finance2';

const yahooFinance = new (yf as any)();

interface NewsArticle {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: string;
  type: string;
  thumbnail?: { resolutions: { url: string; width: number; height: number }[] };
  relatedTickers?: string[];
  summary?: string;
}

export async function POST(req: Request) {
  try {
    const { symbol } = await req.json();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    // Strip .NS or .BO suffix for better search results
    const searchQuery = symbol.replace(/\.(NS|BO)$/, '');
    
    // Also try with common Indian company name patterns
    let news: NewsArticle[] = [];
    
    try {
      const result = await (yahooFinance as any).search(searchQuery);
      news = (result?.news || []) as NewsArticle[];
    } catch (searchError: any) {
      // The validation error still has the data in result
      if (searchError?.result?.news) {
        news = searchError.result.news as NewsArticle[];
      }
    }

    // If not enough news from symbol, try with the full name from assetProfile
    if (!news || news.length < 2) {
      try {
        const profileResult = await (yahooFinance as any).quoteSummary(symbol.toUpperCase(), {
          modules: ['assetProfile'],
        });
        const companyName = profileResult?.assetProfile?.longBusinessSummary?.split('.')[0] || '';
        
        if (companyName) {
          try {
            const nameResult = await (yahooFinance as any).search(`${companyName} stock news`);
            const nameNews = (nameResult?.news || []) as NewsArticle[];
            if (nameNews.length > news.length) news = nameNews;
          } catch (e2: any) {
            if (e2?.result?.news && e2.result.news.length > news.length) {
              news = e2.result.news as NewsArticle[];
            }
          }
        }
      } catch (profileError) {
        // Ignore profile fetch error
      }
    }

    // Map to clean format, filter out unrelated news
    const cleanNews = (news || [])
      .filter((n: NewsArticle) => n.title && n.link && n.publisher)
      .slice(0, 10)
      .map((n: NewsArticle) => ({
        uuid: n.uuid,
        title: n.title,
        publisher: n.publisher,
        link: n.link,
        date: n.providerPublishTime,
        thumbnail: n.thumbnail?.resolutions?.[0]?.url || null,
        relatedTickers: n.relatedTickers || [],
      }));

    // Run AI sentiment analysis using Groq
    const apiKey = process.env.GROQ_API_KEY;
    let sentiment = {
      overall: 'Neutral',
      reasoning: [] as string[],
      risks: [] as string[],
    };

    if (apiKey && cleanNews.length > 0) {
      try {
        const newsText = cleanNews.slice(0, 6).map((n: any, i: number) => 
          `${i+1}. [${n.publisher}] ${n.title}`
        ).join('\n');

        const sentimentPrompt = `You are a financial news analyst. Analyze these recent news headlines for ${searchQuery} stock and provide a sentiment assessment.

Recent news:
${newsText}

Return ONLY a JSON object with this exact structure:
{
  "overall": "Bullish|Neutral|Bearish",
  "reasoning": ["specific reason 1 based on news", "specific reason 2", "specific reason 3"],
  "risks": ["specific risk 1", "specific risk 2", "specific risk 3"]
}

Each reasoning and risk should be 10-20 words, directly referencing the news content. No markdown, no code fences.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are a financial news sentiment analyst. Return only strict JSON.' },
              { role: 'user', content: sentimentPrompt },
            ],
            temperature: 0.2,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data?.choices?.[0]?.message?.content || '{}';
          const cleaned = content.replace(/```json|```/g, '').trim();
          const match = cleaned.match(/\{[\s\S]*\}/);
          const jsonText = match ? match[0] : cleaned;
          const parsed = JSON.parse(jsonText);
          
          sentiment = {
            overall: parsed.overall || 'Neutral',
            reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : ['News-based sentiment analysis available.'],
            risks: Array.isArray(parsed.risks) ? parsed.risks : ['Monitor for negative news flow.'],
          };
        }
      } catch (aiError) {
        console.error('[NEWS] AI sentiment error:', aiError);
        // Fallback sentiment based on basic keyword analysis
        const bullishWords = ['surge', 'profit', 'growth', 'upgrade', 'beat', 'win', 'positive', 'expansion', 'partnership', 'order'];
        const bearishWords = ['cut', 'loss', 'decline', 'miss', 'downgrade', 'risk', 'slowdown', 'investigation', 'fraud', 'fine'];
        
        let bullishCount = 0;
        let bearishCount = 0;
        cleanNews.forEach((n: any) => {
          const title = (n.title || '').toLowerCase();
          bullishWords.forEach(w => { if (title.includes(w)) bullishCount++; });
          bearishWords.forEach(w => { if (title.includes(w)) bearishCount++; });
        });

        sentiment = {
          overall: bullishCount > bearishCount ? 'Bullish' : bearishCount > bullishCount ? 'Bearish' : 'Neutral',
          reasoning: [`Based on ${cleanNews.length} recent news headlines`],
          risks: ['Market conditions may change rapidly'],
        };
      }
    }

    return NextResponse.json({
      news: cleanNews,
      sentiment,
      source: 'Yahoo Finance',
    });
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json({ error: 'News fetch failed' }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NEWS_TIMEOUT_MS = Number(process.env.NEWS_FETCH_TIMEOUT_MS || 12000);

function withTimeout(signalMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), signalMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

/**
 * Fetches stock-specific news by aggregating from:
 * 1. Yahoo Finance v1 search API (for relatedTickers matching)
 * 2. Google News RSS (most reliable for Indian stocks)
 */
export async function POST(req: Request) {
  try {
    const { symbol } = await req.json();
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    const cleanSymbol = symbol.toUpperCase().replace(/\.(NS|BO)$/, '');
    const fullSymbol = symbol.toUpperCase();
    const seenTitles = new Set<string>();
    const articles: any[] = [];
    const sourceErrors: string[] = [];

    function addArticle(item: any) {
      const title = (item.title || '').trim();
      const link = item.link || item.url || '';
      if (!title || !link) return;
      const key = title.toLowerCase().trim();
      if (seenTitles.has(key)) return;
      seenTitles.add(key);
      articles.push({
        uuid: item.uuid || item.guid || `news-${Math.random().toString(36).slice(2)}`,
        title,
        publisher: item.publisher || item.source || 'Financial News',
        link,
        date: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
        thumbnail: item.thumbnail || null,
        relatedTickers: item.relatedTickers || [cleanSymbol],
      });
    }

    // === STRATEGY 1: Google News RSS (most reliable for Indian stocks) ===
    async function fetchGoogleNews(query: string) {
      try {
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
        const timeout = withTimeout(NEWS_TIMEOUT_MS);
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: timeout.signal,
        });
        timeout.clear();
        if (!res.ok) return;
        const xml = await res.text();
        // Simple XML parsing for RSS items
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(xml)) !== null) {
          const itemXml = match[1];
          const extract = (tag: string) => {
            const m = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
            return m ? m[1].trim() : '';
          };
          const title = extract('title').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
          const link = extract('link');
          const guid = extract('guid');
          const pubDate = extract('pubDate');
          const source = extract('source');
          const description = extract('description').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
          if (title && link) {
            addArticle({
              title,
              link: link.startsWith('http') ? link : `https://news.google.com${link}`,
              guid,
              date: pubDate,
              publisher: source || 'Google News',
              description,
            });
          }
        }
      } catch (err: any) {
        sourceErrors.push(`Google News failed for query \"${query}\": ${err?.message || 'unknown error'}`);
      }
    }

    // Get company name for better search
    let companyName = cleanSymbol;
    try {
      const timeout = withTimeout(NEWS_TIMEOUT_MS);
      const res = await fetch(
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(fullSymbol)}?modules=assetProfile`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: timeout.signal }
      );
      timeout.clear();
      if (res.ok) {
        const data = await res.json();
        const longName = data?.quoteSummary?.result?.[0]?.assetProfile?.longBusinessSummary;
        if (longName) {
          const name = longName.split('.')[0]?.trim();
          if (name && name.length > 3 && name.length < 60) companyName = name;
        }
      }
    } catch (err: any) {
      sourceErrors.push(`Yahoo assetProfile lookup failed: ${err?.message || 'unknown error'}`);
    }

    // Fetch from Google News with multiple queries
    const queries = [
      `${companyName} stock`,
      `${companyName} NSE`,
      `"${cleanSymbol}" stock`,
      companyName,
    ];

    await Promise.all(queries.map(q => fetchGoogleNews(q)));

    // === STRATEGY 2: Yahoo Finance search (for relatedTickers matching) ===
    try {
      const yahooUrls = [
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(fullSymbol)}&quotesCount=0&newsCount=10`,
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(cleanSymbol)}&quotesCount=0&newsCount=10`,
      ];
      const results = await Promise.all(
        yahooUrls.map(async (url) => {
          const timeout = withTimeout(NEWS_TIMEOUT_MS);
          try {
            const r = await fetch(url, {
              headers: { 'User-Agent': 'Mozilla/5.0', Origin: 'https://finance.yahoo.com' },
              signal: timeout.signal,
            });
            if (!r.ok) {
              sourceErrors.push(`Yahoo search failed (${r.status}) for ${url}`);
              return null;
            }
            return await r.json();
          } catch (err: any) {
            sourceErrors.push(`Yahoo search request failed for ${url}: ${err?.message || 'unknown error'}`);
            return null;
          } finally {
            timeout.clear();
          }
        })
      );
      for (const data of results) {
        if (data?.news) {
          for (const item of data.news) {
            if (!item.title || !item.link) continue;
            // Only add if it mentions our symbol in relatedTickers
            const tickers = (item.relatedTickers || []).map((t: string) => t.toLowerCase());
            if (tickers.includes(cleanSymbol.toLowerCase())) {
              addArticle({
                ...item,
                publisher: item.publisher || 'Yahoo Finance',
                date: typeof item.providerPublishTime === 'number'
                  ? new Date(item.providerPublishTime * 1000).toISOString()
                  : item.providerPublishTime,
                thumbnail: item.thumbnail?.resolutions?.[0]?.url || null,
              });
            }
          }
        }
      }
    } catch (err: any) {
      sourceErrors.push(`Yahoo search phase failed: ${err?.message || 'unknown error'}`);
    }

    const cleanNews = articles.slice(0, 10);

    // AI Sentiment via Groq
    const apiKey = process.env.GROQ_API_KEY;
    let sentiment = { overall: 'Neutral', reasoning: [] as string[], risks: [] as string[] };

    if (apiKey && cleanNews.length > 0) {
      try {
        const newsText = cleanNews.slice(0, 6).map((n: any, i: number) =>
          `${i+1}. [${n.publisher}] ${n.title}`
        ).join('\n');

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are a financial news sentiment analyst. Return only strict JSON.' },
              { role: 'user', content: `Analyze these recent news headlines for ${cleanSymbol} (${companyName}) and provide a sentiment assessment.

Recent news:
${newsText}

Return ONLY JSON:
{
  "overall": "Bullish|Neutral|Bearish",
  "reasoning": ["reason 1", "reason 2", "reason 3"],
  "risks": ["risk 1", "risk 2", "risk 3"]
}
No markdown.` },
            ],
            temperature: 0.2,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const cleaned = (data?.choices?.[0]?.message?.content || '{}').replace(/```json|```/g, '').trim();
          const match = cleaned.match(/\{[\s\S]*\}/);
          const parsed = JSON.parse(match ? match[0] : cleaned);
          sentiment = {
            overall: parsed.overall || 'Neutral',
            reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : ['News-based sentiment analysis.'],
            risks: Array.isArray(parsed.risks) ? parsed.risks : ['Monitor for negative news flow.'],
          };
        }
      } catch (aiError) {
        console.error('[NEWS] AI sentiment error:', aiError);
      }
    }

    if (cleanNews.length === 0 && sourceErrors.length > 0) {
      console.error('[NEWS] No articles collected. Source errors:', sourceErrors);
    }

    return NextResponse.json({ news: cleanNews, sentiment, source: 'Google News + Yahoo Finance' });
  } catch (error) {
    console.error('News API error:', error);
    return NextResponse.json({ error: 'News fetch failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NEWS_TIMEOUT_MS = Number(process.env.NEWS_FETCH_TIMEOUT_MS || 12000);

type SentimentPayload = {
  overall: string;
  confidence: string;
  reasoning: string[];
  risks: string[];
};

function withTimeout(signalMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), signalMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

function isGenericText(text: string) {
  const lower = text.toLowerCase();
  return (
    !text.trim() ||
    lower.includes('market conditions') ||
    lower.includes('monitor closely') ||
    lower.includes('overall sentiment') ||
    lower.includes('could impact') ||
    lower.includes('support and resistance') ||
    lower.includes('technical setup')
  );
}

function fallbackSentiment(companyName: string, cleanNews: any[]) {
  const headlines = cleanNews.slice(0, 3).map((n: any) => n.title).filter(Boolean);
  const sources = cleanNews.slice(0, 3).map((n: any) => n.publisher).filter(Boolean);
  const headlineText = headlines.length > 0 ? headlines.join('; ') : 'the available news flow';
  const sourceText = sources.length > 0 ? Array.from(new Set(sources)).join(', ') : 'news sources';

  return {
    overall: 'Neutral',
    confidence: '55',
    reasoning: [
      `${companyName} news flow is currently limited to ${headlines.length} concrete headline(s) from ${sourceText}.`,
      `The visible items mention ${headlineText}, which is enough for a directional read but not a high-conviction one.`,
      'Until a clearer earnings, guidance, regulation, or order-book catalyst appears, a neutral stance is more defensible than forcing a bias.',
    ],
    risks: [
      'Headline coverage may be incomplete, so a single positive or negative story can overstate the true trend.',
      'If the company has a major event outside the surfaced headlines, sentiment may shift quickly.',
      'News-driven momentum can fade fast without follow-through in price or volume.',
    ],
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
    let sentiment: SentimentPayload = {
      overall: 'Neutral',
      confidence: '55',
      reasoning: [],
      risks: [],
    };

    if (apiKey && cleanNews.length > 0) {
      try {
        const newsText = cleanNews.slice(0, 8).map((n: any, i: number) => {
          const date = n.date ? new Date(n.date).toLocaleDateString('en-IN') : 'unknown date';
          const description = n.description ? String(n.description).replace(/\s+/g, ' ').trim() : 'No description provided.';
          return `${i + 1}. [${n.publisher}] (${date}) ${n.title}\n   Context: ${description}`;
        }).join('\n');

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are a precise buy-side financial news analyst. Use only the supplied headlines and descriptions. Return only strict JSON. Never write generic or templated language.' },
              { role: 'user', content: `Analyze these recent news items for ${cleanSymbol} (${companyName}) and produce a stock-specific sentiment view.

Recent news:
${newsText}

Rules:
- Base every statement on the supplied headlines or descriptions.
- Do not use generic phrases like "market conditions", "monitor closely", or "overall sentiment" unless you tie them to a specific headline.
- If the headlines are mixed, say Neutral and explain why.
- If the evidence is thin, say Neutral with explicit uncertainty instead of inventing a bullish or bearish thesis.
- Each reasoning item must mention a concrete event or headline theme and the likely implication for ${cleanSymbol}.

Return ONLY JSON in this exact shape:
{
  "overall": "Bullish|Neutral|Bearish",
  "confidence": "0-100",
  "reasoning": ["specific reason 1", "specific reason 2", "specific reason 3"],
  "risks": ["specific risk 1", "specific risk 2", "specific risk 3"]
}
No markdown.` },
            ],
            temperature: 0.15,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const cleaned = (data?.choices?.[0]?.message?.content || '{}').replace(/```json|```/g, '').trim();
          const match = cleaned.match(/\{[\s\S]*\}/);
          const parsed = JSON.parse(match ? match[0] : cleaned);
          const fallback = fallbackSentiment(companyName, cleanNews);
          const reasoning = Array.isArray(parsed.reasoning) ? parsed.reasoning.map((item: any) => String(item).trim()).filter(Boolean) : [];
          const risks = Array.isArray(parsed.risks) ? parsed.risks.map((item: any) => String(item).trim()).filter(Boolean) : [];
          sentiment = {
            overall: parsed.overall || 'Neutral',
            confidence: parsed.confidence ? String(parsed.confidence) : fallback.confidence,
            reasoning: reasoning.length > 0 ? reasoning : fallback.reasoning,
            risks: risks.length > 0 ? risks : fallback.risks,
          };
        }
      } catch (aiError) {
        console.error('[NEWS] AI sentiment error:', aiError);
      }
    }

    if (!sentiment.reasoning.length || !sentiment.risks.length) {
      sentiment = fallbackSentiment(companyName, cleanNews);
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

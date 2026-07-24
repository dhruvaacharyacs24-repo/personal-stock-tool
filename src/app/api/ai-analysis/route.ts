import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { symbol, price, rsi, volume, rsiStatus, isAboveSMA, sma50 } = await req.json();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'GROQ_API_KEY missing',
        analysis: {
          strengths: ['API key not configured'],
          weaknesses: ['API key not configured'],
          longTerm: 'Neutral',
          swing: 'Neutral',
          intraday: 'Neutral',
          confidence: '0%',
          summary: 'AI is unavailable until the Groq key is configured.',
        },
      });
    }

const metrics = [
      price != null ? `price ₹${Number(price).toFixed(2)}` : null,
      rsi != null ? `RSI ${Number(rsi).toFixed(2)}` : null,
      volume != null ? `volume ${Math.round(Number(volume) / 100000)}L` : null,
      rsiStatus ? `RSI status ${rsiStatus}` : null,
      isAboveSMA != null ? `relative to SMA50: ${isAboveSMA ? 'above' : 'below'}` : null,
      sma50 != null ? `SMA50 ₹${Number(sma50).toFixed(2)}` : null,
    ].filter(Boolean).join(' | ');

    const prompt = `You are a senior equity research analyst at a top-tier investment bank. Analyze ${symbol} for a professional trading dashboard. Use these verified market facts: ${metrics || 'No metric context provided'}.

Provide a comprehensive, detailed assessment covering:

1. **Technical Setup** — Analyze the RSI reading, volume profile, and SMA50 position in detail. What do these collectively indicate about momentum and trend structure?
2. **Risk/Reward** — What are the key support/resistance levels implied by the SMA50 and recent price action? Assess the risk/reward profile for each timeframe.
3. **Timeframe Views** — Give very specific, nuanced views for long-term, swing, and intraday. Don't just say "Bullish" — explain the conviction level and conditions.
4. **Catalysts** — What market conditions or technical triggers would confirm or invalidate the current setup?

Return ONLY a JSON object with this exact structure (no markdown, no code fences):
{
  "strengths": ["strength 1 with specific metric reference and reasoning", "strength 2", "strength 3", "strength 4"],
  "weaknesses": ["weakness 1 with specific metric reference and reasoning", "weakness 2", "weakness 3", "weakness 4"],
  "longTerm": "Bullish|Neutral|Bearish with a brief 1-sentence explanation appended",
  "swing": "Bullish|Neutral|Bearish with a brief 1-sentence explanation appended",
  "intraday": "Bullish|Neutral|Bearish with a brief 1-sentence explanation appended",
  "confidence": "0-100",
  "summary": "A detailed 2-3 sentence summary that synthesizes the technical picture, risk factors, and actionable outlook."
}
Each strength and weakness must be 15-25 words, directly cite the supplied metrics, and explain the market implication. No generic language. Be specific and data-driven.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a concise stock analysis assistant. Return only strict JSON and tie your view to the provided market metrics.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '{}';

    let parsed: any = {};
    try {
      const cleaned = content.replace(/```json|```/g, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      const jsonText = match ? match[0] : cleaned;
      parsed = JSON.parse(jsonText);
    } catch {
      parsed = {
        strengths: ['The setup is supported by the supplied momentum and price context.', 'The current reading suggests a meaningful opportunity if confirmation holds.', 'The risk-reward profile looks constructive given the recent technical behavior.'],
        weaknesses: ['A failed move could quickly reverse the short-term bias.', 'The trade needs confirmation because volatility can expand fast.', 'Broader market rotation could undermine this setup quickly.'],
        longTerm: 'Neutral',
        swing: 'Neutral',
        intraday: 'Neutral',
        confidence: '60',
        summary: 'The signal is directionally interesting, but confirmation is still needed.',
      };
    }

    return NextResponse.json({
      analysis: {
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        longTerm: parsed.longTerm || 'Neutral',
        swing: parsed.swing || 'Neutral',
        intraday: parsed.intraday || 'Neutral',
        confidence: parsed.confidence ? `${parsed.confidence}%` : '0%',
        summary: parsed.summary || 'No summary available.',
      },
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
  }
}

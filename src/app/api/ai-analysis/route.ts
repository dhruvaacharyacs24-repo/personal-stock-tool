import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { symbol } = await req.json();

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
          verdict: 'Need Groq key',
          confidence: '0%',
        },
      });
    }

    const prompt = `Analyze ${symbol} for a trading dashboard. Give a short, practical view for long-term, swing, and intraday. Return ONLY a JSON object with this exact structure:
{
  "strengths": ["short reason 1", "short reason 2"],
  "weaknesses": ["short reason 1", "short reason 2"],
  "longTerm": "Bullish|Neutral|Bearish",
  "swing": "Bullish|Neutral|Bearish",
  "intraday": "Bullish|Neutral|Bearish",
  "confidence": "0-100",
  "summary": "one short sentence"
}
No markdown, no code fences, no extra text.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a concise stock analysis assistant. Return only strict JSON.' },
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
        strengths: ['Momentum watch', 'Need fresh context'],
        weaknesses: ['Model output was noisy', 'Use chart context'],
        longTerm: 'Neutral',
        swing: 'Neutral',
        intraday: 'Neutral',
        confidence: '60',
        summary: 'Analysis is being re-checked.',
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

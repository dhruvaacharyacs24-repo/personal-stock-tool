'use client';

import { useEffect, useRef, useState } from 'react';
import ChartContainer from '@/components/ChartContainer';
import NewsPanel from '@/components/NewsPanel';
import ResultDisplay from '@/components/ResultDisplay';
import { FundamentalSnapshot, StockData } from '@/lib/stock-service';
import { Activity, History, Play, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

type NewsSentiment = {
  overall: string;
  confidence?: string;
  reasoning: string[];
  risks: string[];
};

type ScoreBreakdown = {
  technical: number;
  fundamental: number;
  news: number;
  valuation: number;
  momentum: number;
  finalScore: number;
  verdict: string;
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] text-indigo-200">
      {label}
    </span>
  );
}

function getScoreTone(score: number) {
  if (score >= 80) {
    return {
      text: 'text-emerald-300',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      fill: 'from-emerald-400 via-lime-300 to-emerald-300',
      label: 'Strong Buy',
    };
  }
  if (score >= 65) {
    return {
      text: 'text-lime-300',
      bg: 'bg-lime-500/10',
      border: 'border-lime-500/20',
      fill: 'from-lime-400 via-emerald-300 to-lime-200',
      label: 'Buy',
    };
  }
  if (score >= 45) {
    return {
      text: 'text-amber-300',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      fill: 'from-amber-400 via-yellow-300 to-amber-200',
      label: 'Hold',
    };
  }
  if (score >= 30) {
    return {
      text: 'text-rose-300',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      fill: 'from-rose-400 via-orange-300 to-rose-200',
      label: 'Sell',
    };
  }
  return {
    text: 'text-fuchsia-300',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20',
    fill: 'from-fuchsia-400 via-rose-300 to-fuchsia-200',
    label: 'Strong Sell',
  };
}

function ScoreTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: ReturnType<typeof getScoreTone>;
}) {
  return (
    <div className={`rounded-xl border ${tone.border} ${tone.bg} px-3 py-2.5 min-h-[4.35rem] flex flex-col justify-between gap-2`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] uppercase tracking-[0.25em] text-slate-500 leading-none">{label}</span>
        <span className={`text-[11px] font-black leading-none ${tone.text}`}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-black/30 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tone.fill}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function buildEarningsSummary(fundamentals: FundamentalSnapshot): string {
  const revenueGrowth = fundamentals.earnings.revenueGrowthQoQ;
  const profitGrowth = fundamentals.earnings.profitGrowthQoQ;
  const marginDelta = fundamentals.earnings.marginDelta;
  const surprisePct = fundamentals.earnings.surprisePct;
  const revenueB = fundamentals.earnings.latestQuarterRevenue != null
    ? `₹${(fundamentals.earnings.latestQuarterRevenue / 1e9).toFixed(1)}B`
    : 'the reported level';
  const profitB = fundamentals.earnings.latestQuarterProfit != null
    ? `₹${(fundamentals.earnings.latestQuarterProfit / 1e9).toFixed(1)}B`
    : 'the reported level';

  const revenueSentence = revenueGrowth == null
    ? `Revenue data is incomplete, so the top-line readout relies on the latest reported quarter at ${revenueB}.`
    : revenueGrowth > 15
      ? `Revenue jumped ${revenueGrowth.toFixed(1)}% QoQ to ${revenueB}, which is a clear acceleration signal rather than a flat or defensive quarter.`
      : revenueGrowth > 0
        ? `Revenue rose ${revenueGrowth.toFixed(1)}% QoQ to ${revenueB}, which is constructive but still needs follow-through to confirm durable momentum.`
        : `Revenue fell ${Math.abs(revenueGrowth).toFixed(1)}% QoQ to ${revenueB}, so top-line momentum is under pressure and needs a catalyst to recover.`;

  const profitSentence = profitGrowth == null
    ? `Profit data is incomplete, although the latest quarter shows profit at ${profitB}.`
    : profitGrowth > 15
      ? `Profit expanded ${profitGrowth.toFixed(1)}% QoQ to ${profitB}, showing operating leverage and stronger earnings quality.`
      : profitGrowth > 0
        ? `Profit improved ${profitGrowth.toFixed(1)}% QoQ to ${profitB}, but the pace is moderate rather than explosive.`
        : `Profit declined ${Math.abs(profitGrowth).toFixed(1)}% QoQ to ${profitB}, which weakens the earnings quality narrative.`;

  const marginSentence = marginDelta == null
    ? 'Margin direction is not available, so the quarter should be judged mainly on revenue and profit trends.'
    : marginDelta > 2
      ? `Margins expanded by ${marginDelta.toFixed(1)} pts, a strong sign that cost control and pricing power are working together.`
      : marginDelta > 0
        ? `Margins expanded by ${marginDelta.toFixed(1)} pts, which supports the idea that the business is becoming a little more efficient.`
        : marginDelta > -2
          ? `Margins compressed by ${Math.abs(marginDelta).toFixed(1)} pts, a manageable setback but still a warning for near-term earnings durability.`
          : `Margins compressed by ${Math.abs(marginDelta).toFixed(1)} pts, which is a meaningful deterioration and can cap the stock's rerating potential.`;

  const surpriseSentence = surprisePct == null
    ? 'Earnings surprise data is unavailable, so the quarter should be read on the operating trend alone.'
    : surprisePct > 5
      ? `The company beat expectations by ${surprisePct.toFixed(1)}%, which strengthens the case for positive estimate revisions.`
      : surprisePct > 0
        ? `The company beat expectations by ${surprisePct.toFixed(1)}%, but the margin of outperformance is not large enough to call it a major surprise.`
        : `The company missed expectations by ${Math.abs(surprisePct).toFixed(1)}%, which puts more pressure on the next quarter to show improvement.`;

  const positiveSignals = [revenueGrowth, profitGrowth, marginDelta, surprisePct].filter((value) => value != null && value > 0).length;
  const negativeSignals = [revenueGrowth, profitGrowth, marginDelta, surprisePct].filter((value) => value != null && value < 0).length;

  const conclusion = positiveSignals > negativeSignals
    ? 'Overall, the quarter reads as constructive with improving earnings quality, but the follow-through must confirm that the trend is not just one strong quarter.'
    : negativeSignals > positiveSignals
      ? 'Overall, the quarter looks soft, and the stock likely needs a cleaner revenue or margin reset before the earnings picture improves.'
      : 'Overall, the quarter is balanced, with enough improvement to stay interesting but not enough to call the trend decisively strong.';

  return `${revenueSentence} ${profitSentence} ${marginSentence} ${surpriseSentence} ${conclusion}`;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreTechnical(stock?: StockData | null): number {
  if (!stock) return 50;
  let score = 50;

  score += stock.isAboveSMA ? 15 : -10;

  if (stock.rsi >= 45 && stock.rsi <= 60) score += 15;
  else if (stock.rsi >= 35 && stock.rsi < 45) score += 8;
  else if (stock.rsi > 60 && stock.rsi <= 70) score += 5;
  else if (stock.rsi < 30) score += 5;
  else if (stock.rsi > 75) score -= 8;

  if (stock.priceChangePct > 5) score += 10;
  else if (stock.priceChangePct > 0) score += 5;
  else if (stock.priceChangePct < -5) score -= 10;
  else if (stock.priceChangePct < 0) score -= 5;

  if (stock.volume > 300000) score += 5;

  return clampScore(score);
}

function scoreFundamental(fundamentals?: FundamentalSnapshot | null): number {
  if (!fundamentals) return 50;
  return clampScore((fundamentals.rating ?? 5) * 10);
}

function scoreNews(sentiment?: NewsSentiment | null): number {
  if (!sentiment) return 50;
  const confidence = Number(sentiment.confidence || 55);
  let base = 50;
  const lower = sentiment.overall.toLowerCase();
  if (lower.includes('bullish')) base = 68;
  else if (lower.includes('bearish')) base = 32;

  const directionBoost = Math.max(0, confidence - 50) * 0.6;
  const directionPenalty = Math.max(0, 50 - confidence) * 0.35;

  if (lower.includes('bullish')) base += directionBoost;
  else if (lower.includes('bearish')) base -= directionBoost;
  else base += confidence > 60 ? 4 : confidence < 45 ? -4 : 0;

  if (sentiment.reasoning.length >= 3) base += 4;
  if (sentiment.risks.length >= 3) base -= 2;

  return clampScore(base - directionPenalty);
}

function scoreValuation(fundamentals?: FundamentalSnapshot | null): number {
  if (!fundamentals) return 50;

  const pe = fundamentals.pe;
  const pb = fundamentals.pb;
  let score = 50;

  if (pe != null) {
    if (pe <= 15) score += 25;
    else if (pe <= 25) score += 18;
    else if (pe <= 35) score += 10;
    else if (pe <= 50) score += 2;
    else score -= 8;
  }

  if (pb != null) {
    if (pb <= 2) score += 15;
    else if (pb <= 4) score += 8;
    else if (pb <= 6) score += 2;
    else score -= 6;
  }

  if (fundamentals.debtToEquity != null) {
    if (fundamentals.debtToEquity < 0.5) score += 5;
    else if (fundamentals.debtToEquity > 1.5) score -= 5;
  }

  return clampScore(score);
}

function scoreMomentum(stock?: StockData | null): number {
  if (!stock) return 50;
  let score = 50;

  if (stock.priceChangePct > 4) score += 20;
  else if (stock.priceChangePct > 1.5) score += 12;
  else if (stock.priceChangePct > 0) score += 6;
  else if (stock.priceChangePct < -4) score -= 18;
  else if (stock.priceChangePct < 0) score -= 8;

  if (stock.isAboveSMA) score += 10;
  if (stock.rsi >= 45 && stock.rsi <= 65) score += 12;
  else if (stock.rsi < 30) score += 4;
  else if (stock.rsi > 75) score -= 10;

  return clampScore(score);
}

function buildBuySellScore(
  stock?: StockData | null,
  fundamentals?: FundamentalSnapshot | null,
  sentiment?: NewsSentiment | null,
): ScoreBreakdown {
  const technical = scoreTechnical(stock);
  const fundamental = scoreFundamental(fundamentals);
  const news = scoreNews(sentiment);
  const valuation = scoreValuation(fundamentals);
  const momentum = scoreMomentum(stock);
  const finalScore = clampScore((technical * 0.25) + (fundamental * 0.2) + (news * 0.2) + (valuation * 0.15) + (momentum * 0.2));

  const verdict = finalScore >= 80 ? 'Strong Buy' : finalScore >= 65 ? 'Buy' : finalScore >= 45 ? 'Hold' : finalScore >= 30 ? 'Sell' : 'Strong Sell';

  return { technical, fundamental, news, valuation, momentum, finalScore, verdict };
}

export default function Dashboard() {
  const niftyTableRef = useRef<HTMLDivElement | null>(null);
  const [activeSymbol, setActiveSymbol] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [topStocks, setTopStocks] = useState<StockData[]>([]);
  const [allStocks, setAllStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastScanDate, setLastScanDate] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [fundamentalsLoading, setFundamentalsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<{
    strengths: string[];
    weaknesses: string[];
    longTerm: string;
    swing: string;
    intraday: string;
    confidence: string;
    summary: string;
  } | null>(null);
  const [fundamentals, setFundamentals] = useState<FundamentalSnapshot | null>(null);
  const [fundamentalsError, setFundamentalsError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [newsSentiment, setNewsSentiment] = useState<NewsSentiment | null>(null);
  const [newsSentimentLoading, setNewsSentimentLoading] = useState(false);
  const [newsSentimentError, setNewsSentimentError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'filtered' | 'full_list'>('filtered');
  const [hasScanned, setHasScanned] = useState(false);

  const sortStocksByGain = (stocks: StockData[]) => [...stocks].sort((a, b) => b.priceChangePct - a.priceChangePct);

  useEffect(() => {
    const savedResult = localStorage.getItem('last_scan_result_v2');
    if (savedResult) {
      const parsed = JSON.parse(savedResult);
      setTopStocks(parsed.stocks || []);
      setAllStocks(sortStocksByGain(parsed.allStocks || parsed.stocks || []));
      setScanMode(parsed.scanMode || 'filtered');
      setLastScanDate(parsed.date);
      setHasScanned(true);
    }
  }, []);

  const handleScan = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      if (data.topStocks && data.topStocks.length > 0) {
        setTopStocks(data.topStocks);
        setAllStocks(sortStocksByGain(data.allReports || data.topStocks || []));
        setScanMode(data.scanMode || 'filtered');
        setActiveSymbol(data.topStocks[0].symbol);
        setSelectedSymbol(null);
        setAnalysis(null);
        const scanData = {
          stocks: data.topStocks,
          allStocks: data.allReports || data.topStocks,
          date: new Date().toLocaleString(),
          scanMode: data.scanMode,
        };
        setLastScanDate(scanData.date);
        localStorage.setItem('last_scan_result_v2', JSON.stringify(scanData));
      } else {
        setTopStocks([]);
        setAllStocks([]);
        setScanMode('filtered');
      }
    } catch (error) {
      console.error('Scan failed:', error);
      alert('An error occurred during scanning. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStock = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveSymbol(symbol);
  };

  const handleScrollToNiftyTable = () => {
    if (allStocks.length > 0) {
      const sortedAllStocks = sortStocksByGain(allStocks);
      setTopStocks(sortedAllStocks);
      setAllStocks(sortedAllStocks);
      setScanMode('full_list');
      if (!selectedSymbol && sortedAllStocks[0]?.symbol) {
        setActiveSymbol(sortedAllStocks[0].symbol);
      }
    }
    niftyTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleAnalyze = async (symbol: string) => {
    const stock = topStocks.find((item) => item.symbol === symbol);
    setAnalysisLoading(true);
    setAnalysis(null);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          price: stock?.price ?? null,
          rsi: stock?.rsi ?? null,
          volume: stock?.volume ?? null,
          rsiStatus: stock?.rsiStatus ?? null,
          isAboveSMA: stock?.isAboveSMA ?? null,
          sma50: stock?.sma50 ?? null,
        }),
      });

      const data = await response.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
      } else if (data.error) {
        setAnalysisError(data.error);
      }
    } catch (error: any) {
      console.error('Analysis failed:', error);
      setAnalysisError(error.message || 'AI analysis failed.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleLoadFundamentals = async (symbol: string) => {
    setFundamentalsLoading(true);
    setFundamentals(null);
    setFundamentalsError(null);
    try {
      const response = await fetch('/api/fundamentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });
      const data = await response.json();
      if (data.snapshot) {
        setFundamentals(data.snapshot);
        setFundamentalsError(null);
      } else if (data.error) {
        setFundamentalsError(data.error);
      } else {
        setFundamentalsError('No fundamental data returned for this stock.');
      }
    } catch (error: any) {
      console.error('Fundamentals failed:', error);
      setFundamentalsError(error.message || 'Failed to load fundamentals data.');
    } finally {
      setFundamentalsLoading(false);
    }
  };

  const handleLoadNewsSentiment = async (symbol: string) => {
    setNewsSentimentLoading(true);
    setNewsSentiment(null);
    setNewsSentimentError(null);
    try {
      const response = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });
      const data = await response.json();
      if (data.sentiment) {
        setNewsSentiment(data.sentiment);
      } else if (data.error) {
        setNewsSentimentError(data.error);
      } else {
        setNewsSentimentError('No sentiment data returned for this stock.');
      }
    } catch (error: any) {
      console.error('News sentiment failed:', error);
      setNewsSentimentError(error.message || 'Failed to load news sentiment.');
    } finally {
      setNewsSentimentLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSymbol) {
      handleAnalyze(selectedSymbol);
      handleLoadFundamentals(selectedSymbol);
      handleLoadNewsSentiment(selectedSymbol);
    }
  }, [selectedSymbol, topStocks]);

  const selectedStock = topStocks.find((item) => item.symbol === selectedSymbol) ?? null;
  const buySellScore = buildBuySellScore(selectedStock, fundamentals, newsSentiment);
  const scoreTone = getScoreTone(buySellScore.finalScore);

  return (
    <div className="min-h-screen bg-[#05070A] text-slate-200 selection:bg-indigo-500/30 flex flex-col">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.08)_0%,transparent_50%)] pointer-events-none" />

      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#05070A]/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-3 sm:h-16 sm:py-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase italic">
              GRAVITY<span className="text-indigo-500 not-italic">SCAN</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {lastScanDate && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <History className="w-3 h-3" />
                LAST SCAN: {lastScanDate}
              </div>
            )}
            <button
              onClick={handleScan}
              disabled={loading}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white rounded-full font-bold text-xs sm:text-sm shadow-xl shadow-indigo-500/20 transition-all ${loading ? 'animate-pulse' : ''}`}
            >
              <Play className={`w-4 h-4 ${loading ? 'opacity-0' : ''}`} />
              {loading ? 'SCANNING NIFTY 50...' : 'RUN SCAN'}
            </button>
            <button
              onClick={handleScrollToNiftyTable}
              className="flex items-center gap-2 px-4 py-2 border border-indigo-400/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-100 rounded-full font-bold text-xs tracking-wider transition-all"
              title="Show the full Nifty 50 table"
            >
              <span className="sm:hidden">TABLE</span>
              <span className="hidden sm:inline">NIFTY 50 TABLE</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-3 sm:p-6 flex flex-col gap-6 relative flex-1 w-full">
        <section className="w-full space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div ref={niftyTableRef} className="xl:col-span-3">
              <ResultDisplay
                data={topStocks}
                loading={loading}
                selectedSymbol={selectedSymbol}
                onSelectStock={handleSelectStock}
                onViewChart={setActiveSymbol}
                scanMode={scanMode}
              />
            </div>

            <div className="xl:col-span-2 flex flex-col justify-end">
              <div className="p-7 bg-gradient-to-br from-indigo-500/10 to-[#0A0D14]/90 border border-indigo-500/30 rounded-3xl h-full flex flex-col justify-center shadow-[0_0_40px_-15px_rgba(99,102,241,0.2)] backdrop-blur-xl transition-all">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-black bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent italic tracking-tight">
                    AI SCANNER<span className="not-italic opacity-50 font-medium ml-1 text-sm">v1.3</span>
                  </h3>
                </div>

                <p className="text-xs text-indigo-100/60 leading-relaxed mb-4 font-medium">
                  Pick any stock from the scan list to view a focused AI readout built from its live technical context.
                </p>

                <div className="flex items-center gap-4 mb-8">
                  <div className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] font-bold text-indigo-300 tracking-widest uppercase">
                    RSI 20-35
                  </div>
                  <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-bold text-emerald-300 tracking-widest uppercase">
                    VOL &gt; 100k
                  </div>
                </div>

                <div className="flex flex-col gap-3 text-[10px] font-black tracking-widest uppercase mt-auto">
                  <div className="flex items-center gap-3 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg self-start shadow-[0_0_15px_rgba(52,211,153,0.1)]">
                    <span>SYSTEM ONLINE</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
                  </div>

                  {selectedSymbol ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(17,24,39,0.96),rgba(2,6,23,0.98))] p-4 shadow-[0_0_35px_rgba(99,102,241,0.08)]"
                    >
                      <div className={`rounded-2xl border ${scoreTone.border} ${scoreTone.bg} p-3.5 mb-3 shadow-[0_0_24px_rgba(99,102,241,0.08)]`}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-3">
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-300 block">AI BUY / SELL SCORE</span>
                            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                              Composite view from technical, fundamental, news, valuation, and momentum signals
                            </div>
                          </div>
                          <div className={`inline-flex items-center gap-2 self-start rounded-full border ${scoreTone.border} bg-black/20 px-3 py-1.5`}>
                            <span className={`text-[9px] uppercase tracking-[0.25em] ${scoreTone.text}`}>Verdict</span>
                            <span className={`text-[10px] font-black uppercase tracking-[0.22em] ${scoreTone.text}`}>{scoreTone.label}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_1.8fr] items-stretch">
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 flex flex-col items-center justify-center text-center min-h-[12.5rem]">
                            <div className="relative flex h-32 w-32 items-center justify-center rounded-full">
                              <div className={`absolute inset-0 rounded-full bg-[conic-gradient(from_180deg,rgba(15,23,42,0.35)_0%,rgba(15,23,42,0.35)_${100 - buySellScore.finalScore}%,rgba(255,255,255,0.06)_${100 - buySellScore.finalScore}%,rgba(255,255,255,0.06)_100%)]`} />
                              <div className={`absolute inset-3 rounded-full bg-[conic-gradient(from_180deg,rgba(52,211,153,0.95)_0%,rgba(132,204,22,0.95)_${buySellScore.finalScore}%,rgba(255,255,255,0.08)_${buySellScore.finalScore}%,rgba(255,255,255,0.08)_100%)]`} />
                              <div className="absolute inset-[18px] rounded-full bg-[#091019] border border-white/10 flex flex-col items-center justify-center">
                                <span className="text-[9px] uppercase tracking-[0.25em] text-slate-500 leading-none mb-2">Final Score</span>
                                <span className={`text-3xl font-black leading-none ${scoreTone.text}`}>{buySellScore.finalScore}</span>
                                <span className="mt-2 text-[9px] uppercase tracking-[0.25em] text-slate-400">/100</span>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.25em] text-slate-500 flex-wrap">
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{selectedStock ? selectedStock.symbol.replace('.NS', '') : 'N/A'}</span>
                              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">{newsSentimentLoading ? 'News loading' : newsSentimentError ? 'News fallback' : 'Live inputs'}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-2 content-start">
                            <ScoreTile label="Technical" value={buySellScore.technical} tone={scoreTone} />
                            <ScoreTile label="Fundamental" value={buySellScore.fundamental} tone={scoreTone} />
                            <ScoreTile label="News" value={buySellScore.news} tone={scoreTone} />
                            <ScoreTile label="Valuation" value={buySellScore.valuation} tone={scoreTone} />
                            <div className="sm:col-span-2 xl:col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 flex items-center justify-between gap-4 min-h-[4.35rem]">
                              <div className="space-y-1">
                                <span className="text-[9px] uppercase tracking-[0.25em] text-slate-500 block">Momentum</span>
                                <span className={`text-lg font-black leading-none ${scoreTone.text}`}>{buySellScore.momentum}</span>
                              </div>
                              <div className="flex-1 h-2 rounded-full bg-black/30 overflow-hidden">
                                <div className={`h-full rounded-full bg-gradient-to-r ${scoreTone.fill}`} style={{ width: `${buySellScore.momentum}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 text-[9px] uppercase tracking-[0.25em] text-slate-500 flex-wrap">
                          <span>{newsSentimentLoading ? 'Loading news sentiment...' : newsSentimentError ? 'News sentiment fallback used' : 'Live score from technical, fundamental, news, valuation, and momentum inputs'}</span>
                          <span>{buySellScore.verdict}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 border-b border-white/5 pb-3 mb-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1 min-w-0">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-300 block leading-none">AI STOCK ANALYSIS</span>
                          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 truncate">
                            {selectedSymbol.replace('.NS', '')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap justify-end">
                          {analysisLoading ? (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] uppercase tracking-[0.25em] text-slate-400">Loading</span>
                          ) : (
                            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.25em] text-emerald-300">{analysis?.confidence || 'LIVE'}</span>
                          )}
                        </div>
                      </div>
                      {analysis ? (
                        <div className="space-y-3 text-[11px] font-medium normal-case tracking-normal">
                          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <div className="text-indigo-200 font-semibold leading-none">AI Verdict</div>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[9px] uppercase tracking-[0.25em] text-slate-300">
                                  Confidence
                                </span>
                                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[9px] uppercase tracking-[0.25em] text-emerald-300">
                                  {analysis.confidence}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2 text-slate-200 sm:grid-cols-3">
                              <div className="rounded-lg bg-black/20 px-3 py-2.5 min-h-[3.4rem] flex flex-col justify-between gap-1">
                                <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500 leading-none">Long Term</span>
                                <span className="font-semibold text-emerald-300 leading-tight">{analysis.longTerm}</span>
                              </div>
                              <div className="rounded-lg bg-black/20 px-3 py-2.5 min-h-[3.4rem] flex flex-col justify-between gap-1">
                                <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500 leading-none">Swing</span>
                                <span className="font-semibold text-amber-300 leading-tight">{analysis.swing}</span>
                              </div>
                              <div className="rounded-lg bg-black/20 px-3 py-2.5 min-h-[3.4rem] flex flex-col justify-between gap-1">
                                <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500 leading-none">Intraday</span>
                                <span className="font-semibold text-rose-300 leading-tight">{analysis.intraday}</span>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                            <div className="mb-2 flex items-center gap-2 text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              <span>Strengths</span>
                            </div>
                            <ul className="space-y-2 text-slate-300">
                              {analysis.strengths.map((item) => (
                                <li key={item} className="grid grid-cols-[10px_1fr] gap-2 items-start">
                                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                  <span className="leading-relaxed">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
                            <div className="mb-2 flex items-center gap-2 text-rose-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                              <span>Watchouts</span>
                            </div>
                            <ul className="space-y-2 text-slate-300">
                              {analysis.weaknesses.map((item) => (
                                <li key={item} className="grid grid-cols-[10px_1fr] gap-2 items-start">
                                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400" />
                                  <span className="leading-relaxed">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-slate-300">
                            <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-slate-500">Summary</div>
                            <p className="leading-6">{analysis.summary}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-500 text-[11px]">Generating analysis for the selected stock...</div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                      Select a stock from the scan results to view a focused AI readout and confidence score.
                    </div>
                  )}
                  {analysisError && (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
                      <div className="text-[10px] uppercase tracking-[0.25em] text-rose-400 mb-1">Analysis Error</div>
                      {analysisError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {selectedSymbol && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 gap-4 lg:grid-cols-2"
            >
              <div className="rounded-3xl border border-white/10 bg-[#0D1118]/90 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Fundamental Analysis</p>
                    <h4 className="text-lg font-semibold text-white">{selectedSymbol.replace('.NS', '')}</h4>
                  </div>
                  <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-emerald-300">
                    {fundamentals?.rating ? `${fundamentals.rating}/10` : '—'}
                  </div>
                </div>

                {fundamentalsLoading ? (
                  <div className="text-sm text-slate-500">Loading fundamentals...</div>
                ) : fundamentalsError ? (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
                    <div className="text-[10px] uppercase tracking-[0.25em] text-rose-400 mb-1">API Error</div>
                    {fundamentalsError}
                  </div>
                ) : fundamentals ? (
                  <div className="space-y-4 text-[12px] text-slate-300">
                    <div className="grid grid-cols-2 gap-3">
                      <Metric label="PE" value={fundamentals.pe != null ? fundamentals.pe.toString() : '—'} />
                      <Metric label="PB" value={fundamentals.pb != null ? fundamentals.pb.toString() : '—'} />
                      <Metric label="EPS" value={fundamentals.eps != null ? fundamentals.eps.toString() : '—'} />
                      <Metric label="ROE" value={fundamentals.roe != null ? `${fundamentals.roe}%` : '—'} />
                      <Metric label="ROCE" value={fundamentals.roce != null ? `${fundamentals.roce}%` : '—'} />
                      <Metric label="Debt/Equity" value={fundamentals.debtToEquity != null ? fundamentals.debtToEquity.toString() : '—'} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Metric label="Operating Margin" value={fundamentals.operatingMargin != null ? `${fundamentals.operatingMargin}%` : '—'} />
                      <Metric label="Net Margin" value={fundamentals.netMargin != null ? `${fundamentals.netMargin}%` : '—'} />
                      <Metric label="Sales Growth" value={fundamentals.salesGrowth != null ? `${fundamentals.salesGrowth}%` : '—'} />
                      <Metric label="Profit Growth" value={fundamentals.profitGrowth != null ? `${fundamentals.profitGrowth}%` : '—'} />
                      <Metric label="Promoter Holding" value={fundamentals.promoterHolding != null ? `${fundamentals.promoterHolding}%` : '—'} />
                      <Metric label="FII/DII Holding" value={fundamentals.fiiDiiHolding != null ? `${fundamentals.fiiDiiHolding}%` : '—'} />
                    </div>
                  </div>
) : (
                  <div className="text-sm text-slate-500">No fundamental data available for this stock.</div>
                )}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-indigo-500/60" />
                  <span className="text-[8px] uppercase tracking-[0.25em] text-slate-600 font-medium">
                    Data sourced from Yahoo Finance — values may differ from official filings due to currency conversion, consolidation scope, or adjustments. Cross-verify with company reports.
                  </span>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#0D1118]/90 p-5">
                <div className="mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">AI Earnings Summary</p>
                  <h4 className="text-lg font-semibold text-white">Quarterly results readout</h4>
                </div>

                {fundamentals ? (
                  <div className="space-y-3 text-[12px] text-slate-300">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-slate-500">Latest quarter</div>
                      <div className="text-sm font-semibold text-white">{fundamentals.earnings.latestQuarterLabel || '—'}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Pill label={`Revenue ${fundamentals.earnings.latestQuarterRevenue != null ? `₹${(fundamentals.earnings.latestQuarterRevenue / 1e9).toFixed(1)}B` : '—'}`} />
                        <Pill label={`Profit ${fundamentals.earnings.latestQuarterProfit != null ? `₹${(fundamentals.earnings.latestQuarterProfit / 1e9).toFixed(1)}B` : '—'}`} />
                        <Pill label={`Margin ${fundamentals.earnings.latestQuarterMargin != null ? `${fundamentals.earnings.latestQuarterMargin}%` : '—'}`} />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-slate-500">Quarterly trend</div>
                      <div className="space-y-2 text-sm">
                        <div>Revenue {fundamentals.earnings.revenueGrowthQoQ != null ? `${fundamentals.earnings.revenueGrowthQoQ > 0 ? '↑' : '↓'} ${Math.abs(fundamentals.earnings.revenueGrowthQoQ).toFixed(1)}%` : '—'}</div>
                        <div>Profit {fundamentals.earnings.profitGrowthQoQ != null ? `${fundamentals.earnings.profitGrowthQoQ > 0 ? '↑' : '↓'} ${Math.abs(fundamentals.earnings.profitGrowthQoQ).toFixed(1)}%` : '—'}</div>
                        <div>Margins {fundamentals.earnings.marginDelta != null ? `${fundamentals.earnings.marginDelta > 0 ? 'expanded' : 'compressed'} ${Math.abs(fundamentals.earnings.marginDelta).toFixed(1)} pts` : '—'}</div>
                        <div>Surprise {fundamentals.earnings.surprisePct != null ? `${fundamentals.earnings.surprisePct > 0 ? 'beat' : 'miss'} by ${Math.abs(fundamentals.earnings.surprisePct).toFixed(1)}%` : '—'}</div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-slate-200">
                      <div className="mb-2 text-[10px] uppercase tracking-[0.25em] text-emerald-300">AI summary</div>
                      <div className="text-sm leading-6">
                        {buildEarningsSummary(fundamentals)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No earnings snapshot available yet.</div>
                )}
              </div>
            </motion.div>
          )}

          {selectedSymbol && (
            <NewsPanel symbol={selectedSymbol} />
          )}

          <div className="h-[460px] sm:h-[600px] w-full">
            <ChartContainer symbol={activeSymbol} />
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-white/5 py-8 mt-12 bg-black/20">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-[10px] font-bold text-slate-600 tracking-widest uppercase">
            © 2026 GRAVITYSCAN PERSONAL ANALYTICS
          </div>
          <div className="flex items-center gap-6 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            <a href="#" className="hover:text-indigo-400 transition-colors">Documentation</a>
            <a href="#" className="hover:text-indigo-400 transition-colors">API Status</a>
            <div className="px-2 py-0.5 border border-indigo-500/30 text-indigo-400 rounded text-[9px]">
              V1.4.2 BUILD
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

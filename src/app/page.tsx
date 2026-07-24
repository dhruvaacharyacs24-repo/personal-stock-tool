'use client';

import { useEffect, useState } from 'react';
import ChartContainer from '@/components/ChartContainer';
import ResultDisplay from '@/components/ResultDisplay';
import { FundamentalSnapshot, StockData } from '@/lib/stock-service';
import { Activity, History, Play, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

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

export default function Dashboard() {
  const [activeSymbol, setActiveSymbol] = useState('RELIANCE.NS');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [topStocks, setTopStocks] = useState<StockData[]>([]);
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

  useEffect(() => {
    const savedResult = localStorage.getItem('last_scan_result_v2');
    if (savedResult) {
      const parsed = JSON.parse(savedResult);
      setTopStocks(parsed.stocks || []);
      setLastScanDate(parsed.date);
      if (parsed.stocks?.length) {
        setActiveSymbol(parsed.stocks[0].symbol);
      }
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
        setActiveSymbol(data.topStocks[0].symbol);
        setSelectedSymbol(null);
        setAnalysis(null);
        const scanData = { stocks: data.topStocks, date: new Date().toLocaleString() };
        setLastScanDate(scanData.date);
        localStorage.setItem('last_scan_result_v2', JSON.stringify(scanData));
      } else {
        alert('No stocks matched the strategy criteria (RSI 20-35, Volume > 100k).');
        setTopStocks([]);
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

  useEffect(() => {
    if (selectedSymbol) {
      handleAnalyze(selectedSymbol);
      handleLoadFundamentals(selectedSymbol);
    }
  }, [selectedSymbol, topStocks]);

  return (
    <div className="min-h-screen bg-[#05070A] text-slate-200 selection:bg-indigo-500/30 flex flex-col">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.08)_0%,transparent_50%)] pointer-events-none" />

      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#05070A]/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase italic">
              GRAVITY<span className="text-indigo-500 not-italic">SCAN</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {lastScanDate && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <History className="w-3 h-3" />
                LAST SCAN: {lastScanDate}
              </div>
            )}
            <button
              onClick={handleScan}
              disabled={loading}
              className={`flex items-center gap-2 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white rounded-full font-bold text-sm shadow-xl shadow-indigo-500/20 transition-all ${loading ? 'animate-pulse' : ''}`}
            >
              <Play className={`w-4 h-4 ${loading ? 'opacity-0' : ''}`} />
              {loading ? 'SCANNING NIFTY 50...' : 'RUN SCAN'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 flex flex-col gap-6 relative flex-1 w-full">
        <section className="w-full space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-3">
              <ResultDisplay
                data={topStocks}
                loading={loading}
                selectedSymbol={selectedSymbol}
                onSelectStock={handleSelectStock}
                onViewChart={setActiveSymbol}
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
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-300">AI STOCK ANALYSIS</span>
                        {analysisLoading ? (
                          <span className="text-[9px] text-slate-400">LOADING...</span>
                        ) : (
                          <span className="text-[9px] uppercase tracking-[0.25em] text-emerald-300">{analysis?.confidence || 'LIVE'}</span>
                        )}
                      </div>
                      <div className="mb-3 text-[10px] uppercase tracking-[0.25em] text-slate-500">
                        {selectedSymbol.replace('.NS', '')}
                      </div>
                      {analysis ? (
                        <div className="space-y-3 text-[11px] font-medium normal-case tracking-normal">
                          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-indigo-200 font-semibold">AI Verdict</div>
                              <div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.25em] text-emerald-300">
                                {analysis.confidence}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2 text-slate-200">
                              <div className="flex items-center justify-between rounded-lg bg-black/20 px-2 py-1.5"><span>Long Term</span><span className="font-semibold text-emerald-300">{analysis.longTerm}</span></div>
                              <div className="flex items-center justify-between rounded-lg bg-black/20 px-2 py-1.5"><span>Swing</span><span className="font-semibold text-amber-300">{analysis.swing}</span></div>
                              <div className="flex items-center justify-between rounded-lg bg-black/20 px-2 py-1.5"><span>Intraday</span><span className="font-semibold text-rose-300">{analysis.intraday}</span></div>
                            </div>
                          </div>

                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                            <div className="mb-2 flex items-center gap-2 text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              <span>Strengths</span>
                            </div>
                            <ul className="space-y-2 text-slate-300">
                              {analysis.strengths.map((item) => (
                                <li key={item} className="flex gap-2">
                                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                  <span>{item}</span>
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
                                <li key={item} className="flex gap-2">
                                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-slate-300">
                            <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-slate-500">Summary</div>
                            {analysis.summary}
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
                        {fundamentals.earnings.revenueGrowthQoQ != null && fundamentals.earnings.revenueGrowthQoQ > 0 ? 'Revenue is trending upward, showing healthy demand momentum.' : 'Revenue trend needs close monitoring before calling it durable.'}
                        {' '}
                        {fundamentals.earnings.profitGrowthQoQ != null && fundamentals.earnings.profitGrowthQoQ > 0 ? 'Profit growth is constructive and supports a stronger earnings profile.' : 'Profit growth remains uneven and warrants caution.'}
                        {' '}
                        {fundamentals.earnings.marginDelta != null && fundamentals.earnings.marginDelta < 0 ? 'Margins are under pressure, which can affect near-term sentiment.' : 'Margins are holding up reasonably well.'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No earnings snapshot available yet.</div>
                )}
              </div>
            </motion.div>
          )}

          <div className="h-[600px] w-full">
            <ChartContainer symbol={activeSymbol} />
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-white/5 py-8 mt-12 bg-black/20">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
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

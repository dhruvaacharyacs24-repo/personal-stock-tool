'use client';

import { useState, useEffect } from 'react';
import ChartContainer from '@/components/ChartContainer';
import ResultDisplay from '@/components/ResultDisplay';
import { StockData } from '@/lib/stock-service';
import { Play, Shield, History, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const [activeSymbol, setActiveSymbol] = useState('RELIANCE.NS');
  const [topStocks, setTopStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastScanDate, setLastScanDate] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysis, setAnalysis] = useState<{ strengths: string[]; weaknesses: string[]; longTerm: string; swing: string; intraday: string; confidence: string; summary: string } | null>(null);

  useEffect(() => {
    const savedResult = localStorage.getItem('last_scan_result_v2');
    if (savedResult) {
      const parsed = JSON.parse(savedResult);
      setTopStocks(parsed.stocks || []);
      setLastScanDate(parsed.date);
      if (parsed.stocks && parsed.stocks.length > 0) {
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

  const handleAnalyze = async (symbol: string) => {
    setAnalysisLoading(true);
    setAnalysis(null);
    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      });
      const data = await response.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    if (activeSymbol) {
      handleAnalyze(activeSymbol);
    }
  }, [activeSymbol]);

  return (
    <div className="min-h-screen bg-[#05070A] text-slate-200 selection:bg-indigo-500/30 flex flex-col">
      {/* Background radial glow */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.08)_0%,transparent_50%)] pointer-events-none" />

      {/* Navigation Header */}
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
              <ResultDisplay data={topStocks} loading={loading} onViewChart={setActiveSymbol} />
            </div>
            
            <div className="xl:col-span-2 flex flex-col justify-end">
              <div className="p-7 bg-gradient-to-br from-indigo-500/10 to-[#0A0D14]/90 border border-indigo-500/30 rounded-3xl h-full flex flex-col justify-center shadow-[0_0_40px_-15px_rgba(99,102,241,0.2)] backdrop-blur-xl transition-all">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-black bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent italic tracking-tight">AI SCANNER<span className="not-italic opacity-50 font-medium ml-1 text-sm">v1.3</span></h3>
                </div>
                <p className="text-xs text-indigo-100/60 leading-relaxed mb-4 font-medium">
                  Run a scan to analyze all 50 stocks in the Nifty 50 index and instantly find the most oversold candidates based on weekly data.
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

                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-indigo-300">AI STOCK ANALYSIS</span>
                      {analysisLoading && <span className="text-[9px] text-slate-400">LOADING...</span>}
                    </div>
                    {analysis ? (
                      <div className="space-y-3 text-[11px] font-medium normal-case tracking-normal">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-indigo-300 mb-2">AI Verdict</div>
                          <div className="grid grid-cols-1 gap-2 text-slate-200">
                            <div className="flex items-center justify-between"><span>Long Term</span><span className="font-semibold text-emerald-300">{analysis.longTerm}</span></div>
                            <div className="flex items-center justify-between"><span>Swing</span><span className="font-semibold text-amber-300">{analysis.swing}</span></div>
                            <div className="flex items-center justify-between"><span>Intraday</span><span className="font-semibold text-rose-300">{analysis.intraday}</span></div>
                          </div>
                          <div className="mt-2 text-slate-400">Confidence: {analysis.confidence}</div>
                        </div>

                        <div>
                          <div className="text-emerald-300 mb-1">Strengths</div>
                          <ul className="list-disc ml-4 space-y-1 text-slate-300">
                            {analysis.strengths.map((item) => <li key={item}>{item}</li>)}
                          </ul>
                        </div>
                        <div>
                          <div className="text-rose-300 mb-1">Weaknesses</div>
                          <ul className="list-disc ml-4 space-y-1 text-slate-300">
                            {analysis.weaknesses.map((item) => <li key={item}>{item}</li>)}
                          </ul>
                        </div>

                        <div className="border-t border-white/10 pt-2 text-slate-300">
                          {analysis.summary}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-500 text-[11px]">Select a stock to see AI analysis.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

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

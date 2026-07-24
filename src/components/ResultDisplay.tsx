'use client';

import { StockData } from '@/lib/stock-service';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, TrendingUp, Activity, BarChart2 } from 'lucide-react';

interface ResultDisplayProps {
  data: StockData[] | null;
  loading: boolean;
  selectedSymbol: string | null;
  onSelectStock: (symbol: string) => void;
  onViewChart: (symbol: string) => void;
}

export default function ResultDisplay({ data, loading, selectedSymbol, onSelectStock, onViewChart }: ResultDisplayProps) {
  if (loading) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-[#0F1219]/40 border border-white/5 rounded-2xl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-medium font-mono text-sm tracking-widest uppercase">Analyzing Nifty 50...</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-[#0F1219]/40 border border-white/5 rounded-2xl text-center">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
          <Activity className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-xl font-bold bg-gradient-to-r from-slate-200 to-slate-500 bg-clip-text text-transparent mb-2">
          No Scan Results
        </h3>
        <p className="text-slate-400 max-w-xs text-sm leading-relaxed">
          Click "Run Scan" to find the best RSI-based opportunities in the Nifty 50.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1 pb-1">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Scan Results</p>
          <h3 className="text-lg font-semibold text-white">Top momentum picks</h3>
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
          {data.length} stocks
        </div>
      </div>

      {data.map((stock, idx) => {
        const isSelected = stock.symbol === selectedSymbol;
        return (
        <motion.div
          key={stock.symbol}
          initial={{ opacity: 0, scale: 0.98, x: -20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: idx * 0.08 }}
          className={`w-full rounded-2xl border p-4 shadow-[0_10px_40px_rgba(0,0,0,0.25)] transition-all ${isSelected ? 'border-indigo-500/50 bg-gradient-to-br from-indigo-500/15 via-[#121722] to-[#0A0D14]' : 'border-white/10 bg-gradient-to-br from-[#121722] via-[#0D1118] to-[#0A0D14]'}`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-indigo-300">
                  Rank #{idx + 1}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.25em] ${stock.isAboveSMA ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                  {stock.isAboveSMA ? 'Above SMA50' : 'Below SMA50'}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-black text-white">{stock.symbol.replace('.NS', '')}</h2>
                <div className="text-sm font-mono text-slate-400">₹{stock.price}</div>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  RSI: <span className="ml-1 font-semibold text-emerald-300">{stock.rsi}</span>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Volume: <span className="ml-1 font-semibold text-slate-200">{(stock.volume / 100000).toFixed(1)}L</span>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Status: <span className="ml-1 font-semibold text-slate-200">{stock.rsiStatus}</span>
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 lg:w-auto">
              <button
                onClick={() => onSelectStock(stock.symbol)}
                className="rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.25em] text-indigo-200 transition hover:bg-indigo-500/25"
              >
                {isSelected ? 'Selected' : 'Analyze'}
              </button>
              <button
                onClick={() => onViewChart(stock.symbol)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.25em] text-slate-300 transition hover:bg-white/10"
              >
                View Chart
              </button>
            </div>
          </div>
        </motion.div>
        );
      })}
    </div>
  );
}

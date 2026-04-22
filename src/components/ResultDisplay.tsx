'use client';

import { StockData } from '@/lib/stock-service';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, TrendingUp, Activity, BarChart2 } from 'lucide-react';

interface ResultDisplayProps {
  data: StockData[] | null;
  loading: boolean;
  onViewChart: (symbol: string) => void;
}

export default function ResultDisplay({ data, loading, onViewChart }: ResultDisplayProps) {
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
      {data.map((stock, idx) => (
        <motion.div
          key={stock.symbol}
          initial={{ opacity: 0, scale: 0.98, x: -20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="w-full bg-gradient-to-r from-[#131622]/90 to-[#0A0D14]/90 border border-indigo-500/30 rounded-2xl overflow-hidden shadow-lg backdrop-blur-xl transition-all hover:border-indigo-500/50"
        >
          <div className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            
            {/* Symbol & Price Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-black tracking-[0.2em] text-indigo-400 uppercase bg-indigo-500/10 px-2 py-1 rounded">Rank #{idx + 1}</span>
                <h2 className="text-2xl font-black text-white tracking-tight">{stock.symbol.replace('.NS', '')}</h2>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-slate-400 font-mono tracking-wider">
                  ₹{stock.price}
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest ${stock.isAboveSMA ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stock.isAboveSMA ? <><CheckCircle2 className="w-3.5 h-3.5" /> Above SMA50</> : <><AlertTriangle className="w-3.5 h-3.5" /> Below SMA50</>}
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-6 bg-black/20 p-3 rounded-xl border border-white/5 flex-wrap">
              <div className="text-center px-4">
                <div className="flex items-center gap-1.5 justify-center text-indigo-400/70 mb-1">
                  <TrendingUp className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Weekly RSI</span>
                </div>
                <div className="text-2xl font-mono font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">
                  {stock.rsi}
                </div>
              </div>
              
              <div className="w-px h-10 bg-white/10 hidden md:block" />
              
              <div className="text-center px-4">
                <div className="flex items-center gap-1.5 justify-center text-indigo-400/70 mb-1">
                  <BarChart2 className="w-3 h-3" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Volume</span>
                </div>
                <div className="text-xl font-mono font-black text-slate-200">
                  {(stock.volume / 100000).toFixed(1)}L
                </div>
              </div>
            </div>

            {/* Actions */}
            <div>
              <button
                onClick={() => onViewChart(stock.symbol)}
                className="w-full md:w-auto px-6 py-3 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/50 rounded-xl text-white text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)]"
              >
                View Chart
              </button>
            </div>

          </div>
        </motion.div>
      ))}
    </div>
  );
}

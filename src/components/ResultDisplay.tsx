'use client';

import { StockData } from '@/lib/stock-service';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, TrendingUp, DollarSign, Activity } from 'lucide-react';

interface ResultDisplayProps {
  data: StockData | null;
  loading: boolean;
}

export default function ResultDisplay({ data, loading }: ResultDisplayProps) {
  if (loading) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-[#0F1219]/40 border border-white/5 rounded-2xl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-medium font-mono text-sm tracking-widest uppercase">Analyzing Market Data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-[#0F1219]/40 border border-white/5 rounded-2xl text-center">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
          <Activity className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-xl font-bold bg-gradient-to-r from-slate-200 to-slate-500 bg-clip-text text-transparent mb-2">
          No Scan Results Yet
        </h3>
        <p className="text-slate-400 max-w-xs text-sm leading-relaxed">
          Add stocks to your watchlist and click "Run Scan" to find the best RSI-based opportunity.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="w-full bg-gradient-to-b from-[#131622]/90 to-[#0A0D14]/90 border border-indigo-500/30 rounded-3xl overflow-hidden shadow-[0_0_60px_-15px_rgba(99,102,241,0.3)] backdrop-blur-2xl transition-all"
    >
      <div className="p-8 border-b border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between bg-indigo-500/[0.02]">
        <div className="mb-4 md:mb-0">
          <span className="text-[10px] font-black tracking-[0.3em] text-indigo-400 uppercase mb-2 block animate-pulse">Alpha Selected</span>
          <h2 className="text-4xl font-black bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent flex items-center gap-3 drop-shadow-sm">
            {data.symbol}
            <span className="text-emerald-400 text-[10px] font-mono py-1 px-3 bg-emerald-400/10 rounded-full border border-emerald-400/30 shadow-[0_0_15px_rgba(52,211,153,0.2)]">
              STRATEGY PICK
            </span>
          </h2>
        </div>
        <div className="text-left md:text-right flex flex-col md:items-end gap-3 w-full md:w-auto">
          <div className="flex flex-col md:items-end p-3 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm">
            <div className="text-indigo-300/60 text-[10px] font-bold uppercase tracking-widest mb-1">Current Price</div>
            <div className="text-3xl font-mono font-black text-indigo-50 tracking-tight [text-shadow:0_0_15px_rgba(99,102,241,0.4)]">
              ₹{data.price}
            </div>
          </div>
          <a
            href={`https://www.tradingview.com/chart/?symbol=${data.symbol.includes('.') ? (data.symbol.endsWith('.NS') ? `NSE:${data.symbol.replace('.NS', '')}` : `BSE:${data.symbol.replace('.BO', '')}`) : data.symbol}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold text-white transition-all hover:scale-105 flex items-center gap-2 uppercase tracking-widest border border-indigo-500/40 px-4 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
          >
            OPEN FULL CHART
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-indigo-500/20">
        {/* RSI Metric */}
        <div className="p-6 bg-[#0E111A] flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-2 text-indigo-400 mb-3 relative z-10">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Weekly RSI</span>
          </div>
          <div className="text-4xl font-mono font-black text-white relative z-10 drop-shadow-md">{data.rsi}</div>
          <div className="text-xs text-emerald-400 mt-2 font-bold uppercase tracking-widest relative z-10">
            {data.rsiStatus}
          </div>
        </div>

        {/* Trend Metric */}
        <div className="p-6 bg-[#0E111A] flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-2 text-indigo-400 mb-3 relative z-10">
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">SMA 50</span>
          </div>
          <div className="text-3xl font-mono font-black text-indigo-50 relative z-10">₹{data.sma50}</div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-[#818CF8] mt-2 relative z-10">
            {data.isAboveSMA ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Above Trend</>
            ) : (
              <><AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> <span className="text-rose-400">Below Trend</span></>
            )}
          </div>
        </div>

        {/* Volume Metric */}
        <div className="p-6 bg-[#0E111A] flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-2 text-indigo-400 mb-3 relative z-10">
            <Activity className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Volume</span>
          </div>
          <div className="text-3xl font-mono font-black text-slate-100 relative z-10">{(data.volume / 100000).toFixed(2)}L</div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-2 relative z-10">Shares Traded</div>
        </div>
      </div>

      <div className="p-8 bg-gradient-to-br from-indigo-500/10 to-transparent relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />
        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2 relative z-10">
          <Info className="w-4 h-4" />
          Automated Scan Abstract
        </h3>
        <p className="text-indigo-100/80 text-sm md:text-base leading-relaxed border-l-2 border-indigo-500/40 pl-5 py-2 italic font-medium relative z-10">
          “<strong className="text-white drop-shadow-sm">{data.symbol}</strong> emerged as the prime algorithmic candidate. 
          It currently displays a Weekly RSI of <strong className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]">{data.rsi}</strong>. 
          The 50-period moving average rests at <strong className="text-indigo-200">₹{data.sma50}</strong>, and {data.volume > 100000 ? "substantial" : "low"} liquidity is present with exactly {data.volume.toLocaleString()} shares in volume.”
        </p>
      </div>
    </motion.div>
  );
}

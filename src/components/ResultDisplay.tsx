'use client';

import { StockData } from '@/lib/stock-service';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, Search, LineChart } from 'lucide-react';

interface ResultDisplayProps {
  data: StockData[] | null;
  loading: boolean;
  selectedSymbol: string | null;
  onSelectStock: (symbol: string) => void;
  onViewChart: (symbol: string) => void;
  scanMode?: 'filtered' | 'full_list';
}

function GainBadge({ pct }: { pct: number }) {
  const isPos = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
      {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isPos ? '+' : ''}{pct}%
    </span>
  );
}

function RsiBadge({ value }: { value: number }) {
  let color = 'text-slate-300 bg-white/5';
  if (value < 30) color = 'text-emerald-300 bg-emerald-500/10';
  else if (value > 70) color = 'text-rose-300 bg-rose-500/10';
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${color}`}>{value}</span>
  );
}

function LoadingState() {
  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-[#0F1219]/40 border border-white/5 rounded-2xl">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-slate-400 font-medium font-mono text-xs tracking-widest uppercase">Scanning Nifty 50...</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-8 bg-[#0F1219]/40 border border-white/5 rounded-2xl text-center">
      <div className="w-14 h-14 bg-white/5 rounded-full flex items-center justify-center mb-5">
        <Search className="w-7 h-7 text-slate-500" />
      </div>
      <h3 className="text-lg font-bold text-slate-200 mb-1">No Scan Results</h3>
      <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
        Click <span className="text-indigo-400 font-semibold">Run Scan</span> to analyse the Nifty 50 for momentum opportunities.
      </p>
    </div>
  );
}

/** Full list mode: compact scrollable table */
function FullListTable({
  data,
  selectedSymbol,
  onSelectStock,
  onViewChart,
}: {
  data: StockData[] | null;
  selectedSymbol: string | null;
  onSelectStock: (symbol: string) => void;
  onViewChart: (symbol: string) => void;
}) {
  if (!data) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0D1118]/60 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg">
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Nifty 50 Overview</p>
            <h3 className="text-sm font-semibold text-white">Sorted by weekly gain</h3>
          </div>
        </div>
        <span className="text-[10px] text-slate-500 font-medium">{data.length} stocks</span>
      </div>

      <div className="max-h-[480px] overflow-auto custom-scrollbar">
        <table className="w-full min-w-[760px] text-[11px]">
          <thead className="sticky top-0 bg-[#0D1118] z-10">
            <tr className="border-b border-white/5 text-[9px] uppercase tracking-widest text-slate-500 font-bold">
              <th className="text-left px-4 py-2.5 w-12">#</th>
              <th className="text-left px-4 py-2.5">Symbol</th>
              <th className="text-right px-4 py-2.5">Price</th>
              <th className="text-right px-4 py-2.5">Gain</th>
              <th className="text-right px-4 py-2.5">RSI</th>
              <th className="text-right px-4 py-2.5">Vol (L)</th>
              <th className="text-right px-4 py-2.5">Status</th>
              <th className="text-right px-4 py-2.5 w-20">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((stock, idx) => {
              const isSelected = stock.symbol === selectedSymbol;
              return (
                <tr
                  key={stock.symbol}
                  onClick={() => onSelectStock(stock.symbol)}
                  className={`border-b border-white/[0.02] transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-500/10'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <td className="px-4 py-2.5 text-slate-500 font-mono text-[10px]">{idx + 1}</td>
                  <td className="px-4 py-2.5">
                    <span className="font-bold text-white">{stock.symbol.replace('.NS', '')}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-300">₹{stock.price}</td>
                  <td className="px-4 py-2.5 text-right"><GainBadge pct={stock.priceChangePct} /></td>
                  <td className="px-4 py-2.5 text-right"><RsiBadge value={stock.rsi} /></td>
                  <td className="px-4 py-2.5 text-right text-slate-400 font-mono">{(stock.volume / 100000).toFixed(1)}</td>
                  <td className="px-4 py-2.5 text-right text-[10px] text-slate-400">{stock.rsiStatus}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); onViewChart(stock.symbol); }}
                      className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-slate-400 hover:text-indigo-300"
                      title="View chart"
                    >
                      <LineChart className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Filtered mode: card layout for top picks */
function FilteredCards({
  data,
  selectedSymbol,
  onSelectStock,
  onViewChart,
}: {
  data: StockData[] | null;
  selectedSymbol: string | null;
  onSelectStock: (symbol: string) => void;
  onViewChart: (symbol: string) => void;
}) {
  if (!data) return null;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1 pb-1">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Scan Results</p>
          <h3 className="text-lg font-semibold text-white">Top momentum picks</h3>
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{data.length} stocks</div>
      </div>

      {data.map((stock, idx) => {
        const isSelected = stock.symbol === selectedSymbol;
        const isPositive = stock.priceChangePct > 0;
        return (
          <motion.div
            key={stock.symbol}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className={`rounded-2xl border p-4 transition-all ${
              isSelected
                ? 'border-indigo-500/50 bg-gradient-to-br from-indigo-500/15 via-[#121722] to-[#0A0D14]'
                : 'border-white/10 bg-gradient-to-br from-[#121722] via-[#0D1118] to-[#0A0D14] hover:border-white/20'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.25em] text-indigo-300">
                    #{idx + 1}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.25em] ${
                    stock.isAboveSMA ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                  }`}>
                    {stock.isAboveSMA ? 'Above SMA50' : 'Below SMA50'}
                  </span>
                  <GainBadge pct={stock.priceChangePct} />
                </div>
                <div className="flex items-baseline gap-3 mb-2">
                  <h2 className="text-xl font-black text-white">{stock.symbol.replace('.NS', '')}</h2>
                  <span className="text-sm font-mono text-slate-400">₹{stock.price}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    RSI: <span className="font-semibold text-emerald-300">{stock.rsi}</span>
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    Vol: <span className="font-semibold text-slate-200">{(stock.volume / 100000).toFixed(1)}L</span>
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    {stock.rsiStatus}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => onSelectStock(stock.symbol)}
                  className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] transition ${
                    isSelected
                      ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/40'
                      : 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/40 hover:bg-indigo-500/25'
                  }`}
                >
                  {isSelected ? 'Selected' : 'Analyze'}
                </button>
                <button
                  onClick={() => onViewChart(stock.symbol)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-slate-300 transition hover:bg-white/10"
                >
                  Chart
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function ResultDisplay(props: ResultDisplayProps) {
  const { data, loading, scanMode } = props;

  if (loading) return <LoadingState />;
  if (!data || data.length === 0) return <EmptyState />;
  if (scanMode === 'full_list') return <FullListTable {...props} />;
  return <FilteredCards {...props} />;
}

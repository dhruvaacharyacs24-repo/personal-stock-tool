'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Brain, Target, Loader2 } from 'lucide-react';

interface AIAnalysis {
  strengths: string[];
  weaknesses: string[];
  longTerm: string;
  swing: string;
  intraday: string;
  confidence: string;
  summary: string;
}

interface AIAnalysisPanelProps {
  analysis: AIAnalysis | null;
  analysisLoading: boolean;
  selectedSymbol: string | null;
}

function VerdictBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();
  const isPositive = lower.includes('bullish');
  const isNegative = lower.includes('bearish');
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  let color = 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  if (isPositive) color = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (isNegative) color = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${color}`}>
      <Icon className="w-3 h-3" />
      <span className="leading-none">{value.split(' ')[0]}</span>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
      <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Brain className="w-6 h-6 text-indigo-400" />
      </div>
      <p className="text-sm text-slate-400">
        Select a stock from scan results to view AI analysis
      </p>
    </div>
  );
}

function LoadingSkeleton({ symbol }: { symbol: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
          <Brain className="w-5 h-5 text-indigo-400 animate-pulse" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-indigo-400">AI Analysis</p>
          <p className="text-sm font-semibold text-white">{symbol.replace('.NS', '')}</p>
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-white/5 rounded-full animate-shimmer w-3/4" />
        <div className="h-4 bg-white/5 rounded-full animate-shimmer w-1/2" />
        <div className="h-4 bg-white/5 rounded-full animate-shimmer w-2/3" />
      </div>
    </div>
  );
}

function AnalysisContent({ analysis, symbol }: { analysis: AIAnalysis; symbol: string }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 border-b border-white/5 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] shrink-0">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">AI Stock Analysis</p>
            <h4 className="text-sm font-semibold text-white truncate">{symbol.replace('.NS', '')}</h4>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
            <Target className="w-3 h-3 text-indigo-400" />
            <span className="text-[10px] font-bold text-white leading-none">{analysis.confidence}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-center min-h-[4.25rem] flex flex-col justify-center">
          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 mb-1 leading-none">Long Term</p>
          <VerdictBadge value={analysis.longTerm} />
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-center min-h-[4.25rem] flex flex-col justify-center">
          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 mb-1 leading-none">Swing</p>
          <VerdictBadge value={analysis.swing} />
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-center min-h-[4.25rem] flex flex-col justify-center">
          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 mb-1 leading-none">Intraday</p>
          <VerdictBadge value={analysis.intraday} />
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300">Strengths</p>
        </div>
        <ul className="space-y-2">
          {analysis.strengths.map((item: string, i: number) => (
            <li key={i} className="flex gap-2.5 text-[12px] text-slate-300 leading-relaxed items-start">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-rose-500/15 bg-rose-500/[0.04] p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-rose-300">Watchouts</p>
        </div>
        <ul className="space-y-2">
          {analysis.weaknesses.map((item: string, i: number) => (
            <li key={i} className="flex gap-2.5 text-[12px] text-slate-300 leading-relaxed items-start">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-white/5 bg-black/20 p-4">
        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-2">Summary</p>
        <p className="text-[12px] text-slate-300 leading-relaxed">{analysis.summary}</p>
      </div>
    </div>
  );
}

export default function AIAnalysisPanel({ analysis, analysisLoading, selectedSymbol }: AIAnalysisPanelProps) {
  if (!selectedSymbol) return <EmptyState />;
  if (analysisLoading) return <LoadingSkeleton symbol={selectedSymbol} />;
  if (!analysis) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-white/10 bg-black/20 p-4"
    >
      <AnalysisContent analysis={analysis} symbol={selectedSymbol} />
    </motion.div>
  );
}
